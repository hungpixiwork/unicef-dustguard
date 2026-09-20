#include <Arduino.h>
#include "config.h"
#include "pins.h"
#include "types.h"
#include "secrets.h"

#include "sensors/APM2000Sensor.h"
#include "display/DisplayManager.h"
#include "network/WiFiManager.h"
#include "network/ApiClient.h"
#include "network/CaseApiClient.h"
#include "telemetry/TelemetryManager.h"
#include "system/DeviceHealth.h"

// Analytics Engine
#include "analytics/AqiCalculator.h"
#include "analytics/ParticleAnalyzer.h"
#include "analytics/RollingStats.h"
#include "analytics/EventDetector.h"

// Touchscreen UI Engine
#include "ui/TouchRouter.h"

// =========================================================================
// Global System Singletons
// =========================================================================
static APM2000Sensor    g_sensor;
static DisplayManager   g_display;      // Fallback OLED / Mini Screen
static WiFiManager      g_wifi;
static ApiClient        g_apiClient;
static CaseApiClient    g_caseApiClient;
static TelemetryManager g_telemetry;
static DeviceHealth     g_health;
static RollingStats     g_rollingStats;
static TouchRouter      g_touchRouter(&g_caseApiClient, &g_rollingStats);

// Runtime State
static SensorReading    g_currentReading;
static DerivedMetrics   g_derivedMetrics;
static DeviceStatus     g_deviceStatus;
static NetworkStatus    g_networkStatus;
static bool             g_isBooting = true;
static uint32_t         g_totalSamples = 0;

// Non-blocking Timers
static uint32_t         g_lastSensorReadTime = 0;
static uint32_t         g_lastDisplayUpdateTime = 0;
static uint32_t         g_lastTelemetryUploadTime = 0;

// Callback khi người dùng bấm "TEST SENSOR" trên màn hình cảm ứng
void onTestSensorTriggered() {
    Serial.println("[TOUCH] Nguoi dung trigger [TEST SENSOR] tren man hinh!");
    SensorReading testReading;
    bool ok = g_sensor.read(testReading);
    if (ok) {
        Serial.printf("[TEST OK] PM1: %.0f, PM2.5: %.0f, PM10: %.0f\n", testReading.pm1, testReading.pm25, testReading.pm10);
    } else {
        Serial.println("[TEST FAIL] Khong doc duoc frame hop le tu UART.");
    }
}

// =========================================================================
// Setup Routine
// =========================================================================
void setup() {
    // 1. Khởi tạo Serial tốc độ cao để debug và inspect
    Serial.begin(115200);
    delay(200);

    Serial.println("\n=======================================================");
    Serial.printf("[BOOT] %s v%s\n", FIRMWARE_NAME, FIRMWARE_VERSION);
    Serial.printf("[BOOT] Hardware Target: %s\n", HARDWARE_TARGET);
    Serial.printf("[BOOT] Free Heap: %u bytes\n", ESP.getFreeHeap());
    Serial.println("=======================================================");

    // 2. Cấu hình Device Status ban đầu
    strncpy(g_deviceStatus.deviceId, DEFAULT_DEVICE_ID, sizeof(g_deviceStatus.deviceId) - 1);
    strncpy(g_deviceStatus.firmwareVersion, FIRMWARE_VERSION, sizeof(g_deviceStatus.firmwareVersion) - 1);
    strncpy(g_deviceStatus.powerSource, "USB / External", sizeof(g_deviceStatus.powerSource) - 1);

    // 3. Khởi tạo Status LED
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, HIGH);

    // 4. Khởi tạo Touchscreen Router & Display
    g_touchRouter.begin();
    g_touchRouter.setSensorTestCallback(onTestSensorTriggered);
    g_display.begin();
    g_display.showBootScreen("Khoi tao he thong...");
    delay(300);

    // 5. Khởi tạo cảm biến bụi ASAIR APM2000
    g_display.showBootScreen("Kiem tra APM2000...");
    g_sensor.begin();
    delay(300);

    // 6. Khởi tạo Wi-Fi & NTP
    g_display.showBootScreen("Ket noi Wi-Fi & NTP...");
    g_wifi.begin(WIFI_SSID, WIFI_PASSWORD);

    // 7. Cấu hình Client kết nối đám mây Cloudflare D1
    #ifdef API_TELEMETRY_PATH
    g_apiClient.configure(API_BASE_URL_DEFAULT, API_TELEMETRY_PATH);
    #else
    g_apiClient.configure(API_BASE_URL_DEFAULT, API_TELEMETRY_PATH_DEFAULT);
    #endif
    g_caseApiClient.configure(API_BASE_URL_DEFAULT);
    g_telemetry.begin(DEFAULT_DEVICE_ID, DEVICE_SECRET_KEY, &g_apiClient, &g_wifi);

    g_isBooting = false;
    digitalWrite(PIN_STATUS_LED, LOW);

    Serial.println("[BOOT] Khoi dong hoan tat! He thong da san sang.");
}

