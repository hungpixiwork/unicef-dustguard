#ifndef DUSTGUARD_TYPES_H
#define DUSTGUARD_TYPES_H

#include <stdint.h>
#include <stddef.h>

/**
 * Air Quality Status based on QCVN 05:2023/BTNMT
 */
enum AirStatus : uint8_t {
    AIR_NORMAL = 0,    // PM2.5 <= 25 ug/m3
    AIR_MODERATE = 1,  // PM2.5 26 - 50 ug/m3
    AIR_HIGH = 2,      // PM2.5 51 - 100 ug/m3
    AIR_VERY_HIGH = 3  // PM2.5 > 100 ug/m3
};

/**
 * Touchscreen Navigation IDs
 */
enum ScreenId : uint8_t {
    SCREEN_HOME = 0,
    SCREEN_CHART = 1,
    SCREEN_DEVICE = 2,
    SCREEN_SENSOR = 3,
    SCREEN_NETWORK = 4,
    SCREEN_ABOUT = 5,
    SCREEN_NONE = 255
};

/**
 * Chart Time Range selection
 */
enum ChartTimeRange : uint8_t {
    RANGE_5_MIN = 0,
    RANGE_30_MIN = 1,
    RANGE_1_HOUR = 2
};

/**
 * Chart Metric Channel selection
 */
enum ChartMetric : uint8_t {
    METRIC_PM1 = 0,
    METRIC_PM25 = 1,
    METRIC_PM10 = 2
};

/**
 * Raw Particle Reading from APM2000
 */
struct SensorReading {
    float pm1;
    float pm25;
    float pm10;
    uint32_t timestamp;
    bool isValid;
};

/**
 * Centralized Shared Device State Model
 * Consumed by Touchscreen UI and Cloud Upload Service
 */
struct DeviceState {
    // Environmental readings
    float pm1;
    float pm25;
    float pm10;
    AirStatus airStatus;

    // Sensor health & telemetry
    bool sensorConnected;
    uint32_t sensorLastReadSecondsAgo;
    uint32_t validFrames;
    uint32_t invalidFrames;
    uint32_t totalMeasurements;

    // Wi-Fi connectivity
    bool wifiConnected;
    int wifiRSSI;
    char ipAddress[20];
    char ssid[32];

    // Cloud upload state
    bool cloudConnected;
    uint32_t lastUploadSecondsAgo;
    int pendingUploads;
    int readingsSent;
    int failedUploads;
    int lastHttpResponse;

    // Device metadata
    const char* deviceId;
    const char* firmwareVersion;
    uint32_t uptimeSeconds;
};

#endif // DUSTGUARD_TYPES_H
