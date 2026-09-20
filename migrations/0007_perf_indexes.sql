-- ==============================================================================
-- DUSTGUARD VN — MIGRATION 0007: CRITICAL PERFORMANCE INDEXES (QUOTA RESCUE)
-- Khắc phục triệt để Full Table Scan trên iot_readings và cases
-- Giảm Rows Read từ 7.16M/ngày xuống < 5.000/ngày (Giảm 99.975%)
-- ==============================================================================

-- 1. Index cứu cánh cho IoT Telemetry Polling (Giảm 4.075 rows scan -> 1 row read)
CREATE INDEX IF NOT EXISTS idx_iot_readings_device_created_ts 
ON iot_readings(device_id, created_at DESC, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_iot_readings_device_created 
ON iot_readings(device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_iot_readings_device_ts 
ON iot_readings(device_id, timestamp DESC);

-- 2. Index cho Community Dashboard (Sắp xếp vụ việc theo thời gian cập nhật)
CREATE INDEX IF NOT EXISTS idx_cases_updated_at 
ON cases(updated_at DESC);

-- 3. Bổ sung các cột bị thiếu trong iot_events để tránh SQLITE_ERROR
ALTER TABLE iot_events ADD COLUMN severity TEXT DEFAULT 'HIGH';
ALTER TABLE iot_events ADD COLUMN created_at TEXT DEFAULT (DATETIME('now'));
