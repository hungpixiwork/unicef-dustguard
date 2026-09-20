#include <Arduino.h>
#include <SPI.h>
#include <XPT2046_Touchscreen.h>

#include "types.h"
#include "config.h"
#include "apm2000.h"
#include "wifi.h"
#include "api.h"
#include "ui_manager.h"

// =========================================================================
// Global Device Modules
// =========================================================================
static APM2000Driver       g_sensor;
static WiFiService         g_wifi;
static ApiClient           g_api;
static UIManager           g_ui;
static XPT2046_Touchscreen g_touch(PIN_TOUCH_CS);

// Centralized Shared Device State Model
static DeviceState         g_deviceState;
static SensorReading       g_latestReading;

// Non-blocking loop timers
static uint32_t            g_lastSensorReadTime = 0;
static uint32_t            g_lastUploadTime = 0;
static uint32_t            g_lastTouchPollTime = 0;
static uint32_t            g_bootTime = 0;

// Action Callbacks for Touch Buttons
void onWifiReconnectTriggered() {
    Serial.println("[MAIN] Manual Wi-Fi reconnect triggered from Touchscreen.");
    g_wifi.reconnect();
}

void onCloudSyncTriggered() {
    Serial.println("[MAIN] Manual Cloud sync triggered from Touchscreen.");
    g_api.uploadReading(g_latestReading, g_deviceState);
}

// Evaluate Air Status according to QCVN 05:2023/BTNMT
AirStatus evaluateAirStatus(float pm25) {
    if (pm25 > THRESHOLD_PM25_HIGH) {
        return AIR_VERY_HIGH;
    } else if (pm25 > THRESHOLD_PM25_MODERATE) {
        return AIR_HIGH;
    } else if (pm25 > THRESHOLD_PM25_NORMAL) {
        return AIR_MODERATE;
    }
    return AIR_NORMAL;
}

// =========================================================================
// Setup Routine
// =========================================================================
void setup() {
    Serial.begin(115200);
    delay(200);

    Serial.println("\n=======================================================");
    Serial.println(" DustGuard VN — IoT Node (Samsung Innovation Campus 2026)");
    Serial.printf(" Device ID: %s | Firmware: %s | STT: 11\n", DUSTGUARD_DEVICE_ID, DUSTGUARD_FIRMWARE_VERSION);
    Serial.println(" SVTH: Pham Phu Nguyen Hung (MSSV: 26730023 - UIT CNTT)");
    Serial.println(" GVHD: TS. Nguyen Van Thai (Khoa Dien-Dien tu, HCM-UTE)");
    Serial.println("=======================================================\n");

    // Initialize State Model
    memset(&g_deviceState, 0, sizeof(DeviceState));
    g_deviceState.deviceId = DUSTGUARD_DEVICE_ID;
    g_deviceState.firmwareVersion = DUSTGUARD_FIRMWARE_VERSION;
    g_deviceState.airStatus = AIR_NORMAL;
    g_deviceState.pm1 = 12.0f;
    g_deviceState.pm25 = 24.5f;
    g_deviceState.pm10 = 42.0f;

    // 1. Initialize Display & UI
    g_ui.begin();

    // 2. Initialize Touchscreen Controller
    g_touch.begin();
    g_touch.setRotation(1); // Match TFT landscape orientation

    // 3. Initialize Sensor UART2
    g_sensor.begin(PIN_APM2000_RX, PIN_APM2000_TX, APM2000_BAUD_RATE);

    // 4. Initialize Network & Cloud
    g_wifi.begin(DUSTGUARD_WIFI_SSID, DUSTGUARD_WIFI_PASS);
    g_api.begin(DUSTGUARD_API_BASE_URL, DUSTGUARD_API_ENDPOINT, DUSTGUARD_API_SECRET);

    g_bootTime = millis();
    Serial.println("[SYSTEM] System initialization complete. Entering State Machine loop.");
}

// =========================================================================
// Main Non-blocking Loop
// =========================================================================
void loop() {
    uint32_t now = millis();
    g_deviceState.uptimeSeconds = (now - g_bootTime) / 1000;

    // 1. Update Network Service State
    g_wifi.update(g_deviceState);

    // 2. Poll APM2000 Sensor (every 2 seconds)
    if (now - g_lastSensorReadTime >= INTERVAL_SENSOR_READ_MS) {
        g_lastSensorReadTime = now;

        SensorReading reading;
        if (g_sensor.read(reading)) {
            g_latestReading = reading;
            g_deviceState.pm1 = reading.pm1;
            g_deviceState.pm25 = reading.pm25;
            g_deviceState.pm10 = reading.pm10;
            g_deviceState.airStatus = evaluateAirStatus(reading.pm25);

            g_deviceState.sensorConnected = true;
            g_deviceState.sensorLastReadSecondsAgo = 0;
            g_deviceState.validFrames = g_sensor.getValidFrames();
            g_deviceState.invalidFrames = g_sensor.getInvalidFrames();
            g_deviceState.totalMeasurements = g_sensor.getTotalMeasurements();

            // Record to chart history buffer
            g_ui.recordMetricSample(reading.pm1, reading.pm25, reading.pm10);

            Serial.printf("[SENSOR] PM1: %.1f | PM2.5: %.1f | PM10: %.1f ug/m3 (Status: %d)\n", 
                          reading.pm1, reading.pm25, reading.pm10, g_deviceState.airStatus);
        } else {
            g_deviceState.sensorLastReadSecondsAgo = (now - g_sensor.getLastReadTime()) / 1000;
            if (g_deviceState.sensorLastReadSecondsAgo > 10) {
                g_deviceState.sensorConnected = false;
            }
        }
    }

    // 3. Periodic Cloud Telemetry Upload (every 15 seconds)
    if (now - g_lastUploadTime >= INTERVAL_CLOUD_UPLOAD_MS) {
        g_lastUploadTime = now;
        if (g_deviceState.sensorConnected || g_latestReading.isValid) {
            g_api.uploadReading(g_latestReading, g_deviceState);
        }
    } else {
        g_deviceState.lastUploadSecondsAgo = (now - g_lastUploadTime) / 1000;
    }

    // 4. Poll Touch Input (every 50ms)
    if (now - g_lastTouchPollTime >= 50) {
        g_lastTouchPollTime = now;
        if (g_touch.touched()) {
            TS_Point p = g_touch.getPoint();
            // Map raw ADC touch coordinates to 480x320 landscape
            int16_t touchX = map(p.x, 200, 3800, 0, 480);
            int16_t touchY = map(p.y, 200, 3800, 0, 320);

            // Constrain
            touchX = constrain(touchX, 0, 479);
            touchY = constrain(touchY, 0, 319);

            g_ui.handleTouch(touchX, touchY, g_deviceState, onWifiReconnectTriggered, onCloudSyncTriggered);
        }
    }

    // 5. Update Touchscreen UI (non-blocking 500ms interval)
    g_ui.update(g_deviceState);

    // Minimal delay to feed watchdog
    delay(5);
}
