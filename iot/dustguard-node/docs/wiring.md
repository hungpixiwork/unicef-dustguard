# Sơ Đồ Đấu Dây Phần Cứng (Wiring Diagram)

## Bảng Kết Nối Chi Tiết: ESP32 DevKit V1 + APM2000 + 3.5" TFT Touchscreen

### 1. Cảm Biến Bụi Laser APM2000 (UART2)

| Chân Cảm Biến APM2000 | Chân ESP32 DevKit | Chức Năng | Chú Thích |
|---|---|---|---|
| **Pin 1 (VCC)** | **VIN / 5V** | Nguồn nuôi cảm biến | Cảm biến dùng diode laser cần nguồn 5V ổn định |
| **Pin 2 (GND)** | **GND** | Nối đất | Chung mass với ESP32 |
| **Pin 3 (SET)** | **3.3V** | Kích hoạt cảm biến | Mức cao (HIGH) = Hoạt động đo bình thường |
| **Pin 4 (RX)** | **GPIO 17 (TX2)** | Nhận lệnh cấu hình | Không bắt buộc, dùng để chỉnh chế độ nếu cần |
| **Pin 5 (TX)** | **GPIO 16 (RX2)** | Truyền dữ liệu UART | **Bắt buộc**: Luồng dữ liệu 32 bytes 9600 baud |
| **Pin 6 (RESET)** | Để trống (NC) | Reset phần cứng | Mặc định thả nổi |

---

### 2. Màn Hình Cảm Ứng 3.5" Color TFT (ILI9488 SPI, 480x320)

| Chân Màn Hình TFT | Chân ESP32 DevKit | Chức Năng SPI | Chú Thích |
|---|---|---|---|
| **VCC** | **3.3V / 5V** | Nguồn màn hình | Tùy phiên bản module có IC ổn áp |
| **GND** | **GND** | Mass chung | Nối đất |
| **CS (TFT_CS)** | **GPIO 15** | Chip Select Display | Kích hoạt giao tiếp màn hình |
| **RESET (TFT_RST)**| **GPIO 4** | Reset phần cứng màn hình | Kéo thấp để reset |
| **DC / RS (TFT_DC)**| **GPIO 2** | Data / Command | Phân biệt dữ liệu pixel và lệnh |
| **SDI (MOSI)** | **GPIO 23** | SPI Master Out Slave In | Đường truyền dữ liệu hình ảnh |
| **SCK (SCLK)** | **GPIO 18** | SPI Clock | Xung đồng hồ SPI 27MHz |
| **LED / BL** | **3.3V** | Đèn nền (Backlight) | Có thể nối qua biến trở hoặc GPIO PWM |
| **SDO (MISO)** | **GPIO 19** | SPI Master In Slave Out | Đọc thông số màn hình |

---

### 3. Bộ Điều Khiển Cảm Ứng XPT2046 (Touch SPI)

| Chân Touch XPT2046 | Chân ESP32 DevKit | Chức Năng SPI | Chú Thích |
|---|---|---|---|
| **T_CLK** | **GPIO 18** | SPI Clock | Chia sẻ chung đường SCK với TFT |
| **T_CS** | **GPIO 21** | Touch Chip Select | Kích hoạt đọc tọa độ chạm cảm ứng |
| **T_DIN** | **GPIO 23** | SPI MOSI | Chia sẻ chung đường MOSI với TFT |
| **T_DO** | **GPIO 19** | SPI MISO | Đọc dữ liệu tọa độ từ XPT2046 |
| **T_IRQ** | Để trống | Ngắt cảm ứng | Code sử dụng cơ chế Polling 50ms |

---

## 4. Chi Phí Phần Cứng Thực Tế (BOM Summary)

Theo Bảng kê chi phí nộp kèm:
1. **ESP32 DevKit V1 38-Pin**: ~75.000 VNĐ
2. **Cảm biến bụi laser ASAIR APM2000**: ~240.000 VNĐ
3. **Màn hình cảm ứng 3.5" TFT SPI 480x320 (ILI9488 + XPT2046)**: ~150.000 VNĐ
4. **Dây cáp cắm test & Nguồn USB Type-C**: ~25.000 VNĐ
👉 **Tổng chi phí phần cứng**: **~490.000 VNĐ / Node** (Đáp ứng chỉ tiêu 420.000 – 500.000 VNĐ/node).
