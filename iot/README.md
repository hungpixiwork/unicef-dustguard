# 🌱 DUSTGUARD VN — HỆ THỐNG QUAN TRẮC IOT THỜI GIAN THỰC

> **Chương trình**: Samsung Innovation Campus 2026 (Môn học: Vạn Vật Kết Nối - IoT)  
> **Sinh viên**: Phạm Phú Nguyễn Hưng (MSSV: 26730023 — UIT CNTT)  
> **GVHD**: TS. Nguyễn Văn Thái (HCM-UTE)  
> **Nhóm**: 11  

---

## ⚡ TRUNG TÂM TÀI LIỆU & THUYẾT TRÌNH (IOT HUB)
Toàn bộ tài liệu tổng hợp, kịch bản thuyết trình, sơ đồ mạch bóc tách 3D và các công cụ giả lập đã được mapping tại:
👉 **[THƯ MỤC IOT-HUB](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/00_DANH_MUC_VA_MAPPING_TOAN_BO_FILE_IOT.md)**

| Tài Liệu / Công Cụ | Mục Đích |
|---|---|
| 🗺️ **[00_DANH_MUC_VA_MAPPING_TOAN_BO_FILE_IOT.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/00_DANH_MUC_VA_MAPPING_TOAN_BO_FILE_IOT.md)** | Bảng tra cứu SSOT toàn bộ 45+ file IoT trong dự án (Firmware, Hardware, Cloud, Web, Scripts) |
| 🎤 **[01_KICH_BAN_THUYET_TRINH_5_PHUT.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/01_KICH_BAN_THUYET_TRINH_5_PHUT.md)** | Kịch bản trình diễn 5 phút chuẩn Hội đồng Samsung Innovation Campus |
| 🖼️ **[02_SO_DO_PHAN_CUNG_VA_LINH_KIEN](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN)** | Thư mục chứa toàn bộ sơ đồ mạch bóc tách 3D (Exploded view), Isometric, ảnh APM2000, ESP32 |
| 🏗️ **[03_KIEN_TRUC_HE_THONG_VA_API_CONTRACT.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/03_KIEN_TRUC_HE_THONG_VA_API_CONTRACT.md)** | Luồng dữ liệu 4 tầng, định dạng chữ ký HMAC-SHA256 và cấu trúc bảng D1 SQLite |
| 🚀 **[04_HUONG_DAN_CHAY_DEMO_THUC_TE.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/04_HUONG_DAN_CHAY_DEMO_THUC_TE.md)** | 3 Kịch bản demo: Trên máy tính (Simulator), Trên bo mạch thật, Chạy test tự động |
| ⚙️ **[05_QUY_TRINH_NAP_FIRMWARE_ESP32.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/05_QUY_TRINH_NAP_FIRMWARE_ESP32.md)** | Hướng dẫn nạp code PlatformIO C++ lên mạch ESP32 |
| 🖥️ **[CHAY_DEMO_TOUCHSCREEN_SIMULATOR.bat](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/CHAY_DEMO_TOUCHSCREEN_SIMULATOR.bat)** | Click đúp để khởi động trình giả lập màn hình cảm ứng 3.5" (Port 3456) |

---

## 📂 CẤU TRÚC THƯ MỤC GỐC IOT
```text
iot/
├── dustguard-node/
│   ├── firmware/       # Mã nguồn C++17 PlatformIO ESP32 (main.cpp, apm2000.cpp, ui_manager.cpp...)
│   ├── docs/           # Tài liệu kỹ thuật chi tiết (wiring.md, architecture.md, api-contract.md...)
│   ├── tools/          # Python tools (serial-monitor.py, mock-sensor.py, api-test.py)
│   └── README.md       # Thông tin module trạm đo
└── README.md           # Chỉ mục tổng quan trỏ tới iot-hub/
```
