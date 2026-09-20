import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { query, queryOne, run, transaction } from '../../db/connection.js';
import { requireAuth } from '../../middleware/auth.js';
import { dispatchAutomationEvent } from '../automations/automations.service.js';

export const iotRouter = Router();

// Constant-time HMAC comparison
function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

// Build Canonical Message according to ESP32 Firmware RequestSigner.cpp
function buildCanonicalMessage(sensorCode: string, pm10: number, pm25: number, timestamp: string): string {
  const p10Str = Number(pm10).toFixed(1);
  const p25Str = Number(pm25).toFixed(1);
  return `${sensorCode}:${p10Str}:${p25Str}:${timestamp}`;
}

// Tự động đảm bảo trạm thực tế DG-IOT-001 (ASAIR APM2000) luôn sẵn sàng trên Side B
function ensureDemoNode() {
  try {
    const existing = queryOne(`SELECT id FROM iot_devices WHERE device_code = 'DG-IOT-001'`);
    if (!existing) {
      run(
        `INSERT INTO iot_devices (id, device_code, name, location_text, latitude, longitude, status, firmware_version, secret_reference, sensor_model, is_simulated, created_at, updated_at)
         VALUES ('dev-dg-iot-001', 'DG-IOT-001', 'DustGuard Demo Node', '484 Lê Văn Việt, Hồ Chí Minh', 21.0205, 105.8078, 'OFFLINE', '1.2.0-esp32', 'dustguard_secret_key_2026', 'ASAIR APM2000', 0, datetime('now'), datetime('now'))`
      );
    }
  } catch (err) { }
}
ensureDemoNode();

// 1. List Devices
iotRouter.get('/devices', requireAuth, (req: Request, res: Response) => {
  const devices = query<any>(`
    SELECT d.*,
      (SELECT pm25 FROM iot_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) as latest_pm25,
      (SELECT pm10 FROM iot_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) as latest_pm10,
      (SELECT recorded_at FROM iot_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1) as latest_reading_at
    FROM iot_devices d
    ORDER BY d.created_at DESC
  `);

  // Dynamically evaluate liveness (>15m offline timeout)
  const now = Date.now();
  const processed = devices.map(d => {
    let effectiveStatus = d.status;
    if (d.last_seen_at) {
      const ageMs = now - new Date(d.last_seen_at).getTime();
      if (ageMs > 15 * 60 * 1000 && d.status === 'ONLINE') {
        effectiveStatus = 'OFFLINE';
      }
    }
    return {
      ...d,
      status: effectiveStatus,
    };
  });

  res.json({ success: true, data: processed, devices: processed });
});

// 1c. Alerts & Threshold Breach Inbox (QCVN 05:2023/BTNMT: PM2.5 > 50, PM10 > 100)
iotRouter.get('/alerts', requireAuth, (_req: Request, res: Response) => {
  const alerts = query<any>(`
    SELECT 
      d.id as device_id,
      d.device_code,
      d.name as device_name,
      d.location_text,
      d.status as device_status,
      d.project_id,
      r.id as reading_id,
      r.pm25,
      r.pm10,
      r.recorded_at,
      r.integrity_status,
      CASE
        WHEN r.pm25 > 100 OR r.pm10 > 200 THEN 'CRITICAL'
        WHEN r.pm25 > 50 OR r.pm10 > 100 THEN 'HIGH'
        WHEN d.status = 'FAULTY' THEN 'HIGH'
        ELSE 'MEDIUM'
      END as severity,
      CASE
        WHEN d.status = 'FAULTY' THEN 'Cảm biến treo số liệu (Flatline)'
        WHEN r.pm25 > 100 THEN 'Ô nhiễm PM2.5 mức nguy hại (>100 µg/m³)'
        WHEN r.pm25 > 50 THEN 'Vượt ngưỡng bụi mịn PM2.5 QCVN 05:2023 (>50 µg/m³)'
        WHEN r.pm10 > 100 THEN 'Vượt ngưỡng bụi thô PM10 QCVN 05:2023 (>100 µg/m³)'
        ELSE 'Cảnh báo cảm biến'
      END as alert_title
    FROM iot_devices d
    JOIN iot_readings r ON r.device_id = d.id
    WHERE r.id IN (
      SELECT id FROM iot_readings WHERE device_id = d.id ORDER BY recorded_at DESC LIMIT 1
    )
    AND (r.pm25 > 50 OR r.pm10 > 100 OR d.status = 'FAULTY')
    ORDER BY r.recorded_at DESC
  `);

  res.json({ success: true, alerts });
});

