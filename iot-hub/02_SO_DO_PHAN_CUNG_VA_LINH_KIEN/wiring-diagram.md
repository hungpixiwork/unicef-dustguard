# 🔌 SƠ ĐỒ KẾT NỐI DÂY & BẢNG KÊ LINH KIỆN (HARDWARE WIRING & BOM)

> **Mã thiết bị**: `DG-IOT-001` (Trạm đo DustGuard Node)  
> **Bộ vi điều khiển**: ESP32-WROOM-32D (38-pin DevKit V1)  
> **Cảm biến hạt bụi**: ASAIR APM2000 (Laser Dust Particle Sensor)  
> **Màn hình hiển thị**: 3.5" TFT LCD Touch Screen (Driver ILI9488/ST7796 + XPT2046 SPI Touch)

---

## 1. Sơ Đồ Nối Dây Chi Tiết (Pinout Matrix)

### 1.1 Kết Nối ESP32 sang Cảm Biến Bụi Laser APM2000 (Giao tiếp UART2)
| Chân Cảm Biến APM2000 | Chân ESP32 | Chức năng | Ghi chú |
|---|---|---|---|
| **Pin 1 (VCC)** | **VIN / 5V** | Cấp nguồn quạt hút khí | Cần nguồn 5V ổn định $\ge 1\text{A}$ |
| **Pin 2 (GND)** | **GND** | Nối đất chung | |
| **Pin 3 (SET)** | **3V3 / GPIO4** | Kích hoạt cảm biến | Nối mức CAO (High) để bật đo |
| **Pin 4 (TXD)** | **GPIO16 (RX2)** | Dữ liệu UART từ cảm biến | Baud rate: 9600, 8N1 |
| **Pin 5 (RXD)** | **GPIO17 (TX2)** | Lệnh cấu hình cảm biến | Tùy chọn (Sleep/Wakeup) |
| **Pin 6 (RESET)** | **Không nối** | Reset phần cứng | Mặc định treo cao |

---

### 1.2 Kết Nối ESP32 sang Màn Hình Cảm Ứng 3.5" TFT Touch (Giao tiếp SPI)
| Chân Màn Hình 3.5" | Chân ESP32 | Chức năng SPI |
|---|---|---|
| **VCC** | **5V / 3V3** | Cấp nguồn màn hình |
| **GND** | **GND** | Nối đất |
| **CS** | **GPIO15** | TFT Chip Select |
| **RESET** | **GPIO4 / EN** | TFT Reset |
| **DC / RS** | **GPIO2** | Data / Command Control |
| **SDI (MOSI)** | **GPIO23** | SPI Master Out Slave In |
| **SCK** | **GPIO18** | SPI Serial Clock |
| **LED / BL** | **3V3** | Đèn nền màn hình (Backlight) |
| **SDO (MISO)** | **GPIO19** | SPI Master In Slave Out |
| **T_CLK** | **GPIO18** | Touch SPI Clock (Chung bus) |
| **T_CS** | **GPIO21** | Touch Chip Select |
| **T_DIN** | **GPIO23** | Touch MOSI (Chung bus) |
| **T_DO** | **GPIO19** | Touch MISO (Chung bus) |
| **T_IRQ** | **GPIO22** | Touch Pen Interrupt |

---

## 2. Bảng Kê Chi Phí Phần Cứng (BOM - Bill of Materials)
*Tối ưu hóa chi phí cho chương trình Samsung Innovation Campus 2026*

| STT | Tên Linh Kiện | Model / Thông số kỹ thuật | Số Lượng | Đơn Giá (VNĐ) | Thành Tiền (VNĐ) |
|:---:|:---|:---|:---:|:---:|:---:|
| 1 | Bo mạch vi điều khiển | ESP32-WROOM-32D Dual-Core Wi-Fi & BLE | 1 | 95.000 | 95.000 |
| 2 | Cảm biến bụi mịn Laser | ASAIR APM2000 (PM1.0, PM2.5, PM10) | 1 | 230.000 | 230.000 |
| 3 | Màn hình cảm ứng màu | 3.5" TFT SPI 480x320 + Cảm ứng XPT2046 | 1 | 125.000 | 125.000 |
| 4 | Cáp cấp nguồn & nạp code | Cáp MicroUSB / Type-C 1m chống nhiễu | 1 | 15.000 | 15.000 |
| 5 | Dây cắm testboard & header | Bộ dây nối dupont đực-cái 20cm | 1 bộ | 10.000 | 10.000 |
| 6 | Vỏ bảo vệ buồng cảm biến | Hộp nhựa ABS chống nước chuẩn IP54 | 1 | 25.000 | 25.000 |
| **TỔNG CỘNG** | | | | | **500.000 VNĐ** |

> 💡 **Nhận xét so sánh**: Với mức giá chỉ **500.000 VNĐ**, giải pháp trạm đo DustGuard rẻ hơn **10 đến 20 lần** so với thiết bị thương mại của nước ngoài (vốn từ 5 đến 12 triệu VNĐ), hoàn toàn khả thi để nhân rộng cho hàng trăm trường học và khu dân cư.