// =========================================================================
// Main Loop (Non-blocking Cooperative Scheduler)
// =========================================================================
void loop() {
    uint32_t now = millis();

    // 1. Cập nhật trạng thái Wi-Fi
    g_wifi.update(g_networkStatus);
    g_deviceStatus.wifiConnected = g_networkStatus.wifiConnected;
    g_deviceStatus.wifiRssi = g_networkStatus.wifiRssi;
    g_deviceStatus.cloudConnected = g_networkStatus.cloudOnline;
    g_deviceStatus.uptimeSeconds = now / 1000;
    g_deviceStatus.freeHeap = ESP.getFreeHeap();

    // 2. Scheduler: Đọc cảm biến vật lý thật (Mỗi 2 giây)
    if (now - g_lastSensorReadTime >= SENSOR_READ_INTERVAL_MS) {
        g_lastSensorReadTime = now;

        bool readOk = g_sensor.read(g_currentReading);
        if (readOk) {
            g_totalSamples++;
            g_deviceStatus.sampleCount = g_totalSamples;
            g_deviceStatus.sensorConnected = true;
            g_deviceStatus.lastSampleAgeSec = 0.0f;

            // Đưa mẫu đo vào bộ tính toán thống kê trượt (Rolling Stats)
            g_rollingStats.addSample(g_currentReading);

            // Chạy Analytics Engine
            AqiCalculator::calculate(g_currentReading.pm25, g_currentReading.pm10, 
                                     AqiStandard::VN_QCVN, g_derivedMetrics.aqi, 
                                     g_derivedMetrics.aqiCategory, sizeof(g_derivedMetrics.aqiCategory),
                                     g_derivedMetrics.dominantPollutant, sizeof(g_derivedMetrics.dominantPollutant));

            char insightBuf[96];
            ParticleAnalyzer::analyze(g_currentReading, g_derivedMetrics, insightBuf, sizeof(insightBuf));

            g_rollingStats.compute(g_derivedMetrics);

            // Đánh giá sự kiện bụi (Dust Event Detection)
            EventDetector::evaluate(g_currentReading, g_derivedMetrics);

            // Nếu phát hiện Spike đột biến và đang ở màn hình Live -> Tự động chuyển cảnh báo sang AIR EVENT
            if (g_derivedMetrics.eventState == DustEventSeverity::SPIKE && 
                g_touchRouter.currentScreen() == SCREEN_LIVE) {
                Serial.println("[EVENT ALERT] Phat hien SPIKE! Chuyen sang man hinh AIR EVENT.");
                g_touchRouter.navigateTo(SCREEN_AIR_EVENT);
            }

            // Ghi nhận telemetry chuẩn bị gửi Cloud
            g_telemetry.recordReading(g_currentReading);

            // Nhấp nháy nhẹ LED báo hiệu đọc mẫu
            digitalWrite(PIN_STATUS_LED, HIGH);
        } else {
            g_deviceStatus.sensorConnected = false;
            g_deviceStatus.invalidFrameCount++;
            digitalWrite(PIN_STATUS_LED, LOW);
        }

        g_health.update(g_sensor, g_networkStatus, g_currentReading);
    } else {
        if (now - g_lastSensorReadTime > 80) {
            digitalWrite(PIN_STATUS_LED, LOW);
        }
    }

    // 3. Scheduler: Cập nhật giao diện Touch Display (Mỗi 100ms - 10 FPS mượt mà)
    if (now - g_lastDisplayUpdateTime >= DISPLAY_UPDATE_INTERVAL_MS) {
        g_lastDisplayUpdateTime = now;

        DeviceState currentState = g_health.evaluateState(g_sensor, g_networkStatus, g_isBooting);
        g_display.update(g_currentReading, g_networkStatus, currentState);
    }

    // 4. Scheduler: Đẩy Telemetry lên máy chủ Cloudflare Edge (Mỗi 15 giây)
    if (g_telemetry.shouldUpload()) {
        g_telemetry.uploadLatest(g_networkStatus);
        g_lastTelemetryUploadTime = now;
    }

    // Nhường CPU cho ESP32 RTOS background tasks
    yield();
}
