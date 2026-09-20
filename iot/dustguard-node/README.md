# DustGuard VN — IoT Node (Samsung Innovation Campus 2026)

## Thông Tin Đề Tài & Nhóm Nghiên Cứu
- **Chương trình**: SAMSUNG INNOVATION CAMPUS 2026
- **Tên môn học**: VẠN VẬT KẾT NỐI - IoT (Internet-of-Things)
- **Đơn vị đào tạo**: Khoa Điện-Điện tử, Trường ĐH Sư phạm Kỹ thuật TP.HCM (HCM-UTE)
- **Sinh viên thực hiện**: **Phạm Phú Nguyễn Hưng** (MSSV: **26730023**)
- **Trường**: Trường Đại học Công nghệ Thông tin — ĐHQG-HCM (UIT)
- **Ngành**: Công nghệ Thông tin (CNTT)
- **Giảng viên hướng dẫn**: **TS. Nguyễn Văn Thái**
- **Số thứ tự nhóm**: **11**
- **Proposal dự án Dustguard VN**: [Canva Proposal](https://canva.link/zrxjws8ylb3jveg)
- **Proposal dự án Final IoT**: [Canva Final IoT](https://canva.link/3kswki81kf56as0)
- **Bảng kê chi phí phần cứng**: [Google Docs BOM](https://docs.google.com/document/d/1DtNC5yPBZkKnLTflUUiNYxQdsdP2JswhhtRR0M76Pqo/edit?usp=sharing) (~490.000 VNĐ / Node)

---

## 1. Cấu Trúc Module IoT

```text
iot/dustguard-node/
├── firmware/                  # Mã nguồn C++17 PlatformIO cho ESP32
│   ├── platformio.ini         # Cấu hình PlatformIO, TFT_eSPI, XPT2046, ArduinoJson
│   ├── include/
│   │   ├── config.h           # Cấu hình chân, ngưỡng QCVN 05:2023, Wi-Fi & Secret
│   │   ├── types.h            # Centralized DeviceState model
│   │   ├── apm2000.h          # Driver cảm biến laser APM2000
│   │   ├── wifi.h             # Quản lý kết nối Wi-Fi non-blocking
│   │   ├── api.h              # Client REST API, HMAC-SHA256 & offline queue
│   │   └── ui_manager.h       # Bộ điều phối Touchscreen UI 480x320
│   └── src/
│       ├── main.cpp           # Setup & State Machine loop
│       ├── apm2000.cpp        # Đọc giải mã 32 bytes UART 9600 baud
│       ├── wifi.cpp           # Kết nối & tự động phục hồi kết nối
│       ├── api.cpp            # Ký HMAC-SHA256 và lưu đệm khi mất mạng
│       └── ui/
│           └── ui_manager.cpp # 6 màn hình cảm ứng: Home, Chart, Device, Sensor, Network, About
│
├── docs/                      # Tài liệu kỹ thuật chi tiết
│   ├── architecture.md        # Kiến trúc luồng dữ liệu và thiết kế module
│   ├── wiring.md              # Sơ đồ kết nối dây phần cứng và bảng BOM
│   ├── api-contract.md        # Đặc tả API, chuẩn RFC 7807 và chữ ký bảo mật
│   ├── flashing-guide.md      # Hướng dẫn nạp code PlatformIO
│   └── demo-script.md         # Kịch bản demo thực tế trước hội đồng
│
├── tools/                     # Công cụ Python hỗ trợ
│   ├── serial-monitor.py      # Đọc cổng COM UART trực tiếp
│   ├── api-test.py            # Kiểm thử đẩy dữ liệu HMAC lên API
│   └── mock-sensor.py         # Giả lập mẫu đo cho môi trường dev
└── README.md
```

---

## 2. Hướng Dẫn Khởi Động Nhanh Trong 3 Bước

### Bước 1: Kết Nối Phần Cứng
- Cảm biến **APM2000**: Nối TX vào GPIO16 (RX2), VCC vào 5V, GND vào GND, SET vào 3.3V.
- Màn hình cảm ứng **3.5" TFT Touch**: Nối theo bảng chi tiết tại [wiring.md](docs/wiring.md).

### Bước 2: Nạp Firmware
Tại thư mục `iot/dustguard-node/firmware/`:
```powershell
pio run -e esp32_tft_touch --target upload
```

### Bước 3: Quan Sát Kết Quả
1. Trên màn hình cảm ứng 3.5": Số liệu PM2.5 to rõ nét, biểu đồ chuỗi thời gian, icon WiFi và Cloud màu xanh lục.
2. Trên máy tính: Mở trình duyệt truy cập `http://localhost:3000/sic` (Trang bìa môn học) và `http://localhost:3000/iot` (Dashboard giám sát thời gian thực).
