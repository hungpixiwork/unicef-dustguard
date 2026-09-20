#ifndef DUSTGUARD_CONFIG_H
#define DUSTGUARD_CONFIG_H

#include <stdint.h>

// =========================================================================
// Device Identification (Nhóm 11 - Samsung Innovation Campus 2026)
// =========================================================================
#define DUSTGUARD_DEVICE_ID        "DG-NODE-011"
#define DUSTGUARD_FIRMWARE_VERSION "1.0.0"
#define DUSTGUARD_SENSOR_MODEL     "ASAIR APM2000"

// =========================================================================
// Wi-Fi Credentials & Cloud Ingest API
// =========================================================================
#ifndef DUSTGUARD_WIFI_SSID
#define DUSTGUARD_WIFI_SSID        "DustGuard-Lab"
#endif

#ifndef DUSTGUARD_WIFI_PASS
#define DUSTGUARD_WIFI_PASS        "dustguard@2026"
#endif

#define DUSTGUARD_API_BASE_URL     "http://192.168.1.100:3001" // Local Worker / Server URL
#define DUSTGUARD_API_ENDPOINT     "/api/iot/v1/readings"
#define DUSTGUARD_API_SECRET       "dustguard_secret_key_2026"

// =========================================================================
// Centralized Environmental Thresholds (QCVN 05:2023/BTNMT)
// =========================================================================
#define THRESHOLD_PM25_NORMAL      25.0f   // <= 25 ug/m3: Tiêu chuẩn an toàn
#define THRESHOLD_PM25_MODERATE    50.0f   // <= 50 ug/m3: Cần theo dõi
#define THRESHOLD_PM25_HIGH        100.0f  // <= 100 ug/m3: Vượt ngưỡng quy chuẩn
// > 100 ug/m3: Nguy hại rất cao (Very High)

#define THRESHOLD_PM10_NORMAL      50.0f
#define THRESHOLD_PM10_MODERATE    100.0f
#define THRESHOLD_PM10_HIGH        150.0f

// =========================================================================
// Hardware Pinout (ESP32 DevKit V1 + 3.5" TFT Touch + APM2000)
// =========================================================================
// APM2000 UART Pins (HardwareSerial 2)
#define PIN_APM2000_RX             16      // Nối với chân TX của APM2000
#define PIN_APM2000_TX             17      // Nối với chân RX của APM2000 (nếu cần lệnh cấu hình)
#define APM2000_BAUD_RATE          9600

// 3.5" Color TFT SPI (480x320)
#define PIN_TFT_MOSI               23
#define PIN_TFT_MISO               19
#define PIN_TFT_SCLK               18
#define PIN_TFT_CS                 15
#define PIN_TFT_DC                 2
#define PIN_TFT_RST                4

// XPT2046 Touch Controller SPI
#define PIN_TOUCH_CS               21
#define PIN_TOUCH_IRQ              -1      // Hoặc polling định kỳ

// =========================================================================
// Execution Timing & Frequencies (Non-blocking Engine)
// =========================================================================
#define INTERVAL_SENSOR_READ_MS    2000    // Đọc cảm biến mỗi 2 giây
#define INTERVAL_UI_REFRESH_MS     500     // Cập nhật màn hình cảm ứng mỗi 500ms
#define INTERVAL_CLOUD_UPLOAD_MS   15000   // Tải dữ liệu lên Cloud mỗi 15 giây
#define INTERVAL_HEARTBEAT_MS      60000   // Heartbeat mỗi 60 giây

#define OFFLINE_QUEUE_CAPACITY     30      // Lưu tối đa 30 mẫu đo khi mất mạng

#endif // DUSTGUARD_CONFIG_H
