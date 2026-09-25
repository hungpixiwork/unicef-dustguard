# ⚙️ QUY TRÌNH NẠP CODE FIRMWARE ESP32 (FLASHING & DEPLOYMENT GUIDE)

> Môi trường khuyến nghị: **VS Code** tích hợp extension **PlatformIO IDE**.

---

## 1. Yêu Cầu Môi Trường
- Đã cài đặt [VS Code](https://code.visualstudio.com/)
- Đã cài extension **PlatformIO IDE** (`platformio.platformio-ide`)
- Driver cổng nạp nạp chip giao tiếp USB-UART: **CP2102** hoặc **CH340**

---

## 2. Các Bước Thực Hiện

### Bước 1: Mở Thư Mục Firmware
Trong VS Code, mở thư mục:
```text
iot/dustguard-node/firmware/
```

### Bước 2: Cấu Hình Wi-Fi và API Endpoint
Mở file [config.h](file:///d:/07-Competitions-Hackathons/unicef-dustguard/iot/dustguard-node/firmware/include/config.h) và điền thông tin mạng Wi-Fi thực tế của bạn:
```cpp
// Wi-Fi SSID & Mật khẩu
#define WIFI_SSID       "Ten_Wifi_Cua_Ban"
#define WIFI_PASSWORD   "Mat_Khau_Wifi"

// Endpoint Server Cloudflare
#define API_SERVER_URL  "https://dustguard.phamphunguyenhung.com/api/iot/telemetry"

// Mã trạm và Khóa bí mật ký số HMAC
#define DEVICE_CODE     "DG-IOT-001"
#define DEVICE_SECRET   "your-secure-hmac-secret-key"
```

### Bước 3: Biên Dịch (Build)
Mở terminal PlatformIO hoặc PowerShell tại thư mục `firmware`:
```powershell
pio run
```
PlatformIO sẽ tự động tải các thư viện cần thiết:
- `bodmer/TFT_eSPI` (Driver màn hình TFT siêu tốc tối ưu phần cứng)
- `paulstoffregen/XPT2046_Touchscreen` (Driver cảm ứng điện trở)
- `bblanchon/ArduinoJson` (Parser JSON siêu nhẹ)

### Bước 4: Nạp Code Lên Mạch (Upload)
Cắm cáp USB nối ESP32 với máy tính, sau đó chạy:
```powershell
pio run --target upload
```

### Bước 5: Xem Serial Monitor
```powershell
pio device monitor --baud 115200
```
Màn hình Serial sẽ hiển thị quá trình khởi tạo màn hình TFT, kết nối Wi-Fi và bắt đầu nhận gói tin từ cảm biến APM2000!
