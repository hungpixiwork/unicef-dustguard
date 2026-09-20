import { Hono } from 'hono';
import { get, query, run } from './d1.js';
import { getLiveState, updateLiveState } from './iot-live-state.js';
export { getLiveState, updateLiveState } from './iot-live-state.js';

// Helper parse UTC timestamp an toàn cho Node.js tránh lệch timezone
const parseToEpochMs = (timeStr?: string | null): number => {
  if (!timeStr) return 0;
  if (timeStr.includes('T') && (timeStr.endsWith('Z') || timeStr.includes('+'))) {
    return new Date(timeStr).getTime();
  }
  if (timeStr.includes('T')) {
    return new Date(timeStr + 'Z').getTime();
  }
  return new Date(timeStr.replace(' ', 'T') + 'Z').getTime();
};

export function createIoTRouter() {
  const router = new Hono<{ Bindings: { DB: any; INTEGRATION_SERVICE_KEY?: string } }>();

  // ============================================================================
  // 1. INGESTION TELEMETRY (POST /api/iot/telemetry & POST /api/sensors/reading)
  // ============================================================================
  const handleTelemetryIngest = async (c: any) => {
    try {
      const body = await c.req.json();
      const deviceCode = body.deviceId || body.device_id || body.deviceCode || body.sensorCode || 'DG-IOT-001';
      
      const rawPm25 = body.pm25 !== undefined && body.pm25 !== null ? parseFloat(body.pm25) : (body.pm2_5 !== undefined && body.pm2_5 !== null ? parseFloat(body.pm2_5) : null);
      const rawPm10 = body.pm10 !== undefined && body.pm10 !== null ? parseFloat(body.pm10) : null;
      const rawPm1 = body.pm1 !== undefined && body.pm1 !== null ? parseFloat(body.pm1) : (body.pm1_0 !== undefined && body.pm1_0 !== null ? parseFloat(body.pm1_0) : null);
      const rawTemp = body.temperature !== undefined && body.temperature !== null ? parseFloat(body.temperature) : null;
      const rawHum = body.humidity !== undefined && body.humidity !== null ? parseFloat(body.humidity) : null;
      const wifiRssi = body.wifiRssi !== undefined && body.wifiRssi !== null ? parseInt(body.wifiRssi, 10) : (body.rssi !== undefined && body.rssi !== null ? parseInt(body.rssi, 10) : null);
      const wifiSsid = body.wifiSsid || body.ssid || null;

      // 1. Kiểm tra giới hạn vật lý nghiêm ngặt (0 - 2500 µg/m³)
      if (rawPm25 === null || isNaN(rawPm25) || rawPm25 < 0 || rawPm25 > 2500) {
        return c.json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Invalid Sensor Reading',
          status: 400,
          detail: 'Giá trị PM2.5 không hợp lệ hoặc vượt ngưỡng vật lý (0 - 2500 µg/m³).'
        }, 400);
      }

      let validPm10: number;
      if (rawPm10 !== null) {
        if (isNaN(rawPm10) || rawPm10 < 0 || rawPm10 > 2500) {
          return c.json({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: 'Invalid Sensor Reading',
            status: 400,
            detail: 'Giá trị PM10 không hợp lệ hoặc vượt ngưỡng vật lý (0 - 2500 µg/m³).'
          }, 400);
        }
        validPm10 = rawPm10;
      } else {
        validPm10 = parseFloat((rawPm25 * 1.5).toFixed(1));
      }

      let validPm1: number | null = null;
      if (rawPm1 !== null) {
        if (!isNaN(rawPm1) && rawPm1 >= 0 && rawPm1 <= 2500) {
          validPm1 = rawPm1;
        }
      }

      const validTemp = (rawTemp !== null && !isNaN(rawTemp) && rawTemp >= -40 && rawTemp <= 85) ? rawTemp : null;
      const validHum = (rawHum !== null && !isNaN(rawHum) && rawHum >= 0 && rawHum <= 100) ? rawHum : null;

      const nowIso = new Date().toISOString();
      const timestamp = body.timestamp || nowIso;

      // 2. Tìm hoặc tự động liên kết thiết bị
      let device = await get(c.env.DB, 'SELECT * FROM iot_devices WHERE device_code = ? OR id = ?', [deviceCode, deviceCode]);
      if (!device) {
        const newDevId = `dev-${crypto.randomUUID().substring(0, 8)}`;
        await run(c.env.DB, `
          INSERT INTO iot_devices (
            id, device_code, name, location_text, latitude, longitude, status,
            sensor_model, wifi_ssid, wifi_rssi, firmware_version, created_at, updated_at, last_reading_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'ONLINE', 'ASAIR APM2000', ?, ?, '1.2.0-esp32', ?, ?, ?)
        `, [
          newDevId,
          deviceCode,
          `DustGuard Node (${deviceCode})`,
          'Đường Lê Văn Việt, Phường Tăng Nhơn Phú, TP. Thủ Đức, TP.HCM',
          10.8450,
          106.7790,
          wifiSsid || 'Harry Maguire',
          wifiRssi || -54,
          nowIso,
          nowIso,
          nowIso
        ]);
        device = await get(c.env.DB, 'SELECT * FROM iot_devices WHERE id = ?', [newDevId]);
      } else {
        // Cập nhật trạng thái online và thời gian nhận dữ liệu cuối
        await run(c.env.DB, `
          UPDATE iot_devices
          SET status = 'ONLINE',
              last_reading_at = ?,
              wifi_rssi = COALESCE(?, wifi_rssi),
              wifi_ssid = COALESCE(?, wifi_ssid),
              updated_at = ?
          WHERE id = ?
        `, [nowIso, wifiRssi, wifiSsid, nowIso, device.id]);
      }

      // 3. Ghi số đo vào CSDL SSOT
      const readingId = `read-${crypto.randomUUID().substring(0, 12)}`;
      await run(c.env.DB, `
        INSERT INTO iot_readings (
          id, device_id, timestamp, pm25, pm10, pm1, temperature, humidity, wifi_rssi, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        readingId,
        device.id,
        timestamp,
        rawPm25,
        validPm10,
        validPm1,
        validTemp,
        validHum,
        wifiRssi,
        nowIso
      ]);

      // Đồng bộ vào In-Memory Live State Store (Zero-D1 Reads cho polling)
      const nowEpoch = Date.now();
      updateLiveState({
        deviceId: device.device_code,
        pm1: validPm1 ?? Math.round(rawPm25 * 0.7),
        pm25: rawPm25,
        pm10: validPm10,
        temperature: validTemp ?? 28.5,
        humidity: validHum ?? 65.0,
        rssi: wifiRssi ?? -50,
        lastSeen: nowEpoch,
        online: true
      });
      if (device.id && device.id !== device.device_code) {
        updateLiveState({
          deviceId: device.id,
          pm1: validPm1 ?? Math.round(rawPm25 * 0.7),
          pm25: rawPm25,
          pm10: validPm10,
          temperature: validTemp ?? 28.5,
          humidity: validHum ?? 65.0,
          rssi: wifiRssi ?? -50,
          lastSeen: nowEpoch,
          online: true
        });
      }

      return c.json({
        success: true,
        message: 'Telemetry received successfully',
        data: {
          readingId,
          deviceId: device.device_code,
          pm25: rawPm25,
          pm10: validPm10,
          pm1: validPm1,
          temperature: validTemp,
          humidity: validHum,
          wifiRssi,
          wifiSsid: wifiSsid || device.wifi_ssid,
          status: 'ONLINE',
          receivedAt: nowIso
        }
      }, 201);
    } catch (err: any) {
      console.error('[IoT Ingest Error]:', err);
      return c.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Ingestion Failed',
        status: 500,
        detail: err.message || 'Lỗi tiếp nhận telemetry từ thiết bị.'
      }, 500);
    }
  };

  router.post('/telemetry', handleTelemetryIngest);
  router.post('/reading', handleTelemetryIngest);
  router.post('/ingest', handleTelemetryIngest);

  // ============================================================================
  // 2. LIVE DEVICE STATE — ZERO-D1 READS! 0 D1 WRITES!
  // Đọc trực tiếp từ in-memory store getLiveState() trong server/iot-live-state.ts
  // TUYỆT ĐỐI KHÔNG thực hiện SELECT ... FROM iot_readings!
  // KHÔNG gọi UPDATE ... last_seen từ GET. KHÔNG ghi audit log vào D1.
  // Header: Cache-Control: public, max-age=5, stale-while-revalidate=10
  // ============================================================================
  const handleLiveDeviceState = (c: any) => {
    const deviceId = c.req.param('deviceId') || c.req.query('deviceId') || c.req.query('id') || 'DG-IOT-001';
    const state = getLiveState(deviceId);

    // Header bắt buộc theo SLA & Cache tối ưu hóa
    c.header('Cache-Control', 'public, max-age=5, stale-while-revalidate=10');

    return c.json({
      success: true,
      data: {
        deviceId: state.deviceId,
        online: state.online,
        pm1: state.pm1,
        pm25: state.pm25,
        pm10: state.pm10,
        temperature: state.temperature,
        humidity: state.humidity,
        rssi: state.rssi,
        lastSeen: state.lastSeen,
        sensorStatus: state.sensorStatus,
        anomalyState: state.anomalyState,
        // Hỗ trợ tương thích ngược (backward compatibility) cho frontend nếu đang đọc device/telemetry
        device: {
          id: state.deviceId,
          deviceCode: state.deviceId,
          name: `DustGuard Node (${state.deviceId})`,
          locationText: 'Đường Lê Văn Việt, Phường Tăng Nhơn Phú, TP. Thủ Đức, TP.HCM',
          sensorModel: 'ASAIR APM2000',
          wifiSsid: 'Harry Maguire',
          wifiRssi: state.rssi,
          firmwareVersion: '1.2.0-esp32',
          status: state.online ? 'ONLINE' : 'OFFLINE',
          isOnline: state.online,
          lastSeenAt: new Date(state.lastSeen).toISOString(),
          secondsAgo: Math.max(0, Math.floor((Date.now() - state.lastSeen) / 1000))
        },
        telemetry: {
          id: `live-${state.deviceId}-${state.lastSeen}`,
          pm25: state.pm25,
          pm10: state.pm10,
          pm1: state.pm1,
          temperature: state.temperature,
          humidity: state.humidity,
          wifiRssi: state.rssi,
          timestamp: new Date(state.lastSeen).toISOString(),
          receivedAt: new Date(state.lastSeen).toISOString()
        },
        source: 'Dữ liệu trực tiếp (Zero-D1 Live State)'
      }
    });
  };

  // 1. GET /api/iot/live/:deviceId & GET /api/iot/live
  router.get('/live/:deviceId', handleLiveDeviceState);
  router.get('/live', handleLiveDeviceState);

  // 2. GET /api/iot/latest & aliases (telemetry, reading)
  router.get('/latest', handleLiveDeviceState);
  router.get('/telemetry', handleLiveDeviceState);
  router.get('/reading', handleLiveDeviceState);

  // 3. GET /api/iot/device-status & /api/iot/device-status/:deviceId
  router.get('/device-status/:deviceId', handleLiveDeviceState);
  router.get('/device-status', handleLiveDeviceState);

  // ============================================================================
  // 3. ON-DEMAND HISTORICAL TELEMETRY (GET /api/iot/history/:deviceId & /api/iot/history)
  // Tách biệt hoàn toàn khỏi luồng polling định kỳ. Chỉ được gọi khi:
  // - Người dùng bấm "Xem lịch sử" hoặc chọn khoảng thời gian (1h, 24h, 7d).
  // - Bắt buộc phải có LIMIT (mặc định 50, tối đa 200).
  // - Truy vấn có điều kiện: SELECT * FROM iot_readings WHERE device_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?
  // - 100% bảo vệ bởi index idx_iot_readings_device_created (0 full table scan).
  // ============================================================================
  const handleGetHistory = async (c: any) => {
    try {
      const deviceIdOrCode = c.req.param('deviceId') || c.req.query('deviceId') || 'DG-IOT-001';

      // 1. Resolve thiết bị (hỗ trợ cả id và device_code)
      const device = await get(c.env.DB, `
        SELECT id, device_code, name, location_text FROM iot_devices WHERE id = ? OR device_code = ? LIMIT 1
      `, [deviceIdOrCode, deviceIdOrCode]);

      const targetDeviceId = device ? device.id : deviceIdOrCode;

      // 2. Tính toán khoảng thời gian (1h, 24h, 7d)
      const range = (c.req.query('range') || c.req.query('timeRange') || '24h').toLowerCase();
      let durationMs = 24 * 60 * 60 * 1000; // Mặc định 24h
      if (range === '1h') {
        durationMs = 60 * 60 * 1000;
      } else if (range === '24h') {
        durationMs = 24 * 60 * 60 * 1000;
      } else if (range === '7d' || range === '7days') {
        durationMs = 7 * 24 * 60 * 60 * 1000;
      }

      const customFrom = c.req.query('from') || c.req.query('since');
      let sinceIso: string;
      if (customFrom && !isNaN(Date.parse(customFrom))) {
        sinceIso = new Date(customFrom).toISOString();
      } else {
        sinceIso = new Date(Date.now() - durationMs).toISOString();
      }

      // 3. Giới hạn bản ghi nghiêm ngặt: Mặc định 50, tối đa 200
      const rawLimit = parseInt(c.req.query('limit') || '50', 10);
      const limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));

      // 4. Truy vấn có điều kiện rõ ràng, bảo vệ bởi index (device_id, created_at DESC)
      const readings = await query(c.env.DB, `
        SELECT * FROM iot_readings
        WHERE device_id = ? AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [targetDeviceId, sinceIso, limit]);

      // Định dạng kết quả an toàn cho biểu đồ và bảng audit
      const formatted = readings.map((r: any) => ({
        id: r.id,
        timestamp: r.timestamp,
        pm25: r.pm25,
        pm10: r.pm10,
        pm1: r.pm1,
        temperature: r.temperature,
        humidity: r.humidity,
        wifiRssi: r.wifi_rssi,
        createdAt: r.created_at
      }));

      // Sắp xếp tăng dần thời gian cho Time-Series Chart
      const chronological = [...formatted].reverse();

      c.header('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');

      return c.json({
        success: true,
        data: {
          deviceId: device ? device.device_code : deviceIdOrCode,
          resolvedDeviceId: targetDeviceId,
          range,
          since: sinceIso,
          limit,
          count: formatted.length,
          readings: formatted,
          history: chronological
        },
        readings: formatted,
        history: chronological
      });
    } catch (err: any) {
      console.error('[IoT History Error]:', err);
      return c.json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'History Query Failed',
        status: 500,
        detail: err.message || 'Lỗi truy vấn lịch sử đo đạc.'
      }, 500);
    }
  };

  router.get('/history/:deviceId', handleGetHistory);
  router.get('/history', handleGetHistory);

  // ============================================================================
  // 4. GET DEVICE DETAIL (GET /api/iot/device/:id & /api/iot/devices/:id)
  // Đã tách biệt hoàn toàn lịch sử ra khỏi endpoint này!
  // Chỉ lấy 1 bản ghi mới nhất hoặc đọc từ LiveState (0-1 IOPS thay vì 50 rows)
  // ============================================================================
  const handleDeviceDetail = async (c: any) => {
    try {
      const idOrCode = c.req.param('id');
      const device = await get(c.env.DB, `
        SELECT * FROM iot_devices WHERE id = ? OR device_code = ?
      `, [idOrCode, idOrCode]);

      if (!device) {
        return c.json({
          success: false,
          error: { code: 'DEVICE_NOT_FOUND', message: 'Không tìm thấy thiết bị quan trắc.' }
        }, 404);
      }

      // Ưu tiên đọc từ In-Memory LiveState (0 IOPS)
      let latestReading: any = null;
      const live = getLiveState(device.device_code || device.id);
      if (live) {
        latestReading = {
          id: `live-${live.deviceId}-${live.lastSeen}`,
          device_id: device.id,
          timestamp: new Date(live.lastSeen).toISOString(),
          pm25: live.pm25,
          pm10: live.pm10,
          pm1: live.pm1,
          temperature: live.temperature,
          humidity: live.humidity,
          wifi_rssi: live.rssi,
          created_at: new Date(live.lastSeen).toISOString()
        };
      } else {
        // Fallback đọc đúng 1 dòng mới nhất từ D1 (có index idx_iot_readings_device_created)
        latestReading = await get(c.env.DB, `
          SELECT * FROM iot_readings
          WHERE device_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `, [device.id]);
      }

      const now = Date.now();
      const lastSeenMs = device.last_reading_at ? new Date(device.last_reading_at).getTime() : (live?.lastSeen || 0);
      const diffSec = lastSeenMs > 0 ? Math.floor((now - lastSeenMs) / 1000) : 999999;
      const isOnline = diffSec <= 30;

      const deviceData = {
        ...device,
        isOnline,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        secondsAgo: diffSec < 999999 ? diffSec : null
      };

      c.header('Cache-Control', 'public, max-age=5, stale-while-revalidate=10');

      return c.json({
        success: true,
        data: {
          device: deviceData,
          latest: latestReading || null,
          history: [], // Đã tách biệt on-demand sang GET /api/iot/history/:deviceId
          sampleCount: latestReading ? 1 : 0
        },
        // Tương thích 100% với Side B (IotDeviceDetailPage.tsx)
        device: deviceData,
        latestReading: latestReading || null,
        recentReadings: [], // Tách sang endpoint /history
        recentEvents: [],
        relatedCases: []
      });
    } catch (err: any) {
      return c.json({ success: false, error: { message: err.message } }, 500);
    }
  };

  router.get('/device/:id', handleDeviceDetail);
  router.get('/devices/:id', handleDeviceDetail);

  // Backward compatibility: readings với limit nghiêm ngặt và index an toàn
  router.get('/devices/:id/readings', async (c) => {
    try {
      const id = c.req.param('id');
      const rawLimit = parseInt(c.req.query('limit') || '50', 10);
      const limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));

      const dev = await get(c.env.DB, 'SELECT id FROM iot_devices WHERE id = ? OR device_code = ? LIMIT 1', [id, id]);
      const targetId = dev ? dev.id : id;

      const readings = await query(c.env.DB, `
        SELECT * FROM iot_readings 
        WHERE device_id = ?
        ORDER BY created_at DESC LIMIT ?
      `, [targetId, limit]);
      return c.json({ success: true, readings });
    } catch (err: any) {
      return c.json({ success: false, error: { message: err.message } }, 500);
    }
  });

  router.get('/alerts', async (c) => {
    try {
      const alerts = await query(c.env.DB, 'SELECT * FROM iot_events WHERE event_type LIKE "%ALERT%" OR severity IN ("CRITICAL", "HIGH") ORDER BY created_at DESC LIMIT 50');
      return c.json({ success: true, alerts: alerts || [] });
    } catch {
      return c.json({ success: true, alerts: [] });
    }
  });

  // ============================================================================
  // 4. GET ALL DEVICES (GET /api/iot/devices)
  // ============================================================================
  router.get('/devices', async (c) => {
    try {
      const devices = await query(c.env.DB, 'SELECT * FROM iot_devices ORDER BY created_at ASC');
      const now = Date.now();

      const result = devices.map(d => {
        const lastSeenMs = d.last_reading_at ? new Date(d.last_reading_at).getTime() : 0;
        const diffSec = lastSeenMs > 0 ? Math.floor((now - lastSeenMs) / 1000) : 999999;
        const isOnline = diffSec <= 30;
        return {
          ...d,
          isOnline,
          status: isOnline ? 'ONLINE' : 'OFFLINE',
          secondsAgo: diffSec < 999999 ? diffSec : null
        };
      });

      return c.json({ success: true, data: result, devices: result });
    } catch (err: any) {
      return c.json({ success: false, error: { message: err.message } }, 500);
    }
  });

  // ============================================================================
  // 5. UPDATE DEVICE (PATCH /api/iot/device/:id)
  // Đổi tên thiết bị, vị trí
  // ============================================================================
  router.patch('/device/:id', async (c) => {
    try {
      const idOrCode = c.req.param('id');
      const body = await c.req.json();
      const nowIso = new Date().toISOString();

      const device = await get(c.env.DB, 'SELECT * FROM iot_devices WHERE id = ? OR device_code = ?', [idOrCode, idOrCode]);
      if (!device) {
        return c.json({ success: false, error: { message: 'Không tìm thấy thiết bị.' } }, 404);
      }

      const newName = body.name || device.name;
      const newLoc = body.locationText || body.location_text || device.location_text;

      await run(c.env.DB, `
        UPDATE iot_devices
        SET name = ?, location_text = ?, updated_at = ?
        WHERE id = ?
      `, [newName, newLoc, nowIso, device.id]);

      return c.json({
        success: true,
        message: 'Cập nhật thiết bị thành công',
        data: { id: device.id, deviceCode: device.device_code, name: newName, locationText: newLoc }
      });
    } catch (err: any) {
      return c.json({ success: false, error: { message: err.message } }, 500);
    }
  });

  // ============================================================================
  // 6. UPDATE WI-FI CONFIG (POST /api/iot/wifi)
  // Password tuyệt đối không trả lại qua API
  // ============================================================================
  router.post('/wifi', async (c) => {
    try {
      const body = await c.req.json();
      const { ssid, deviceId } = body;
      if (!ssid) {
        return c.json({ success: false, error: { message: 'Thiếu tên Wi-Fi (SSID).' } }, 400);
      }

      const targetDevCode = deviceId || 'DG-IOT-001';
      const nowIso = new Date().toISOString();

      await run(c.env.DB, `
        UPDATE iot_devices
        SET wifi_ssid = ?, updated_at = ?
        WHERE device_code = ? OR id = ?
      `, [ssid, nowIso, targetDevCode, targetDevCode]);

      return c.json({
        success: true,
        message: `Đã lưu cấu hình Wi-Fi [${ssid}] cho thiết bị ${targetDevCode}.`,
        data: {
          deviceId: targetDevCode,
          wifiSsid: ssid,
          configuredAt: nowIso
        }
      });
    } catch (err: any) {
      return c.json({ success: false, error: { message: err.message } }, 500);
    }
  });

  return router;
}
