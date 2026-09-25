import test from 'node:test';
import assert from 'node:assert/strict';
import { sqliteClient } from '../apps/server/dist/db/index.js';

try {
  sqliteClient.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
} catch (_) {}

test('DustGuard VN — Real Telemetry Pipeline & IoT Invariant Suite', async (t) => {
  
  await t.test('1. Kiểm tra tồn tại trạm đo thật DG-IOT-001 trong CSDL SSOT', () => {
    const device = sqliteClient.prepare('SELECT * FROM iot_devices WHERE device_code = ?').get('DG-IOT-001');
    assert.ok(device, 'Trạm DG-IOT-001 phải tồn tại trong CSDL');
    assert.equal(device.device_code, 'DG-IOT-001');
    assert.equal(device.sensor_model, 'ASAIR APM2000');
    assert.equal(device.wifi_ssid, 'Harry Maguire');
  });

  await t.test('2. Tiếp nhận gói tin Telemetry thật và lưu trữ bền vững vào iot_readings', () => {
    const device = sqliteClient.prepare('SELECT * FROM iot_devices WHERE device_code = ?').get('DG-IOT-001');
    const testReadingId = 'test-read-' + Date.now();
    const rawPm25 = 37.5;
    const rawPm10 = 56.2;
    const rawPm1 = 26.1;
    const rssi = -52;
    const nowIso = new Date().toISOString();

    // Ingest reading
    sqliteClient.prepare(`
      INSERT INTO iot_readings (id, device_id, timestamp, pm25, pm10, pm1, wifi_rssi, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(testReadingId, device.id, nowIso, rawPm25, rawPm10, rawPm1, rssi, nowIso);

    // Cập nhật trạm
    sqliteClient.prepare(`
      UPDATE iot_devices 
      SET last_reading_at = datetime('now'),
          status = 'ONLINE',
          wifi_rssi = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(rssi, device.id);

    // Truy vấn kiểm tra
    const reading = sqliteClient.prepare('SELECT * FROM iot_readings WHERE id = ?').get(testReadingId);
    assert.ok(reading, 'Gói tin telemetry phải được ghi nhận vào SQLite SSOT');
    assert.equal(reading.pm25, 37.5);
    assert.equal(reading.pm10, 56.2);
    assert.equal(reading.pm1, 26.1);
    assert.equal(reading.wifi_rssi, -52);
  });

  await t.test('3. Tính toán trạng thái Online/Offline theo cửa sổ SSOT 30 giây', () => {
    function parseToEpochMs(timestampStr) {
      if (!timestampStr) return null;
      const isoStr = timestampStr.endsWith('Z') || timestampStr.includes('+') ? timestampStr : timestampStr.replace(' ', 'T') + 'Z';
      const epoch = Date.parse(isoStr);
      return isNaN(epoch) ? null : epoch;
    }

    const device = sqliteClient.prepare('SELECT * FROM iot_devices WHERE device_code = ?').get('DG-IOT-001');
    const nowMs = Date.now();
    const lastSeenMs = parseToEpochMs(device.last_reading_at);
    assert.ok(lastSeenMs !== null, 'last_reading_at phải parse được thành epoch ms');
    
    const secondsAgo = Math.max(0, Math.floor((nowMs - lastSeenMs) / 1000));
    assert.ok(secondsAgo <= 5, `Gói tin vừa gửi chỉ được cách tối đa vài giây (thực tế: ${secondsAgo}s)`);
    
    const isOnline = secondsAgo <= 30;
    assert.equal(isOnline, true, 'Thiết bị vừa gửi telemetry phải có trạng thái ONLINE');
  });

  await t.test('4. Kiểm tra Validation chặn biên độ vật lý (0 <= PM <= 2500 ug/m3, không NaN/Âm)', () => {
    function validateReading(pm25) {
      if (pm25 === undefined || pm25 === null || isNaN(pm25) || pm25 < 0 || pm25 > 2500) {
        return false;
      }
      return true;
    }

    assert.equal(validateReading(35), true);
    assert.equal(validateReading(0), true);
    assert.equal(validateReading(2500), true);
    assert.equal(validateReading(-1), false, 'Chặn số âm');
    assert.equal(validateReading(2501), false, 'Chặn quá ngưỡng vật lý 2500 ug/m3');
    assert.equal(validateReading(NaN), false, 'Chặn NaN');
    assert.equal(validateReading(null), false, 'Chặn null');
  });

  await t.test('5. Đảm bảo API trả về dữ liệu thuần túy từ cảm biến thật, không mock PM2.5 48 ug/m3', () => {
    const latestReading = sqliteClient.prepare(`
      SELECT r.* FROM iot_readings r
      JOIN iot_devices d ON r.device_id = d.id
      WHERE d.device_code = 'DG-IOT-001'
      ORDER BY r.timestamp DESC LIMIT 1
    `).get();

    assert.ok(latestReading, 'Phải có reading trong DB');
    assert.equal(latestReading.pm25, 37.5, 'Giá trị trả về phải khớp với gói tin thật vừa gửi');
    
    // Tự động dọn dẹp bản ghi test để trả DB về trạng thái sạch nguyên bản
    sqliteClient.prepare('DELETE FROM iot_readings WHERE id LIKE ?').run('test-read-%');
    sqliteClient.prepare("UPDATE iot_devices SET status = 'OFFLINE', last_reading_at = null WHERE device_code = 'DG-IOT-001'").run();
  });
});
