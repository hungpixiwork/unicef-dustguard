import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { sqliteClient } from '../db/sqlite-client.js';

export const iotRouter = Router();

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

// ============================================================================
// 1. INGESTION TELEMETRY (POST /api/iot/telemetry & POST /api/sensors/reading)
// ============================================================================
const handleTelemetryIngest = (req: Request, res: Response): void => {
  try {
    const body = req.body || {};
    const deviceCode = body.deviceId || body.device_id || body.deviceCode || body.sensorCode || 'DG-IOT-001';

    const rawPm25 = body.pm25 !== undefined && body.pm25 !== null ? parseFloat(body.pm25) : (body.pm2_5 !== undefined && body.pm2_5 !== null ? parseFloat(body.pm2_5) : null);
    const rawPm10 = body.pm10 !== undefined && body.pm10 !== null ? parseFloat(body.pm10) : null;
    const rawPm1 = body.pm1 !== undefined && body.pm1 !== null ? parseFloat(body.pm1) : (body.pm1_0 !== undefined && body.pm1_0 !== null ? parseFloat(body.pm1_0) : null);
    const rawTemp = body.temperature !== undefined && body.temperature !== null ? parseFloat(body.temperature) : null;
    const rawHum = body.humidity !== undefined && body.humidity !== null ? parseFloat(body.humidity) : null;
    const wifiRssi = body.wifiRssi !== undefined && body.wifiRssi !== null ? parseInt(body.wifiRssi, 10) : (body.rssi !== undefined && body.rssi !== null ? parseInt(body.rssi, 10) : null);
    const wifiSsid = body.wifiSsid || body.ssid || null;

    // 1. Validate PM2.5 (0 - 2500 µg/m³)
    if (rawPm25 === null || isNaN(rawPm25) || rawPm25 < 0 || rawPm25 > 2500) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7807',
        title: 'Invalid Sensor Reading',
        status: 400,
        detail: 'Giá trị PM2.5 không hợp lệ hoặc vượt ngưỡng vật lý (0 - 2500 µg/m³).'
      });
      return;
    }

    // 2. Validate PM10 (0 - 2500 µg/m³) kèm fallback an toàn cho NOT NULL constraint
    let validPm10: number;
    if (rawPm10 !== null) {
      if (isNaN(rawPm10) || rawPm10 < 0 || rawPm10 > 2500) {
        res.status(400).json({
          type: 'https://tools.ietf.org/html/rfc7807',
          title: 'Invalid Sensor Reading',
          status: 400,
          detail: 'Giá trị PM10 không hợp lệ hoặc vượt ngưỡng vật lý (0 - 2500 µg/m³).'
        });
        return;
      }
      validPm10 = rawPm10;
    } else {
      // Thiết bị chỉ có cảm biến PM2.5, ước lượng tỷ lệ chuẩn để thỏa SQLite NOT NULL
      validPm10 = parseFloat((rawPm25 * 1.5).toFixed(1));
    }

    // 3. Validate PM1.0 (0 - 2500 µg/m³) nếu có
    let validPm1: number | null = null;
    if (rawPm1 !== null) {
      if (!isNaN(rawPm1) && rawPm1 >= 0 && rawPm1 <= 2500) {
        validPm1 = rawPm1;
      }
    }

    // 4. Validate Nhiệt độ & Độ ẩm
    const validTemp = (rawTemp !== null && !isNaN(rawTemp) && rawTemp >= -40 && rawTemp <= 85) ? rawTemp : null;
    const validHum = (rawHum !== null && !isNaN(rawHum) && rawHum >= 0 && rawHum <= 100) ? rawHum : null;

    const nowIso = new Date().toISOString();
    const timestamp = body.timestamp || nowIso;

    let device = sqliteClient.get<any>('SELECT * FROM iot_devices WHERE device_code = ? OR id = ?', [deviceCode, deviceCode]);
    if (!device) {
      const newDevId = `dev-${crypto.randomUUID().substring(0, 8)}`;
      sqliteClient.run(`
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
      device = sqliteClient.get<any>('SELECT * FROM iot_devices WHERE id = ?', [newDevId]);
    } else {
      sqliteClient.run(`
        UPDATE iot_devices
        SET status = 'ONLINE',
            last_reading_at = ?,
            wifi_rssi = COALESCE(?, wifi_rssi),
            wifi_ssid = COALESCE(?, wifi_ssid),
            updated_at = ?
        WHERE id = ?
      `, [nowIso, wifiRssi, wifiSsid, nowIso, device.id]);
    }

    const readingId = `read-${crypto.randomUUID().substring(0, 12)}`;
    sqliteClient.run(`
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

    res.status(201).json({
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
    });
  } catch (err: any) {
    console.error('[IoT Ingest Error]:', err);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: 'Ingestion Failed',
      status: 500,
      detail: err.message || 'Lỗi tiếp nhận telemetry từ thiết bị.'
    });
  }
};

