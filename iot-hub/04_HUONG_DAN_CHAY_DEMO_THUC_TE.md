# 🚀 HƯỚNG DẪN CHẠY DEMO THỰC TẾ TRƯỚC HỘI ĐỒNG (LIVE DEMO GUIDE)

> Dành cho buổi thuyết trình trước **TS. Nguyễn Văn Thái** và Hội đồng **Samsung Innovation Campus 2026**.

---

## 💻 KỊCH BẢN 1: THUYẾT TRÌNH TRÊN MÁY TÍNH (KHÔNG CẦN CẮM MẠCH VẬT LÝ)
*Phù hợp khi trình chiếu máy chiếu trên giảng đường hoặc báo cáo qua màn hình lớn.*

### Bước 1: Khởi động Trình Giả Lập Màn Hình Cảm Ứng 3.5" (Touchscreen Simulator)
- Mở thư mục `iot-hub/` và **click đúp** vào file:
  ```text
  CHAY_DEMO_TOUCHSCREEN_SIMULATOR.bat
  ```
  *(Hoặc chạy lệnh PowerShell: `node scripts/touchscreen-simulator.mjs`)*
- Trình duyệt sẽ tự động bật lên địa chỉ `http://localhost:3456`.
- **Thao tác biểu diễn**:
  - Dùng chuột nhấn vào các tab cảm ứng bên dưới: `HOME` -> `CHART` -> `DEVICE` -> `MORE` -> `ABOUT`.
  - Nhấn nút **[SYNC NOW]** để kích hoạt gửi gói tin ngay lập tức.
  - Chạm vào đồ thị để chuyển đổi giữa `PM2.5`, `PM10` và `PM1.0`.

### Bước 2: Mở Web Dashboard để Đối Chứng Số Liệu Thời Gian Thực
- Click đúp vào file `MO_WEB_DASHBOARD_IOT.bat` (hoặc mở URL: [https://dustguard.phamphunguyenhung.com/sic](https://dustguard.phamphunguyenhung.com/sic)).
- Từ trang `/sic`, bấm nút lớn **"VÀO HỆ THỐNG CHÍNH DUSTGUARD IOT"** để mở `/iot`.
- **Điểm nhấn thuyết trình**: Chỉ số PM2.5 trên màn hình cảm ứng mô phỏng và trên Web Dashboard của hệ thống trùng khớp nhau 100%!

### Bước 3: Bơm Dữ Liệu Cảm Biến Giả Lập (Tùy chọn)
Nếu muốn số liệu PM2.5 nhảy liên tục ngẫu nhiên trước mắt hội đồng:
Mở PowerShell chạy lệnh:
```powershell
python iot/dustguard-node/tools/mock-sensor.py
```

---

## ⚡ KỊCH BẢN 2: TRÌNH DIỄN VỚI BO MẠCH THẬT (ESP32 + APM2000 + TFT)
*Phù hợp khi đem bo mạch vật lý đến bàn chấm thi.*

### Bước 1: Chuẩn bị
1. Cắm cáp nguồn USB từ laptop vào bo mạch ESP32.
2. Bật Hotspot Wi-Fi trên điện thoại với thông tin đã cấu hình trong `config.h` (hoặc Wi-Fi phòng lab).
3. Màn hình 3.5" TFT trên trạm sẽ sáng lên, icon Wi-Fi chuyển sang xanh lá cây.

### Bước 2: Giám sát Log Serial Cổng COM (Nếu Thầy muốn xem log UART)
Mở một cửa sổ PowerShell mới và chạy:
```powershell
python iot/dustguard-node/tools/serial-monitor.py
```
Log sẽ hiển thị từng dòng:
```text
[UART] APM2000 Packet: PM2.5=24.5, PM10=38.2, PM1.0=16.0 (Checksum OK)
[HTTP] POST /api/iot/telemetry -> 200 OK (Signed HMAC-SHA256)
```

### Bước 3: Thử nghiệm ngắt mạng (Offline Resilience)
1. Tắt Hotspot trên điện thoại:
   - Màn hình trạm chuyển icon Cloud sang đỏ.
   - Cảm biến vẫn tiếp tục đo và cập nhật số liệu lên màn hình cảm ứng.
2. Bật lại Hotspot:
   - Icon Cloud chuyển xanh.
   - ESP32 xả hàng đợi offline bù lên Cloudflare D1.

---

## 🧪 KỊCH BẢN 3: CHẠY BỘ KIỂM THỬ TỰ ĐỘNG CHỨNG MINH TÍNH TOÀN VẸN
Chạy lệnh kiểm thử sau để chứng minh hệ thống đạt chuẩn kỹ thuật, không có dữ liệu rác/giả lập:
```powershell
node --test tests/iot-realtime-telemetry.test.js
```
Kết quả hiển thị `pass 6 / fail 0` trong chưa đầy 1 giây!
