#ifndef DUSTGUARD_CONFIG_H
#define DUSTGUARD_CONFIG_H

#include <stdint.h>
#include "types.h"

// ==========================================
// Firmware Metadata
// ==========================================
#define FIRMWARE_NAME           "DustGuard Touch Node"
#define FIRMWARE_VERSION        "2.0.0"
#define HARDWARE_TARGET         "ESP32-APM2000-TOUCH"
#define DEFAULT_DEVICE_ID       "DG-NODE-01"

// ==========================================
// Test Mode Switch (0 = Production Hardware, 1 = Self-Test Diagnostics)
// ==========================================
#ifndef DUSTGUARD_TEST_MODE
#define DUSTGUARD_TEST_MODE     0
#endif

// ==========================================
// Timing & Schedulers (in milliseconds)
// ==========================================
constexpr uint32_t SENSOR_READ_INTERVAL_MS       = 2000;    // Đọc cảm biến mỗi 2 giây
constexpr uint32_t DISPLAY_UPDATE_INTERVAL_MS     = 100;     // Render UI mượt mà 10 FPS (100ms)
constexpr uint32_t TELEMETRY_UPLOAD_INTERVAL_MS   = 15000;   // Gửi dữ liệu đám mây mỗi 15 giây
constexpr uint32_t WIFI_RECONNECT_INTERVAL_MS     = 10000;   // Thử kết nối lại Wi-Fi mỗi 10 giây
constexpr uint32_t NTP_SYNC_INTERVAL_MS           = 3600000; // Đồng bộ lại NTP mỗi 1 giờ
constexpr uint32_t HTTP_TIMEOUT_MS                = 8000;    // Timeout request HTTP/HTTPS
constexpr uint8_t  MAX_BUFFERED_READINGS          = 30;      // Bộ đệm tối đa 7,5 phút ở chu kỳ upload 15 giây
constexpr uint32_t RETRY_DELAY_INITIAL_MS          = 5000;    // Retry đầu tiên sau 5 giây
constexpr uint32_t RETRY_DELAY_MAX_MS              = 60000;   // Giới hạn backoff 60 giây
constexpr uint8_t  RETRY_MULTIPLIER                = 2;

// ==========================================
// Sensor & Quality Control Constraints
// ==========================================
constexpr float PHYSICAL_MIN_PM                   = 0.0f;    // Ngưỡng vật lý tối thiểu
constexpr float PHYSICAL_MAX_PM                   = 2500.0f; // Ngưỡng vật lý tối đa (µg/m³)
constexpr uint8_t SENSOR_MAX_CONSECUTIVE_FAILURES = 5;       // Ngưỡng lỗi liên tiếp để báo SENSOR_FAULT
constexpr uint8_t ROLLING_AVG_SAMPLES             = 5;       // Bộ lọc trung bình trượt 5 mẫu
constexpr uint16_t ROLLING_BUFFER_1M_SIZE         = 30;      // 30 mẫu @ 2s = 60s (1 phút)
constexpr uint16_t ROLLING_BUFFER_5M_SIZE         = 150;     // 150 mẫu @ 2s = 300s (5 phút)
constexpr uint8_t GRAPH_POINTS_MAX                = 60;      // Số điểm vẽ mini-graph realtime

// ==========================================
// Analytics & Event Detector Thresholds
// ==========================================
constexpr float SPIKE_THRESHOLD_DELTA_PM25        = 30.0f;   // Tăng > 30 µg/m³ trong 60s -> SPIKE
constexpr float SUSTAINED_HIGH_PM25               = 75.0f;   // PM2.5 > 75 µg/m³ kéo dài -> SUSTAINED_HIGH
constexpr float ELEVATED_PM25                     = 50.0f;   // PM2.5 > 50 µg/m³ -> ELEVATED
constexpr float RAPID_RISE_RATE_PER_MIN           = 15.0f;   // Tốc độ tăng > 15 µg/m³/min -> RAPID_RISE

// ==========================================
// Touchscreen Display Parameters (TFT 320x240 / 480x320)
// ==========================================
constexpr uint16_t SCREEN_WIDTH                   = 128;
constexpr uint16_t SCREEN_HEIGHT                  = 64;
constexpr uint8_t OLED_I2C_ADDRESS                = 0x3C;
constexpr uint8_t DISPLAY_PAGE_DURATION_SEC       = 5;
constexpr uint16_t TFT_SCREEN_WIDTH               = 320;
constexpr uint16_t TFT_SCREEN_HEIGHT              = 240;
constexpr uint16_t TOUCH_MIN_HIT_TARGET_PX        = 44;      // Touch target tối thiểu 44px
constexpr uint16_t TOUCH_DEBOUNCE_MS              = 250;     // Chống rung phím cảm ứng

// Bảng màu Civic Tech High-Contrast (RGB565 16-bit)
constexpr uint16_t COLOR_CREAM_BG                 = 0xFFDE;  // Nền sáng kem #FDFBF7
constexpr uint16_t COLOR_INK_TEXT                 = 0x20C2;  // Chữ đậm mực #231B14
constexpr uint16_t COLOR_TEAL_PRIMARY             = 0x0B6C;  // Màu chính Teal #0D6F64
constexpr uint16_t COLOR_CRIMSON_VIOLATION        = 0x9923;  // Đỏ cảnh báo #9F241F
constexpr uint16_t COLOR_AMBER_ALERT              = 0xDBC0;  // Vàng cam hổ phách #D97706
constexpr uint16_t COLOR_CARD_BG                  = 0xF7BE;  // Nền thẻ sáng #F4EFE6
constexpr uint16_t COLOR_BORDER                   = 0xCE59;  // Đường viền thẻ #D1C7B7
constexpr uint16_t COLOR_WHITE                    = 0xFFFF;  // Trắng
constexpr uint16_t COLOR_MUTED_TEXT               = 0x632C;  // Chữ xám mờ #64748B

// ==========================================
// Cloud Backend Endpoints & QR Configuration
// ==========================================
#define API_BASE_URL_DEFAULT    "https://dust-guard-vn.hungphamphunguyen.workers.dev"
#define API_TELEMETRY_PATH_DEFAULT "/api/iot/telemetry"
#define API_REPORT_PATH         "/api/reports"
#define WEB_CASE_URL_PREFIX     "https://dust-guard-vn.hungphamphunguyen.workers.dev/cases/"

// ==========================================
// Network & NTP Configuration
// ==========================================
#define NTP_SERVER_1            "pool.ntp.org"
#define NTP_SERVER_2            "time.google.com"
#define NTP_SERVER_3            "time.cloudflare.com"
constexpr long GMT_OFFSET_SEC   = 25200;                     // GMT+7 Việt Nam (7 * 3600)
constexpr int  DAYLIGHT_OFFSET  = 0;

#endif // DUSTGUARD_CONFIG_H
