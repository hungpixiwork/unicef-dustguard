#ifndef DUSTGUARD_TYPES_H
#define DUSTGUARD_TYPES_H

#include <stdint.h>
#include <stddef.h>

/**
 * @brief DỮ LIỆU ĐO TRỰC TIẾP (MEASURED DATA - SSOT)
 * Chỉ đo từ cảm biến thật APM2000. Tuyệt đối không mock hay bịa đặt.
 */
struct SensorReading {
    float pm1;          // PM1.0 (µg/m³)
    float pm25;         // PM2.5 (µg/m³)
    float pm10;         // PM10 (µg/m³)
    uint64_t timestamp; // Epoch millisecond UTC
    bool valid;         // Tính hợp lệ của frame dữ liệu

    SensorReading() : pm1(0.0f), pm25(0.0f), pm10(0.0f), timestamp(0), valid(false) {}
};

// Tương thích ngược với code cũ
typedef SensorReading DustReading;

/**
 * @brief Chuẩn tính toán AQI
 */
enum class AqiStandard : uint8_t {
    VN_QCVN, // Chuẩn Việt Nam QCVN 05:2023/BTNM
    US_EPA   // Chuẩn Hoa Kỳ US EPA
};

/**
 * @brief Xu hướng thay đổi nồng độ bụi
 */
enum class TrendState : uint8_t {
    STABLE,     // Ổn định
    INCREASING, // Đang tăng
    RAPID_RISE, // Tăng nhanh đột biến
    DECREASING  // Đang giảm
};

/**
 * @brief Cấp độ cảnh báo sự kiện bụi (Dust Event Severity)
 */
enum class DustEventSeverity : uint8_t {
    NORMAL,         // Bình thường
    ELEVATED,       // Mức tăng vừa
    HIGH_LEVEL,     // Mức cao
    SPIKE,          // Đột biến tức thì (Spike)
    SUSTAINED_HIGH  // Cao liên tục kéo dài
};

/**
 * @brief DỮ LIỆU SUY DIỄN (DERIVED METRICS)
 * Toàn bộ tính toán trên cơ sở số liệu PM đo thật. Ghi nhãn "Derived" trên UI.
 */
struct DerivedMetrics {
    uint16_t aqi;                   // Chỉ số AQI tính toán
    char aqiCategory[32];           // Thể loại: Tốt, Trung bình, Kém, Xấu, Rất xấu, Nguy hại
    char dominantPollutant[16];     // Tác nhân chính: "PM2.5" hoặc "PM10"
    
    float pm25Pm10Ratio;            // Tỷ lệ PM2.5 / PM10 (0.0 - 1.0)
    float pm1Pm25Ratio;             // Tỷ lệ PM1.0 / PM2.5 (0.0 - 1.0)
    
    // Cấu trúc phân đoạn kích thước bụi (Particle Composition)
    float pm1Fraction;              // PM1 (µg/m³)
    float pm1To25Fraction;          // max(PM2.5 - PM1, 0)
    float pm25To10Fraction;         // max(PM10 - PM2.5, 0)
    
    float pm25Avg1m;                // Trung bình trượt 1 phút
    float pm25Avg5m;                // Trung bình trượt 5 phút
    float pm10Avg5m;                // Trung bình trượt PM10 5 phút
    float currentVsAvg5mPercent;    // % chênh lệch so với TB 5 phút (+/- %)
    
    float rateOfChange;             // Tốc độ biến thiên: ΔPM2.5 / phút (µg/m³/min)
    TrendState trend;               // Trạng thái xu hướng
    
    float peakPm25;                 // Đỉnh PM2.5 trong phiên
    float peakPm10;                 // Đỉnh PM10 trong phiên
    char peakTimeStr[16];           // Thời điểm đỉnh: "19:21:35"
    
    float exposureIndex;            // Chỉ số phơi nhiễm tích lũy: Σ (PM2.5 × Δt)
    
    DustEventSeverity eventState;   // Trạng thái sự kiện bụi
    char eventDescription[64];      // Mô tả sự kiện ngắn gọn

    DerivedMetrics() : 
        aqi(0),
        pm25Pm10Ratio(0.0f),
        pm1Pm25Ratio(0.0f),
        pm1Fraction(0.0f),
        pm1To25Fraction(0.0f),
        pm25To10Fraction(0.0f),
        pm25Avg1m(0.0f),
        pm25Avg5m(0.0f),
        pm10Avg5m(0.0f),
        currentVsAvg5mPercent(0.0f),
        rateOfChange(0.0f),
        trend(TrendState::STABLE),
        peakPm25(0.0f),
        peakPm10(0.0f),
        exposureIndex(0.0f),
        eventState(DustEventSeverity::NORMAL) {
        aqiCategory[0] = '\0';
        dominantPollutant[0] = '\0';
        peakTimeStr[0] = '\0';
        eventDescription[0] = '\0';
    }
};

