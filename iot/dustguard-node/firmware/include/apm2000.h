#ifndef DUSTGUARD_APM2000_H
#define DUSTGUARD_APM2000_H

#include <Arduino.h>
#include "types.h"

class APM2000Driver {
public:
    APM2000Driver();
    void begin(int rxPin = 16, int txPin = 17, uint32_t baud = 9600);
    bool read(SensorReading &reading);

    uint32_t getValidFrames() const { return _validFrames; }
    uint32_t getInvalidFrames() const { return _invalidFrames; }
    uint32_t getTotalMeasurements() const { return _totalMeasurements; }
    uint32_t getLastReadTime() const { return _lastReadTime; }

private:
    HardwareSerial _serial;
    uint32_t _validFrames;
    uint32_t _invalidFrames;
    uint32_t _totalMeasurements;
    uint32_t _lastReadTime;
    uint8_t _frameBuffer[32];

    bool parseFrame(const uint8_t *buf, SensorReading &reading);
};

#endif // DUSTGUARD_APM2000_H
