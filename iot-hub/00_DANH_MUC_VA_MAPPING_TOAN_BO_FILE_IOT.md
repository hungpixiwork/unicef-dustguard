# 🗺️ BẢN ĐỒ TỔNG THỂ CÁC FILE LIÊN QUAN TỚI IOT (SSOT MASTER MAPPING)

> **Dự án**: DustGuard VN — Trạm Quan Trắc Bụi Mịn Thời Gian Thực (APM2000 & ESP32)  
> **Chương trình**: Samsung Innovation Campus 2026 (Môn học: Vạn Vật Kết Nối - IoT)  
> **Sinh viên thực hiện**: Phạm Phú Nguyễn Hưng (MSSV: 26730023 — UIT CNTT)  
> **Giảng viên hướng dẫn**: TS. Nguyễn Văn Thái (Khoa Điện-Điện tử, HCM-UTE)  
> **Nhóm**: 11  

---

## 📌 Hướng Dẫn Nhanh Dành Cho Thuyết Trình
- **Muốn xem mã nguồn vi điều khiển ESP32**: Xem mục [1. Firmware & Driver](#1-firmware--driver-c-cho-esp32).
- **Muốn xem sơ đồ nối dây & ảnh linh kiện**: Xem mục [2. Sơ Đồ Phần Cứng & Mạch](#2-sơ-đồ-phần-cứng--mạch-nối-dây).
- **Muốn xem cách Backend nhận dữ liệu từ cảm biến**: Xem mục [3. Backend & Cloudflare D1](#3-backend-cloudflare-worker--cơ-sở-dữ-liệu-d1).
- **Muốn mở giao diện Web hiển thị số liệu**: Xem mục [4. Giao Diện Web Dashboard](#4-giao-diện-web-dashboard--giao-diện-giám-sát).
- **Muốn bật Demo chạy thử cho Thầy/Hội đồng xem**: Xem mục [6. Công Cụ Giả Lập & Script Demo](#6-công-cụ-giả-lập-chạy-thử--script-demo).

---

## 1. Firmware & Driver C++ Cho ESP32
Nằm tại thư mục: `iot/dustguard-node/firmware/`

| STT | File | Mô tả chi tiết chức năng |
|:---:|:---|:---|
| 1 | [platformio.ini](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/platformio.ini) | File cấu hình PlatformIO: Khai báo board `esp32dev`, baud rate `115200`, thư viện `TFT_eSPI`, `XPT2046_Touchscreen`, `ArduinoJson`, cờ tối ưu hóa C++17. |
| 2 | [main.cpp](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/src/main.cpp) | Vòng lặp chính vi điều khiển: Khởi tạo phần cứng (UART2, SPI TFT, Touch), quản lý máy trạng thái (State Machine), điều phối đọc cảm biến 2s/lần và gửi Cloud 5s/lần. |
| 3 | [apm2000.cpp](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/src/apm2000.cpp) / [apm2000.h](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/include/apm2000.h) | Driver cảm biến quang học laser ASAIR APM2000: Đọc luồng UART 9600 baud, kiểm tra checksum 32 bytes, phân giải chỉ số bụi PM1.0, PM2.5, PM10. |
| 4 | [ui_manager.cpp](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/src/ui/ui_manager.cpp) / [ui_manager.h](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/include/ui_manager.h) | Bộ điều khiển giao diện cảm ứng 3.5" TFT (480x320): Quản lý 6 màn hình (Home, Biểu đồ lịch sử, Thông số thiết bị, Chẩn đoán UART cảm biến, Thông tin đề tài). |
| 5 | [wifi_service.cpp](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/src/wifi_service.cpp) / [wifi_service.h](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/include/wifi_service.h) | Bộ quản lý kết nối Wi-Fi non-blocking: Tự động reconnect khi mất sóng, duy trì trạng thái sóng RSSI, không làm nghẽn chu kỳ đọc cảm biến. |
| 6 | [api.cpp](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/src/api.cpp) / [api.h](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/include/api.h) | Client REST API: Ký chữ ký số HMAC-SHA256 chống giả mạo, tích hợp hàng đợi đệm (Offline Buffer Ring) chống mất dữ liệu khi rớt mạng. |
| 7 | [config.h](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/include/config.h) / [config.example.h](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/include/config.example.h) | File khai báo chân GPIO kết nối, URL Cloud Server, Device ID (`DG-IOT-001`), ngưỡng cảnh báo chất lượng không khí QCVN 05:2023. |
| 8 | [types.h](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/include/types.h) | Khai báo cấu trúc dữ liệu chung `DeviceState`, `SensorData`, `AqiLevel`, bộ đệm đồ thị 60 điểm Circular Buffer. |

---

## 2. Sơ Đồ Phần Cứng & Mạch Nối Dây
Tập hợp tại: `iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/` và `iot/dustguard-node/docs/`

| STT | File | Mô tả chi tiết chức năng |
|:---:|:---|:---|
| 1 | [wiring.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/docs/wiring.md) | Bảng tra cứu sơ đồ nối chân chi tiết: ESP32 sang Cảm biến APM2000 (UART), ESP32 sang Màn hình cảm ứng TFT LCD 3.5" (SPI + XPT2046), bảng kê linh kiện BOM chi phí ~490.000 VNĐ. |
| 2 | [iot-exploded.svg](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/iot-exploded.svg) | Sơ đồ đồ họa bóc tách từng lớp linh kiện trạm IoT (Vỏ bảo vệ, ESP32, APM2000, Màn hình, Nguồn cấp) dạng Exploded View chất lượng cao. |
| 3 | [iot-node-isometric.svg](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/iot-node-isometric.svg) | Phối cảnh 3D không gian (Isometric) toàn bộ hộp thiết bị trạm đo ngoài hiện trường, có hiển thị màn hình và luồng đối lưu không khí. |
| 4 | [prototype.png](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/prototype.png) | Ảnh chụp mô hình sản phẩm mẫu thực tế chạy kiểm thử trong phòng lab. |
| 5 | [apm2000.png](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/apm2000.png) / [apm2000.svg](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/apm2000.svg) | Hình ảnh chi tiết cảm biến laser đo bụi mịn ASAIR APM2000. |
| 6 | [esp32.png](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/esp32.png) | Hình ảnh mạch điều khiển trung tâm ESP32-WROOM-32D Dual Core. |
| 7 | [oled-ssd1306.png](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/oled-ssd1306.png) | Hình ảnh module màn hình hiển thị số liệu trực quan tại chỗ. |

---

## 3. Backend (Cloudflare Worker) & Cơ Sở Dữ Liệu D1
Nằm tại: `server/`, `migrations/`, `app/server/`

| STT | File | Mô tả chi tiết chức năng |
|:---:|:---|:---|
| 1 | [server/iot.ts](file:///d:/07-Competitions-Hackathons/unicef-dustguard/server/iot.ts) | Backend REST API chính trên Cloudflare Worker: Nhận payload Telemetry POST từ trạm đo, xác thực HMAC, ghi dữ liệu vào SQLite D1, cung cấp endpoint GET `/api/iot/latest` và `/api/iot/history`. |
| 2 | [server/iot-live-state.ts](file:///d:/07-Competitions-Hackathons/unicef-dustguard/server/iot-live-state.ts) | Trình quản lý trạng thái thời gian thực trong RAM Worker: Lưu trữ gói tin mới nhất tức thì, loại bỏ độ trễ truy vấn và chống nghẽn D1 khi hàng trăm trạm gửi dữ liệu đồng thời. |
| 3 | [migrations/0006_iot_telemetry.sql](file:///d:/07-Competitions-Hackathons/unicef-dustguard/migrations/0006_iot_telemetry.sql) | D1 SQL Migration: Định nghĩa cấu trúc bảng thiết bị `iot_devices` và bảng lưu mẫu đo `iot_readings` (chỉ mục composite index thời gian và mã trạm để truy vấn siêu tốc). |
| 4 | [app/server/routes/worker/iot.routes.js](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/server/routes/worker/iot.routes.js) | Router điều hướng API tiếp nhận và xử lý dữ liệu trạm IoT trong ứng dụng Node/Worker. |
| 5 | [app/server/domain/sensors/sensor.rules.js](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/server/domain/sensors/sensor.rules.js) | Bộ quy chuẩn nghiệp vụ môi trường: Phân loại AQI theo QCVN 05:2023, lọc nhiễu, chặn giá trị ảo/âm/quá giới hạn vật lý. |
| 6 | [app/server/domain/sensors/data-quality.engine.js](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/server/domain/sensors/data-quality.engine.js) | Động cơ đánh giá chất lượng số liệu (Data Quality Score): Nhận diện trôi cảm biến (sensor drift), kẹt số liệu hoặc mất tín hiệu quang học. |

---

## 4. Giao Diện Web Dashboard & Giao Diện Giám Sát
Nằm tại: `app/src/modules/`

| STT | File | Mô tả chi tiết chức năng |
|:---:|:---|:---|
| 1 | [IoTDashboard.jsx](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/src/modules/iot/IoTDashboard.jsx) | **Trang Dashboard IoT chính (`/iot`)**: Bảng điều khiển thời gian thực hiển thị chỉ số PM2.5, PM10, PM1.0, biểu đồ xu hướng 24h, danh sách trạm hoạt động, trạng thái kết nối và chất lượng không khí. |
| 2 | [IoTDemo.jsx](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/src/modules/public/IoTDemo.jsx) | **Trang Bìa Thuyết Trình Samsung SIC 2026 (`/sic`)**: Giới thiệu đề tài, thông tin sinh viên UIT, Giảng viên HD TS. Nguyễn Văn Thái, nhóm 11, các link proposal Canva, bảng BOM và nút bấm vào hệ thống trực tiếp. |
| 3 | [SamsungCoverScreen.jsx](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/src/modules/iot/SamsungCoverScreen.jsx) | Giao diện tiện ích chuyên biệt mô phỏng màn hình ngoài Galaxy Z Flip / Smartwatch hiển thị nhanh chỉ số bụi và cảnh báo đeo khẩu trang. |
| 4 | [SensorGuide.jsx](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/src/modules/public/SensorGuide.jsx) | **Trang Cẩm Nang Cảm Biến (`/sensor-guide`)**: Tài liệu trực quan giải thích nguyên lý tán xạ laser của APM2000, quy chuẩn QCVN và cách bảo dưỡng trạm đo. |
| 5 | [IoTSetupModal.jsx](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/src/modules/staff/components/IoTSetupModal.jsx) | Modal dành cho Cán bộ / Kỹ thuật viên hiện trường kích hoạt và gán tọa độ GPS cho trạm đo mới. |
| 6 | [telemetryService.js](file:///d:/07-Competitions-Hackathons/unicef-dustguard/app/src/services/telemetryService.js) | Service tầng Frontend phụ trách kết nối API lấy dữ liệu trạm IoT, polling tự động cập nhật số liệu mỗi 3 giây. |

---

## 5. Tài Liệu Thuyết Trình, Kiến Trúc & Báo Cáo
Tập hợp tại: `iot-hub/` và `iot/dustguard-node/docs/`

| STT | File | Mô tả chi tiết chức năng |
|:---:|:---|:---|
| 1 | [01_KICH_BAN_THUYET_TRINH_5_PHUT.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/01_KICH_BAN_THUYET_TRINH_5_PHUT.md) | **Kịch bản thuyết trình từng phút (0:00 - 5:00)**: Lời thoại mẫu, các thao tác bấm trực tiếp trên màn hình cảm ứng, cách đối chứng số liệu với Web và kịch bản trả lời phản biện của Hội đồng SIC 2026. |
| 2 | [architecture.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/docs/architecture.md) | Tài liệu kiến trúc toàn diện: Sơ đồ luồng dữ liệu 4 tầng (Hardware -> Firmware -> Cloud Server -> Web Dashboard), mô hình phân quyền và cơ chế bảo mật. |
| 3 | [api-contract.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/docs/api-contract.md) | Đặc tả kỹ thuật chuẩn của các gói tin JSON gửi lên server, định dạng chữ ký HMAC-SHA256, mã phản hồi HTTP và chuẩn lỗi RFC 7807. |
| 4 | [flashing-guide.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/docs/flashing-guide.md) | Hướng dẫn từng bước cấu hình PlatformIO, nạp firmware qua cáp Type-C/MicroUSB vào ESP32 và khắc phục lỗi cổng COM. |
| 5 | [demo-script.md](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/docs/demo-script.md) | Kịch bản demo kỹ thuật gốc tại phòng thí nghiệm. |

---

## 6. Công Cụ Giả Lập Chạy Thử & Script Demo
Tập hợp tại: `iot-hub/`, `scripts/`, `iot/dustguard-node/tools/`

| STT | File | Cách chạy / Chức năng |
|:---:|:---|:---|
| 1 | [CHAY_DEMO_TOUCHSCREEN_SIMULATOR.bat](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot-hub/CHAY_DEMO_TOUCHSCREEN_SIMULATOR.bat) | **1 Click Khởi Động Simulator Cảm Ứng**: Chạy trình giả lập màn hình cảm ứng TFT 3.5" tại cổng `http://localhost:3456`, thao tác chạm ngón tay y hệt trên mạch thật để trình chiếu màn hình lớn. |
| 2 | [scripts/touchscreen-simulator.mjs](file:///d:/07-Competitions-Hackathons/unicef-dustguard/scripts/touchscreen-simulator.mjs) | Mã nguồn máy chủ Node.js phục vụ màn hình cảm ứng tương tác thời gian thực 480x320 px (Home, Chart, Device, Sensor Diagnostics, About SIC 2026). |
| 3 | [iot/dustguard-node/tools/mock-sensor.py](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/tools/mock-sensor.py) | Script Python giả lập cảm biến: Bắn liên tục các gói tin PM2.5, PM10 có chữ ký số lên Cloud Server để test luồng dữ liệu khi không có mạch vật lý. |
| 4 | [iot/dustguard-node/tools/serial-monitor.py](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/tools/serial-monitor.py) | Script Python theo dõi và đọc log thời gian thực từ cổng COM nối với ESP32. |
| 5 | [iot/dustguard-node/tools/api-test.py](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/tools/api-test.py) | Script kiểm thử tính hợp lệ của chữ ký HMAC và định dạng JSON của API tiếp nhận. |
| 6 | [tests/iot-realtime-telemetry.test.js](file:///d:/07-Competitions-Hackathons/unicef-dustguard/tests/iot-realtime-telemetry.test.js) | Bộ kiểm thử tự động kiểm tra tính bất biến (Invariant): Dữ liệu thật không mock, lưu trữ bền vững vào D1, cửa sổ 30s tính Online/Offline. |
| 7 | [tests/touchscreen-firmware-acceptance.test.js](file:///d:/07-Competitions-Hackathons/unicef-dustguard/tests/touchscreen-firmware-acceptance.test.js) | Bộ kiểm thử nghiệm thu 6 màn hình cảm ứng của firmware đảm bảo đầy đủ tiêu chí hội đồng. |

---

## 🎯 Tóm Tắt Khi Thuyết Trình Hội Đồng SIC 2026
1. **Mở Simulator Màn Hình Cảm Ứng**: Bấm vào file `CHAY_DEMO_TOUCHSCREEN_SIMULATOR.bat` -> Trình duyệt mở `http://localhost:3456`.
2. **Mở Web Dashboard Đối Chứng**: Truy cập `http://localhost:5173/sic` rồi bấm sang `/iot` để chứng minh số liệu đồng bộ 100% thời gian thực.
3. **Mở Sơ Đồ Thiết Kế & Linh Kiện**: Chiếu trực tiếp các file trong thư mục `iot-hub/02_SO_DO_PHAN_CUNG_VA_LINH_KIEN/`.
4. **Trả Lời Phản Biện Kỹ Thuật**: Tra cứu câu trả lời chuẩn tại file `01_KICH_BAN_THUYET_TRINH_5_PHUT.md`.
