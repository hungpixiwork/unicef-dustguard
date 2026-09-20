# Kiến Trúc Hệ Thống DustGuard IoT Node & Touchscreen

## 1. Tổng Quan Kiến Trúc
Hệ thống **DustGuard IoT Node** là trạm quan trắc hiện trường phục vụ chương trình **Samsung Innovation Campus 2026** (Đề tài Final Project, STT: 11).

- **Tác giả**: Phạm Phú Nguyễn Hưng (MSSV: 26730023 — Đại học Công nghệ Thông tin, ĐHQG-HCM / UIT)
- **Giảng viên hướng dẫn**: TS. Nguyễn Văn Thái (Khoa Điện - Điện tử, HCM-UTE)
- **Mã thiết bị chuẩn**: `DG-NODE-011`
- **Cảm biến**: ASAIR APM2000 (Laser Particle Sensor)
- **Vi điều khiển**: ESP32 DevKit V1 (38 pins, 240MHz, Wi-Fi 802.11 b/g/n)
- **Màn hình**: 3.5" Color TFT Touchscreen (480x320 Landscape, ILI9488 + XPT2046)

---

## 2. Sơ Đồ Luồng Dữ Liệu (End-to-End Pipeline)

```text
[Cảm Biến Bụi Laser APM2000]
            ↓ UART2 (9600 bps, 32-byte frame)
[ESP32 HardwareSerial Driver]
            ↓
[Sensor Service (Validation & Checksum)]
            ↓
[Shared DeviceState Model] 
    ├──→ [Touchscreen UI Engine (480x320)]
    │       ├─ Screen 1: Home / Live (PM2.5 Dominant + Alert Banner)
    │       ├─ Screen 2: Live Chart (Circular Buffer 60 samples)
    │       ├─ Screen 3: Device Telemetry & Actions
    │       ├─ Screen 4: Sensor Diagnostics (UART frame stats)
    │       ├─ Screen 5: Network & Cloud Queue
    │       └─ Screen 6: About (Samsung SIC 2026 & UIT info)
    │
    └──→ [Cloud Upload Service]
            ↓ HTTPS POST (HMAC-SHA256 Sign + Secret)
[Cloudflare Worker /api/iot/v1/readings]
            ↓
[Cloudflare D1 Database (iot_readings & iot_devices)]
            ↓
[DustGuard Web Dashboard /iot]
    ├─ Live Telemetry Cards & QCVN 05:2023 Air Status
    ├─ Time-series Chart
    └─ Dust Risk Score Integration (Hỗ trợ thanh tra)
```

---

## 3. Mô Hình Dữ Liệu Trọng Tâm (`DeviceState`)
Giao diện người dùng trên ESP32 **tuyệt đối không truy cập trực tiếp vào phần cứng cảm biến hay socket Wi-Fi**, mà thông qua mô hình trạng thái tập trung `DeviceState`:

```cpp
struct DeviceState {
    float pm1;
    float pm25;
    float pm10;
    AirStatus airStatus;

    bool sensorConnected;
    uint32_t sensorLastReadSecondsAgo;
    uint32_t validFrames;
    uint32_t invalidFrames;

    bool wifiConnected;
    int wifiRSSI;
    char ipAddress[20];

    bool cloudConnected;
    int pendingUploads;
    int readingsSent;
    int failedUploads;
};
```

---

## 4. Cơ Chế Xử Lý Lỗi & Mất Kết Nối (Offline Resilience)
1. **Mất Wi-Fi**: Node tiếp tục đo đạc bình thường theo chu kỳ 2 giây/lần.
2. **Offline Buffer**: Các mẫu đo định kỳ 15 giây được đưa vào hàng đợi SRAM `_queue` (tối đa 30 mẫu).
3. **Phục hồi**: Khi Wi-Fi có trở lại, hệ thống tự động tải các bản ghi cũ nhất lên trước (FIFO / Oldest-first) mà không làm mất mát chuỗi dữ liệu.