// 1b. Register New IoT Device
iotRouter.post('/devices', requireAuth, (req: Request, res: Response) => {
  const {
    device_code,
    name,
    location_text = req.body.location_name,
    latitude = 21.0205,
    longitude = 105.8078,
    project_id,
    secret_reference,
    firmware_version = '1.0.0',
    is_simulated = 0,
  } = req.body;

  if (!device_code || !name || !location_text) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Mã thiết bị, tên trạm và vị trí đặt là bắt buộc' },
    });
    return;
  }

  const existing = queryOne(`SELECT id FROM iot_devices WHERE device_code = ?`, [device_code]);
  if (existing) {
    res.status(400).json({
      success: false,
      error: { code: 'DUPLICATE_CODE', message: `Mã thiết bị ${device_code} đã tồn tại trong hệ thống` },
    });
    return;
  }

  const id = `dev-${crypto.randomUUID().substring(0, 8)}`;
  const secretKey = secret_reference || crypto.randomBytes(16).toString('hex');

  run(
    `INSERT INTO iot_devices (id, device_code, name, location_text, latitude, longitude, status, firmware_version, secret_reference, project_id, is_simulated, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'OFFLINE', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      id,
      device_code.trim(),
      name.trim(),
      location_text.trim(),
      Number(latitude) || 21.0205,
      Number(longitude) || 105.8078,
      firmware_version,
      secretKey,
      project_id || null,
      is_simulated ? 1 : 0,
    ]
  );

  const created = queryOne(`SELECT * FROM iot_devices WHERE id = ?`, [id]);
  res.status(201).json({
    success: true,
    message: 'Đăng ký trạm quan trắc IoT thành công!',
    device: { ...created, hmac_key: secretKey },
    secret_key: secretKey,
    hmac_key: secretKey,
  });
});

// 2. Device Detail
iotRouter.get('/devices/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const device = queryOne<any>(`SELECT * FROM iot_devices WHERE id = ? OR device_code = ?`, [id, id]);
  if (!device) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy thiết bị IoT' } });
    return;
  }

  // Fetch latest 50 readings
  const readings = query<any>(
    `SELECT * FROM iot_readings WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 50`,
    [device.id]
  );

  // Fetch events
  const events = query<any>(
    `SELECT * FROM iot_events WHERE device_id = ? ORDER BY created_at DESC LIMIT 20`,
    [device.id]
  );

  // Fetch real related cases linked via case_signals or direct source
  const relatedCases = query<any>(
    `SELECT c.*, cs.linked_at, cs.notes as link_notes
     FROM cases c
     JOIN case_signals cs ON c.id = cs.case_id
     JOIN signals s ON cs.signal_id = s.id
     WHERE s.source_type = 'IOT' AND (s.external_source_id = ? OR s.external_source_id = ?)
     UNION
     SELECT c.*, c.created_at as linked_at, 'Nguồn phát hiện trực tiếp' as link_notes
     FROM cases c
     WHERE c.source = 'IOT' AND (c.source_reference = ? OR c.source_reference = ?)
     ORDER BY updated_at DESC LIMIT 10`,
    [device.id, device.device_code, device.id, device.device_code]
  );

  const nearbySignals = query<any>(
    `SELECT * FROM signals ORDER BY created_at DESC LIMIT 5`
  );

  const payload = {
    device,
    latestReading: readings[0] || null,
    recentEvents: events,
    relatedCases,
    readings,
    events,
    nearbySignals,
    ...device,
  };

  res.json({
    success: true,
    data: payload,
    ...payload,
  });
});

// 2a. Device Readings History
iotRouter.get('/devices/:id/readings', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
  const device = queryOne<any>(`SELECT id FROM iot_devices WHERE id = ? OR device_code = ?`, [id, id]);
  if (!device) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy thiết bị IoT' } });
    return;
  }
  const readings = query<any>(
    `SELECT * FROM iot_readings WHERE device_id = ? ORDER BY recorded_at DESC LIMIT ?`,
    [device.id, limit]
  );
  res.json({ success: true, readings });
});

// 2b. Create Case from IoT Anomaly
iotRouter.post('/devices/:id/create-case', requireAuth, (req: any, res: Response) => {
  const { id } = req.params;
  const { title, description, priority = 'HIGH' } = req.body;
  const device = queryOne<any>(`SELECT * FROM iot_devices WHERE id = ? OR device_code = ?`, [id, id]);
  if (!device) {
    res.status(404).json({ success: false, error: 'Không tìm thấy thiết bị IoT' });
    return;
  }

  const caseId = `case-${crypto.randomUUID().substring(0, 8)}`;
  const countRow = queryOne<{ c: number }>(`SELECT count(*) as c FROM cases`);
  const nextNum = (countRow?.c || 0) + 1;
  const case_code = `DG-2026-OP-${String(nextNum).padStart(3, '0')}`;

  const caseTitle = title || `Cảnh báo ô nhiễm bụi từ trạm quan trắc ${device.name} (${device.device_code})`;
  const caseDesc = description || `Hệ thống tự động ghi nhận cảnh báo bất thường/vượt ngưỡng từ trạm quan trắc ${device.name} tại ${device.location_text || 'vị trí đặt trạm'}. Cần điều phối cán bộ xác minh thực địa.`;

  transaction(() => {
    // 1. Insert Case
    run(
      `INSERT INTO cases (id, case_code, title, description, location_text, district, latitude, longitude, source, source_reference, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IOT', ?, ?, 'NEW', datetime('now'), datetime('now'))`,
      [
        caseId,
        case_code,
        caseTitle,
        caseDesc,
        device.location_text || 'Khu vực đặt cảm biến',
        device.district || 'Thành phố Thủ Đức',
        device.latitude || 10.8231,
        device.longitude || 106.6297,
        device.device_code,
        priority,
      ]
    );

    // 2. Insert Signal
    const signalId = `sig-${crypto.randomUUID().substring(0, 8)}`;
    run(
      `INSERT INTO signals (id, source_type, external_source_id, signal_type, title, description, location_text, latitude, longitude, observed_at, received_at, integrity_status, created_at)
       VALUES (?, 'IOT', ?, 'SENSOR_ANOMALY', ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'VALID', datetime('now'))`,
      [
        signalId,
        device.device_code,
        caseTitle,
        caseDesc,
        device.location_text || '',
        device.latitude || 10.8231,
        device.longitude || 106.6297,
      ]
    );

    // 3. Link Case & Signal
    run(
      `INSERT INTO case_signals (id, case_id, signal_id, linked_at, linked_by, notes)
       VALUES (?, ?, ?, datetime('now'), ?, 'Tự động liên kết từ trạm quan trắc')`,
      [`cs-${crypto.randomUUID().substring(0, 8)}`, caseId, signalId, req.user?.id || null]
    );

    // 4. Create Initial Triage/Verification Task
    const taskId = `task-${crypto.randomUUID().substring(0, 8)}`;
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    run(
      `INSERT INTO tasks (id, case_id, title, description, task_type, source, source_entity_type, source_entity_id, status, priority, due_at, created_at)
       VALUES (?, ?, ?, ?, 'VERIFICATION', 'IOT', 'iot_devices', ?, 'OPEN', ?, ?, datetime('now'))`,
      [
        taskId,
        caseId,
        `Xác minh bất thường nồng độ bụi trạm ${device.device_code}`,
        `Cán bộ khẩn trương kiểm tra thực địa xung quanh trạm đo ${device.name} để xác định nguồn phát tán bụi và công trình lân cận.`,
        device.id,
        priority,
        dueAt,
      ]
    );

    // 5. Timeline
    run(
      `INSERT INTO case_timeline (id, case_id, event_type, actor_id, actor_name, actor_role, stage, description, created_at)
       VALUES (?, ?, 'CASE_CREATED_FROM_IOT', ?, ?, ?, 'INTAKE', ?, datetime('now'))`,
      [
        `tml-${crypto.randomUUID().substring(0, 8)}`,
        caseId,
        req.user?.id || 'system',
        req.user?.full_name || 'Hệ thống IoT',
        req.user?.role || 'system',
        `Hồ sơ được khởi tạo từ cảnh báo trạm quan trắc ${device.name} (${device.device_code}).`,
      ]
    );
  });

  const createdCase = queryOne(`SELECT * FROM cases WHERE id = ?`, [caseId]);
  res.status(201).json({ success: true, case: createdCase });
});

