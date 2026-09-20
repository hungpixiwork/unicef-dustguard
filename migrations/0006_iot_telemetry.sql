-- Migration 0006: Add IoT Hardware Telemetry & Device Support
-- Compatible with existing D1 iot_devices and iot_readings tables

ALTER TABLE iot_devices ADD COLUMN sensor_model TEXT DEFAULT 'ASAIR APM2000';
ALTER TABLE iot_devices ADD COLUMN wifi_ssid TEXT DEFAULT 'Harry Maguire';
ALTER TABLE iot_devices ADD COLUMN wifi_rssi INTEGER DEFAULT -50;
ALTER TABLE iot_devices ADD COLUMN firmware_version TEXT DEFAULT '1.2.0-esp32';
ALTER TABLE iot_devices ADD COLUMN updated_at TEXT;

ALTER TABLE iot_readings ADD COLUMN pm1 REAL;
ALTER TABLE iot_readings ADD COLUMN wifi_rssi INTEGER;

-- Seed thiết bị phần cứng thật DG-IOT-001 nếu chưa tồn tại
INSERT OR IGNORE INTO iot_devices (
  id,
  device_code,
  name,
  location_text,
  latitude,
  longitude,
  status,
  sensor_model,
  wifi_ssid,
  wifi_rssi,
  firmware_version,
  created_at,
  updated_at
) VALUES (
  'dev-apm2000-001',
  'DG-IOT-001',
  'DustGuard Demo Node',
  '484 Lê Văn Việt, Hồ Chí Minh',
  21.0205,
  105.8078,
  'OFFLINE',
  'ASAIR APM2000',
  'Harry Maguire',
  -50,
  '1.2.0-esp32',
  DATETIME('now'),
  DATETIME('now')
);
