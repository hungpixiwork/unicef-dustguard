#include "apm2000.h"
#include "config.h"

APM2000Driver::APM2000Driver() 
    : _serial(2), _validFrames(0), _invalidFrames(0), _totalMeasurements(0), _lastReadTime(0) {
    memset(_frameBuffer, 0, sizeof(_frameBuffer));
}

void APM2000Driver::begin(int rxPin, int txPin, uint32_t baud) {
    _serial.begin(baud, SERIAL_8N1, rxPin, txPin);
    _lastReadTime = millis();
    Serial.printf("[APM2000] Initialized UART2 on RX:%d, TX:%d at %d bps\n", rxPin, txPin, baud);
}

bool APM2000Driver::read(SensorReading &reading) {
#ifdef DUSTGUARD_DEMO_MODE
    // Compile-time DEMO MODE: Sinh dữ liệu mẫu thực tế nếu không có phần cứng vật lý
    static float basePm25 = 25.0f;
    static float phase = 0.0f;
    phase += 0.1f;
    
    reading.pm25 = basePm25 + sin(phase) * 8.0f;
    reading.pm1 = reading.pm25 * 0.45f;
    reading.pm10 = reading.pm25 * 1.55f;
    reading.timestamp = millis();
    reading.isValid = true;

    _validFrames++;
    _totalMeasurements++;
    _lastReadTime = millis();
    return true;
#else
    // Production Mode: Đọc UART thực tế từ cảm biến APM2000
    if (!_serial.available()) {
        return false;
    }

    // Tìm kiếm header 0x42 0x4D
    while (_serial.available() >= 32) {
        if (_serial.peek() != 0x42) {
            _serial.read(); // Bỏ byte rác
            continue;
        }

        // Đọc byte đầu tiên
        uint8_t b1 = _serial.read();
        if (_serial.peek() != 0x4D) {
            continue;
        }
        uint8_t b2 = _serial.read();

        _frameBuffer[0] = b1;
        _frameBuffer[1] = b2;

        // Đọc 30 bytes còn lại
        size_t bytesRead = _serial.readBytes(&_frameBuffer[2], 30);
        if (bytesRead < 30) {
            _invalidFrames++;
            return false;
        }

        // Kiểm tra Checksum (Tổng byte 0 đến 29 == (byte 30 << 8) | byte 31)
        uint16_t calcChecksum = 0;
        for (int i = 0; i < 30; i++) {
            calcChecksum += _frameBuffer[i];
        }

        uint16_t expectedChecksum = (_frameBuffer[30] << 8) | _frameBuffer[31];

        if (calcChecksum == expectedChecksum) {
            if (parseFrame(_frameBuffer, reading)) {
                _validFrames++;
                _totalMeasurements++;
                _lastReadTime = millis();
                return true;
            }
        } else {
            _invalidFrames++;
            Serial.printf("[APM2000] Checksum mismatch! Calc: 0x%04X, Expected: 0x%04X\n", calcChecksum, expectedChecksum);
        }
    }

    return false;
#endif
}

bool APM2000Driver::parseFrame(const uint8_t *buf, SensorReading &reading) {
    // APM2000 Standard Data Protocol:
    // Bytes 4-5: PM1.0 (Standard particle, ug/m3)
    // Bytes 6-7: PM2.5 (Standard particle, ug/m3)
    // Bytes 8-9: PM10  (Standard particle, ug/m3)
    uint16_t rawPm1 = (buf[4] << 8) | buf[5];
    uint16_t rawPm25 = (buf[6] << 8) | buf[7];
    uint16_t rawPm10 = (buf[8] << 8) | buf[9];

    // Sanity check
    if (rawPm25 > 1000 || rawPm10 > 1000) {
        _invalidFrames++;
        return false;
    }

    reading.pm1 = (float)rawPm1;
    reading.pm25 = (float)rawPm25;
    reading.pm10 = (float)rawPm10;
    reading.timestamp = millis();
    reading.isValid = true;

    return true;
}