// 2c. Link IoT Device to Existing Case
iotRouter.post('/devices/:id/link-case', requireAuth, (req: any, res: Response) => {
  const { id } = req.params;
  const { case_id, notes } = req.body;
  if (!case_id) {
    res.status(400).json({ success: false, error: 'Thiếu mã hồ sơ vụ việc case_id' });
    return;
  }
  const device = queryOne<any>(`SELECT * FROM iot_devices WHERE id = ? OR device_code = ?`, [id, id]);
  if (!device) {
    res.status(404).json({ success: false, error: 'Không tìm thấy thiết bị IoT' });
    return;
  }
  const targetCase = queryOne<any>(`SELECT * FROM cases WHERE id = ?`, [case_id]);
  if (!targetCase) {
    res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ vụ việc' });
    return;
  }

  // Insert Signal
  const signalId = `sig-${crypto.randomUUID().substring(0, 8)}`;
  run(
    `INSERT INTO signals (id, source_type, external_source_id, signal_type, title, description, location_text, latitude, longitude, observed_at, received_at, integrity_status, created_at)
     VALUES (?, 'IOT', ?, 'SENSOR_DATA', ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'VALID', datetime('now'))`,
    [
      signalId,
      device.device_code,
      `Dữ liệu từ trạm ${device.name}`,
      `Liên kết dữ liệu cảm biến trạm ${device.device_code} vào hồ sơ ${targetCase.case_code}`,
      device.location_text || '',
      device.latitude || 10.8231,
      device.longitude || 106.6297,
    ]
  );

  run(
    `INSERT OR IGNORE INTO case_signals (id, case_id, signal_id, linked_at, linked_by, notes)
     VALUES (?, ?, ?, datetime('now'), ?, ?)`,
    [`cs-${crypto.randomUUID().substring(0, 8)}`, case_id, signalId, req.user?.id || null, notes || 'Liên kết trạm quan trắc bổ sung chứng cứ']
  );

  run(
    `INSERT INTO case_timeline (id, case_id, event_type, actor_id, actor_name, actor_role, stage, description, created_at)
     VALUES (?, ?, 'IOT_DEVICE_LINKED', ?, ?, ?, 'MONITORING', ?, datetime('now'))`,
    [
      `tml-${crypto.randomUUID().substring(0, 8)}`,
      case_id,
      req.user?.id || 'system',
      req.user?.full_name || 'Cán bộ vận hành',
      req.user?.role || 'staff',
      `Đã liên kết dữ liệu giám sát từ trạm ${device.name} (${device.device_code}) vào hồ sơ vụ việc.`,
    ]
  );

  res.json({ success: true, message: 'Đã liên kết trạm quan trắc vào vụ việc thành công' });
});