iotRouter.post('/telemetry', handleTelemetryIngest);
iotRouter.post('/reading', handleTelemetryIngest);
iotRouter.post('/ingest', handleTelemetryIngest);

// ============================================================================
// 2. GET LATEST TELEMETRY (GET /api/iot/latest & GET /api/iot/telemetry & GET /api/iot/reading)
// Hỗ trợ cả method GET cho /telemetry khi người dùng mở trên trình duyệt hoặc kiểm thử
// ============================================================================
const handleGetLatest = (req: Request, res: Response): void => {
  try {
    const deviceCode = (req.query.deviceId as string) || 'DG-IOT-001';

    const device = sqliteClient.get<any>(`
      SELECT * FROM iot_devices WHERE device_code = ? OR id = ?
    `, [deviceCode, deviceCode]);

    if (!device) {
      res.status(404).json({
        success: false,
        error: { code: 'DEVICE_NOT_FOUND', message: 'Không tìm thấy thiết bị quan trắc.' }
      });
      return;
    }

    const latestReading = sqliteClient.get<any>(`
      SELECT * FROM iot_readings
      WHERE device_id = ?
      ORDER BY created_at DESC, timestamp DESC
      LIMIT 1
    `, [device.id]);

    const now = Date.now();
    const lastSeenMs = parseToEpochMs(device.last_reading_at);
    const diffSec = lastSeenMs > 0 ? Math.max(0, Math.floor((now - lastSeenMs) / 1000)) : 999999;
    const isOnline = diffSec <= 30;

    res.json({
      success: true,
      data: {
        device: {
          id: device.id,
          deviceCode: device.device_code,
          name: device.name,
          locationText: device.location_text,
          latitude: device.latitude,
          longitude: device.longitude,
          sensorModel: device.sensor_model || 'ASAIR APM2000',
          wifiSsid: device.wifi_ssid || 'Harry Maguire',
          wifiRssi: device.wifi_rssi ?? -54,
          firmwareVersion: device.firmware_version || '1.2.0-esp32',
          status: isOnline ? 'ONLINE' : 'OFFLINE',
          isOnline,
          lastSeenAt: device.last_reading_at,
          secondsAgo: diffSec < 999999 ? diffSec : null
        },
        telemetry: latestReading ? {
          id: latestReading.id,
          pm25: latestReading.pm25,
          pm10: latestReading.pm10,
          pm1: latestReading.pm1,
          temperature: latestReading.temperature,
          humidity: latestReading.humidity,
          wifiRssi: latestReading.wifi_rssi ?? device.wifi_rssi,
          wifiSsid: device.wifi_ssid || 'Harry Maguire',
          timestamp: latestReading.timestamp,
          receivedAt: latestReading.created_at
        } : null,
        source: 'Dữ liệu trực tiếp từ cảm biến DustGuard'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

iotRouter.get('/latest', handleGetLatest);
iotRouter.get('/telemetry', handleGetLatest);
iotRouter.get('/reading', handleGetLatest);

// ============================================================================
// 3. GET DEVICE DETAIL & HISTORY (GET /api/iot/device/:id)
// ============================================================================
iotRouter.get('/device/:id', (req: Request, res: Response): void => {
  try {
    const idOrCode = req.params.id;
    const device = sqliteClient.get<any>(`
      SELECT * FROM iot_devices WHERE id = ? OR device_code = ?
    `, [idOrCode, idOrCode]);

    if (!device) {
      res.status(404).json({
        success: false,
        error: { code: 'DEVICE_NOT_FOUND', message: 'Không tìm thấy thiết bị quan trắc.' }
      });
      return;
    }

    const readingsDesc = sqliteClient.all<any>(`
      SELECT * FROM iot_readings
      WHERE device_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [device.id]);

    const history = [...readingsDesc].reverse().map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      pm25: r.pm25,
      pm10: r.pm10,
      pm1: r.pm1,
      temperature: r.temperature,
      humidity: r.humidity,
      wifiRssi: r.wifi_rssi
    }));

    const now = Date.now();
    const lastSeenMs = parseToEpochMs(device.last_reading_at);
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
        latest: readingsDesc.length > 0 ? readingsDesc[0] : null,
        history,
        sampleCount: history.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ============================================================================
// 4. GET ALL DEVICES (GET /api/iot/devices)
// ============================================================================
iotRouter.get('/devices', (req: Request, res: Response): void => {
  try {
    const devices = sqliteClient.all<any>('SELECT * FROM iot_devices ORDER BY created_at ASC');
    const now = Date.now();

    const result = devices.map((d) => {
      const lastSeenMs = parseToEpochMs(d.last_reading_at);
      const diffSec = lastSeenMs > 0 ? Math.max(0, Math.floor((now - lastSeenMs) / 1000)) : 999999;
      const isOnline = diffSec <= 30;
      return {
        ...d,
        isOnline,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        secondsAgo: diffSec < 999999 ? diffSec : null
      };
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ============================================================================
// 5. UPDATE DEVICE (PATCH /api/iot/device/:id)
// ============================================================================
iotRouter.patch('/device/:id', (req: Request, res: Response): void => {
  try {
    const idOrCode = req.params.id;
    const body = req.body || {};
    const nowIso = new Date().toISOString();

    const device = sqliteClient.get<any>('SELECT * FROM iot_devices WHERE id = ? OR device_code = ?', [idOrCode, idOrCode]);
    if (!device) {
      res.status(404).json({ success: false, error: { message: 'Không tìm thấy thiết bị.' } });
      return;
    }

    const newName = body.name || device.name;
    const newLoc = body.locationText || body.location_text || device.location_text;

    sqliteClient.run(`
      UPDATE iot_devices
      SET name = ?, location_text = ?, updated_at = ?
      WHERE id = ?
    `, [newName, newLoc, nowIso, device.id]);

    res.json({
      success: true,
      message: 'Cập nhật thiết bị thành công',
      data: { id: device.id, deviceCode: device.device_code, name: newName, locationText: newLoc }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ============================================================================
// 6. UPDATE WI-FI CONFIG (POST /api/iot/wifi)
// ============================================================================
iotRouter.post('/wifi', (req: Request, res: Response): void => {
  try {
    const body = req.body || {};
    const { ssid, deviceId } = body;
    if (!ssid) {
      res.status(400).json({ success: false, error: { message: 'Thiếu tên Wi-Fi (SSID).' } });
      return;
    }

    const targetDevCode = deviceId || 'DG-IOT-001';
    const nowIso = new Date().toISOString();

    sqliteClient.run(`
      UPDATE iot_devices
      SET wifi_ssid = ?, updated_at = ?
      WHERE device_code = ? OR id = ?
    `, [ssid, nowIso, targetDevCode, targetDevCode]);

    res.json({
      success: true,
      message: `Đã lưu cấu hình Wi-Fi [${ssid}] cho thiết bị ${targetDevCode}.`,
      data: {
        deviceId: targetDevCode,
        wifiSsid: ssid,
        configuredAt: nowIso
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default iotRouter;