/**
 * @brief Trạng thái hoạt động của thiết bị IoT Node
 */
enum class DeviceState : uint8_t {
    BOOTING,            // Đang khởi động hệ thống
    CONNECTING_WIFI,    // Đang kết nối mạng không dây
    ONLINE,             // Hoạt động bình thường, kết nối đám mây thông suốt
    OFFLINE,            // Mất kết nối Wi-Fi/Internet (chế độ độc lập)
    SENSOR_FAULT,       // Lỗi cảm biến APM2000 (mất tín hiệu / checksum sai liên tiếp)
    API_ERROR           // Lỗi phản hồi API Cloud (401/403/500/Timeout)
};

/**
 * @brief Trạng thái mạng và thống kê truyền tin
 */
struct NetworkStatus {
    bool wifiConnected;
    int8_t wifiRssi;
    bool ntpSynced;
    bool cloudOnline;
    uint32_t lastUploadTime;
    uint32_t uploadSuccessCount;
    uint32_t uploadFailCount;
    uint32_t consecutiveFailures;
    uint32_t currentRetryDelayMs;

    NetworkStatus() : 
        wifiConnected(false),
        wifiRssi(-100),
        ntpSynced(false),
        cloudOnline(false),
        lastUploadTime(0),
        uploadSuccessCount(0),
        uploadFailCount(0),
        consecutiveFailures(0),
        currentRetryDelayMs(5000) {}
};

/**
 * @brief TELEMETRY VÀ SỨC KHỎE THIẾT BỊ (DEVICE TELEMETRY)
 */
struct DeviceStatus {
    char deviceId[32];
    char firmwareVersion[16];
    bool wifiConnected;
    char wifiSsid[32];
    int8_t wifiRssi;
    char ipAddress[24];
    bool cloudConnected;
    bool sensorConnected;
    uint32_t uptimeSeconds;
    uint32_t freeHeap;
    uint32_t sampleCount;
    float lastSampleAgeSec;
    float lastCloudSyncAgeSec;
    uint32_t invalidFrameCount;
    bool flatlineDetected;
    char powerSource[20]; // "USB / External" (Không mock pin)

    DeviceStatus() :
        wifiConnected(false),
        wifiRssi(-100),
        cloudConnected(false),
        sensorConnected(false),
        uptimeSeconds(0),
        freeHeap(0),
        sampleCount(0),
        lastSampleAgeSec(999.0f),
        lastCloudSyncAgeSec(999.0f),
        invalidFrameCount(0),
        flatlineDetected(false) {
        deviceId[0] = '\0';
        firmwareVersion[0] = '\0';
        wifiSsid[0] = '\0';
        ipAddress[0] = '\0';
        powerSource[0] = '\0';
    }
};

/**
 * @brief Dữ liệu hồ sơ tạo phản ánh và mã QR (Case Handoff)
 */
struct CaseHandoffData {
    char caseId[40];        // ID database: "cas_..."
    char caseCode[32];      // Mã vụ việc chuẩn: "DG-C-2026-0842"
    char statusText[32];    // "Đã tiếp nhận"
    char qrUrl[160];        // "https://dustguard.vn/cases/cas_..."
    char createdAt[32];     // ISO String
    bool isCreated;         // Cờ xác nhận đã tạo thành công
    bool isCreating;        // Đang gọi API

    CaseHandoffData() : isCreated(false), isCreating(false) {
        caseId[0] = '\0';
        caseCode[0] = '\0';
        statusText[0] = '\0';
        qrUrl[0] = '\0';
        createdAt[0] = '\0';
    }
};

/**
 * @brief Gói tin Telemetry gửi lên máy chủ DustGuard
 */
struct TelemetryPacket {
    char sensorCode[32];
    float pm10;
    float pm25;
    char isoTimestamp[32];
    char signature[65];
    bool valid;

    TelemetryPacket() : pm10(0.0f), pm25(0.0f), valid(false) {
        sensorCode[0] = '\0';
        isoTimestamp[0] = '\0';
        signature[0] = '\0';
    }
};

/**
 * @brief Thống kê sức khỏe thiết bị
 */
struct HealthMetrics {
    uint32_t freeHeapBytes;
    uint32_t minFreeHeapBytes;
    uint32_t uptimeSeconds;
    int8_t wifiRssi;
    uint8_t bufferUsage;
    bool flatlineSuspected;
};

#endif // DUSTGUARD_TYPES_H