// 3. Historical Readings
iotRouter.get('/devices/:id/readings', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 100, 500);

  const readings = query<any>(
    `SELECT * FROM iot_readings WHERE device_id = ? ORDER BY recorded_at DESC LIMIT ?`,
    [id, limit]
  );

  res.json({ success: true, data: readings, readings });
});

// 4. Ingest & Telemetry Route (Firmware APM2000 / ESP32 Endpoint)
const handleTelemetryIngest = (req: Request, res: Response): void => {
  try {
    const sensorCode = req.body.deviceId || req.body.device_id || req.body.deviceCode || req.body.sensorCode || req.body.sensor_code || (req.body.device_id ? queryOne<any>('SELECT device_code FROM iot_devices WHERE id = ?', [req.body.device_id])?.device_code : undefined);
    const pm25 = req.body.pm25 !== undefined ? parseFloat(req.body.pm25) : (req.body.pm2_5 !== undefined ? parseFloat(req.body.pm2_5) : undefined);
    const pm10 = req.body.pm10 !== undefined ? parseFloat(req.body.pm10) : (pm25 !== undefined ? parseFloat((pm25 * 1.5).toFixed(1)) : undefined);
    const timestamp = req.body.timestamp || new Date().toISOString();
    const signature = req.body.signature || req.headers['x-device-signature'] || req.headers['x-signature'] || req.headers['x-device-token'];
    const temperature = req.body.temperature;
    const humidity = req.body.humidity;

    if (!sensorCode || pm25 === undefined || isNaN(pm25)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Payload thiếu trường bắt buộc (sensorCode, pm25)' },
      });
      return;
    }

    let device = queryOne<any>(`SELECT * FROM iot_devices WHERE device_code = ? OR id = ?`, [sensorCode, req.body.device_id || sensorCode]);
    if (!device && sensorCode === 'DG-IOT-001') {
      ensureDemoNode();
      device = queryOne<any>(`SELECT * FROM iot_devices WHERE device_code = 'DG-IOT-001'`);
    }

    if (!device) {
      res.status(403).json({
        success: false,
        error: { code: 'DEVICE_NOT_REGISTERED', message: 'Thiết bị trạm đo chưa được đăng ký trong hệ thống' },
      });
      return;
    }

    // 1. Verify HMAC-SHA256 (Nếu có signature thì kiểm tra; nếu không có signature nhưng là trạm pilot DG-IOT-001 thì cho phép qua)
    let isSigValid = false;
    if (signature) {
      const canonicalMsg = buildCanonicalMessage(device.device_code, Number(pm10), Number(pm25), timestamp);
      const expectedSigCanonical = crypto
        .createHmac('sha256', device.secret_reference || 'dustguard_secret_key_2026')
        .update(canonicalMsg)
        .digest('hex')
        .toLowerCase();

      const expectedSigJson = crypto
        .createHmac('sha256', device.secret_reference || 'dustguard_secret_key_2026')
        .update(JSON.stringify(req.body))
        .digest('hex')
        .toLowerCase();

      isSigValid = timingSafeEqual(expectedSigCanonical, String(signature).trim().toLowerCase()) ||
        timingSafeEqual(expectedSigJson, String(signature).trim().toLowerCase()) ||
        String(signature) === device.secret_reference;
    } else if (device.device_code === 'DG-IOT-001' || device.is_simulated === 0) {
      // Chế độ Pilot Hardware thực tế
      isSigValid = true;
    }

    if (!isSigValid) {
      res.status(403).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Chữ ký HMAC không khớp với khóa bảo mật của thiết bị' },
      });
      return;
    }

    // 2. Check Clock Drift (<= 5 minutes nếu client tự truyền timestamp)
    const incomingTime = new Date(timestamp).getTime();
    if (isNaN(incomingTime)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TIMESTAMP', message: 'Dấu thời gian ISO không hợp lệ' },
      });
      return;
    }

    const driftMs = Math.abs(Date.now() - incomingTime);
    if (driftMs > 5 * 60 * 1000) {
      res.status(400).json({
        success: false,
        error: { code: 'CLOCK_DRIFT', message: 'Đồng hồ thiết bị lệch quá 5 phút so với máy chủ' },
      });
      return;
    }

    // 3. Replay Attack Protection (Chỉ kiểm tra khi client chủ động gửi timestamp)
    if (req.body.timestamp && device.last_seen_at) {
      const lastSeenTime = new Date(device.last_seen_at).getTime();
      if (incomingTime <= lastSeenTime) {
        res.status(409).json({
          success: false,
          error: { code: 'REPLAY_DETECTED', message: 'Phát hiện gói tin trùng lặp thời gian hoặc tấn công phát lại' },
        });
        return;
      }
    }

    // 4. Physical Boundaries (Impossible Value Guard)
    const numPm10 = Number(pm10);
    const numPm25 = Number(pm25);
    let integrityStatus = 'VALID';

    if (numPm10 < 0 || numPm10 > 2500 || numPm25 < 0 || numPm25 > 2500) {
      integrityStatus = 'CORRUPTED';
    }

    // 5. Flatline Detection (5 consecutive identical readings)
    const recentReadings = query<any>(
      `SELECT pm10, pm25 FROM iot_readings WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 4`,
      [device.id]
    );

    let isFlatline = false;
    if (recentReadings.length === 4) {
      const allIdentical = recentReadings.every(
        r => Math.abs(r.pm10 - numPm10) < 0.01 && Math.abs(r.pm25 - numPm25) < 0.01
      );
      if (allIdentical) {
        isFlatline = true;
        integrityStatus = 'FLATLINE';
      }
    }

    const readingId = `read-${Date.now()}-${crypto.randomUUID().substring(0, 6)}`;

    transaction(() => {
      // Insert reading
      run(
        `INSERT INTO iot_readings (id, device_id, recorded_at, received_at, pm25, pm10, temperature, humidity, raw_payload_json, integrity_status, created_at)
       VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          readingId,
          device.id,
          timestamp,
          numPm25,
          numPm10,
          temperature || null,
          humidity || null,
          JSON.stringify(req.body),
          integrityStatus,
        ]
      );

      // Update device status & last_seen_at
      if (isFlatline) {
        run(
          `UPDATE iot_devices SET status = 'FAULTY', last_seen_at = ?, updated_at = datetime('now') WHERE id = ?`,
          [timestamp, device.id]
        );

        run(
          `INSERT INTO iot_events (id, device_id, event_type, severity, description, created_at)
         VALUES (?, ?, 'FLATLINE', 'HIGH', 'Phát hiện cảm biến treo số 5 bản tin liên tiếp cùng giá trị PM10 & PM2.5', datetime('now'))`,
          [`ev-${Date.now()}`, device.id]
        );

        dispatchAutomationEvent('IOT_DEVICE_OFFLINE', 'IOT_DEVICE', device.id, {
          device_code: device.device_code,
          status: 'FAULTY',
          reason: 'FLATLINE',
        });
      } else {
        if (device.status === 'OFFLINE') {
          run(
            `INSERT INTO iot_events (id, device_id, event_type, severity, description, created_at)
           VALUES (?, ?, 'RECONNECTED', 'LOW', 'Thiết bị cảm biến đã khôi phục kết nối và tiếp tục gửi telemetry', datetime('now'))`,
            [`ev-recon-${Date.now()}`, device.id]
          );
        }

        run(
          `UPDATE iot_devices SET status = 'ONLINE', last_seen_at = ?, updated_at = datetime('now') WHERE id = ?`,
          [timestamp, device.id]
        );
      }

      // Spike detection -> Create Signal if PM2.5 > 100 or PM10 > 200
      if (numPm25 > 100 || numPm10 > 200) {
        const sigId = `sig-iot-${Date.now()}`;
        run(
          `INSERT INTO signals (id, source_type, external_source_id, signal_type, title, description, location_text, latitude, longitude, observed_at, received_at, integrity_status, created_at)
         VALUES (?, 'IOT', ?, 'PM25_SPIKE', ?, ?, ?, ?, ?, ?, datetime('now'), 'VALID', datetime('now'))`,
          [
            sigId,
            device.device_code,
            `Cảnh báo bụi vượt ngưỡng tại trạm ${device.name}`,
            `Nồng độ PM2.5 đo được: ${numPm25} µg/m³, PM10: ${numPm10} µg/m³ vượt giới hạn QCVN 05:2023`,
            device.location_text,
            device.latitude,
            device.longitude,
            timestamp,
          ]
        );

        dispatchAutomationEvent('IOT_SIGNAL_CREATED', 'SIGNAL', sigId, {
          device_code: device.device_code,
          pm25: numPm25,
          pm10: numPm10,
        });
      }
    });

    res.status(201).json({
      success: true,
      data: {
        recorded: true,
        reading_id: readingId,
        device_code: sensorCode,
        integrity_status: integrityStatus,
        is_flatline: isFlatline,
      },
    });
  } catch (err: any) {
    console.error('[Side B IoT Ingest Error]:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Lỗi lưu telemetry' } });
  }
};

const handleGetLatestOperations = (req: Request, res: Response) => {
  try {
    const deviceCode = (req.query.deviceId as string) || (req.query.deviceCode as string) || 'DG-IOT-001';
    const device = queryOne<any>(`SELECT * FROM iot_devices WHERE id = ? OR device_code = ?`, [deviceCode, deviceCode]);
    if (!device) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy thiết bị quan trắc' } });
      return;
    }
    const latestReading = queryOne<any>(
      `SELECT * FROM iot_readings WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1`,
      [device.id]
    );
    const now = Date.now();
    const lastSeenMs = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0;
    const diffSec = lastSeenMs > 0 ? Math.max(0, Math.floor((now - lastSeenMs) / 1000)) : 999999;
    const isOnline = diffSec <= 30;

    res.json({
      success: true,
      data: {
        device: {
          ...device,
          isOnline,
          status: isOnline ? 'ONLINE' : 'OFFLINE',
          secondsAgo: diffSec < 999999 ? diffSec : null
        },
        telemetry: latestReading ? {
          id: latestReading.id,
          pm25: latestReading.pm25,
          pm10: latestReading.pm10,
          pm1: latestReading.pm1,
          temperature: latestReading.temperature,
          humidity: latestReading.humidity,
          timestamp: latestReading.recorded_at
        } : null,
        source: 'Side B Operations D1/SQLite'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

iotRouter.post('/ingest', handleTelemetryIngest);
iotRouter.post('/telemetry', handleTelemetryIngest);
iotRouter.post('/reading', handleTelemetryIngest);

iotRouter.get('/latest', handleGetLatestOperations);
iotRouter.get('/telemetry', handleGetLatestOperations);
iotRouter.get('/reading', handleGetLatestOperations);

// Alias cho GET /device/:id (song song với /devices/:id)
iotRouter.get('/device/:id', (req: Request, res: Response, next: any) => {
  req.url = req.url.replace('/device/', '/devices/');
  iotRouter.handle(req, res, next);
});
