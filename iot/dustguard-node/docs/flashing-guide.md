# Hướng Dẫn Nạp Firmware ESP32 (Flashing Guide)

## 1. Yêu Cầu Môi Trường
- **PlatformIO Core (CLI)** hoặc **PlatformIO IDE** trên VS Code.
- Cáp kết nối Micro-USB hoặc Type-C truyền được data (tránh cáp sạc chỉ có 2 dây nguồn).
- Driver cổng nạp: CP2102 hoặc CH340 tương ứng với bo ESP32 của bạn.

---

## 2. Các Bước Nạp Firmware

### Bước 1: Chuẩn Bị Cấu Hình
1. Mở thư mục `iot/dustguard-node/firmware/include/`.
2. Kiểm tra file `config.h`. Điền thông tin Wi-Fi và URL máy chủ của bạn:
```cpp
#define DUSTGUARD_WIFI_SSID        "Ten_Wifi_Cua_Ban"
#define DUSTGUARD_WIFI_PASS        "Mat_Khau_Wifi"
#define DUSTGUARD_API_BASE_URL     "http://192.168.1.100:3001" // Hoặc domain Cloudflare
```

### Bước 2: Biên Dịch (Compile) Firmware
Mở terminal PowerShell tại thư mục `iot/dustguard-node/firmware/`:
```powershell
pio run -e esp32_tft_touch
```

### Bước 3: Nạp Code Vào ESP32 (Flash)
Cắm bo ESP32 vào cổng USB máy tính, sau đó chạy lệnh:
```powershell
pio run -e esp32_tft_touch --target upload
```
*Lưu ý: Nếu ESP32 không tự động vào chế độ Bootloader, hãy giữ nút **BOOT** trên bo trong 2 giây khi màn hình hiện chữ `Connecting........___`.*

### Bước 4: Mở Serial Monitor Kiểm Tra Runtime
```powershell
pio device monitor -b 115200
```
Output mong đợi trên Serial:
```text
=======================================================
 DustGuard VN — IoT Node (Samsung Innovation Campus 2026)
 Device ID: DG-NODE-011 | Firmware: 1.0.0 | STT: 11
 SVTH: Pham Phu Nguyen Hung (MSSV: 26730023 - UIT CNTT)
 GVHD: TS. Nguyen Van Thai (Khoa Dien-Dien tu, HCM-UTE)
=======================================================

[UI] Initialized TFT 480x320 Landscape.
[APM2000] Initialized UART2 on RX:16, TX:17 at 9600 bps
[WiFi] Connecting to SSID: DustGuard-Lab...
[API] Initialized endpoint http://192.168.1.100:3001/api/iot/v1/readings
[SYSTEM] System initialization complete. Entering State Machine loop.
[SENSOR] PM1: 12.4 | PM2.5: 28.5 | PM10: 41.8 ug/m3 (Status: 1)
[API] Upload success (201 OK). Sent readings: 1
```
Màn hình cảm ứng 3.5" TFT sẽ sáng lên với giao diện Home/Live sắc nét, số PM2.5 to rõ ràng.
