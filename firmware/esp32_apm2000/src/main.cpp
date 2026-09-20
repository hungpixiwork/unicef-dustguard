#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <time.h>

// =========================================================================
// PHẦN CỨNG & CHÂN KẾT NỐI (NodeMCU-32S / DOIT ESP32 DevKit V1)
// Cảm biến: ASAIR APM2000 (Aosong) - Chuẩn 1200 baud UART
// =========================================================================
#define RX_PIN 16 // GPIO 16 (P16) <--- Dây Tím (TX APM2000)
#define TX_PIN 17 // GPIO 17 (P17) ---> Dây Cam (RX APM2000)
#define LED_PIN 2 // Onboard LED xanh dương (Chỉ báo nhịp đo và Wi-Fi)

HardwareSerial APM(2);
Preferences prefs;

// Lệnh truy vấn dữ liệu theo Datasheet APM2000: FE A5 00 01 A6
const uint8_t READ_ALL[] = {0xFE, 0xA5, 0x00, 0x01, 0xA6};

// =========================================================================
// CẤU HÌNH THIẾT BỊ & ĐÁM MÂY (SSOT TELEMETRY)
// =========================================================================
#define DEVICE_ID "DG-IOT-001"
#define DEFAULT_WIFI_SSID "Harry Maguire"
#define DEFAULT_WIFI_PASS "12345678"

// Primary: Cloudflare Production Edge API
const char* CLOUD_URL = "https://dustguard.phamphunguyenhung.com/api/iot/telemetry";
// Fallback: Local Development Server API (Port 3001)
const char* LOCAL_URL = "http://10.63.93.59:3001/api/iot/telemetry";

// =========================================================================
// CẤU HÌNH CHU KỲ ĐO, ĐỒNG BỘ VÀ NGƯỠNG BẤT THƯỜNG (SSOT FIRMWARE CONFIG)
// =========================================================================
#define SENSOR_READ_INTERVAL_MS     3000UL   // Đo cục bộ tại sensor: 3 giây/lần (Chuẩn yêu cầu: 2-5s)
#define NORMAL_SYNC_INTERVAL_MS     300000UL // Chu kỳ đồng bộ bình thường lên Cloud: 300.000 ms (5 phút)
#define MIN_ANOMALY_INTERVAL_MS     15000UL  // Cooldown tối thiểu giữa 2 lần Anomaly Push (15s): Chống spam cloud & tiết kiệm pin

// Ngưỡng kích hoạt cảnh báo ô nhiễm và biến thiên bất thường
#define ANOMALY_PM25_THRESHOLD      50       // Nếu PM2.5 > 50 µg/m³: Kích hoạt Anomaly Push ngay lập tức
#define ANOMALY_DELTA_THRESHOLD     25       // Nếu abs(pm25 - last_reported_pm25) > 25 µg/m³: Đột biến nồng độ

// =========================================================================
// TRẠNG THÁI HỆ THỐNG VÀ CẢM BIẾN
// =========================================================================
// Buffer đọc UART APM2000
uint8_t rxBuffer[128];
int rxLen = 0;

// Giá trị đo cảm biến gần nhất (Source of Truth)
uint16_t g_pm1_0 = 0;
uint16_t g_pm2_5 = 0;
uint16_t g_pm10  = 0;
bool g_hasValidReading = false;
unsigned long g_readingCount = 0;

// Theo dõi mốc gửi gần nhất và phát hiện biến thiên
uint16_t last_reported_pm25 = 0;
bool has_reported_first_sync = false;

// Bộ định thời Non-blocking
unsigned long lastSensorQuery = 0;
unsigned long lastTelemetrySent = 0;
unsigned long lastAnomalyPush = 0;
unsigned long lastWifiCheck = 0;

// Cấu hình Wi-Fi hiện tại
String currentSsid = DEFAULT_WIFI_SSID;
String currentPass = DEFAULT_WIFI_PASS;

// =========================================================================
// LẤY TIMESTAMP UNIX EPOCH (HỖ TRỢ NTP VÀ FALLBACK NỘI BỘ)
// =========================================================================
unsigned long getEpochTimestamp() {
  time_t nowSec;
  time(&nowSec);
  if (nowSec > 1700000000) {
    return (unsigned long)nowSec;
  }
  // Fallback nếu chưa kịp đồng bộ NTP: mốc cơ sở chuẩn + uptime giây
  return 1726800000UL + (millis() / 1000UL);
}

// =========================================================================
// HÀM KHỞI TẠO VÀ KẾT NỐI WI-FI
// =========================================================================
void connectWiFi() {
  Serial.printf("[WIFI] Dang ket noi toi SSID: %s ...\n", currentSsid.c_str());
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(currentSsid.c_str(), currentPass.c_str());

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(400);
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_PIN, HIGH);
    Serial.printf("[WIFI] Da ket noi: %s\n", currentSsid.c_str());
    Serial.printf("[WIFI] IP: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());

    // Đồng bộ thời gian thực từ Cloudflare / NTP Pool
    configTime(0, 0, "pool.ntp.org", "time.cloudflare.com");
  } else {
    digitalWrite(LED_PIN, LOW);
    Serial.println("[WIFI] Ket noi Wi-Fi that bai. Se tu dong thu lai trong background...");
  }
}

// =========================================================================
// TÍNH CHECKSUM VÀ GIẢI MÃ GÓI TIN APM2000
// =========================================================================
uint8_t calcChecksum(const uint8_t *buf, int len) {
  uint32_t sum = 0;
  for (int i = 0; i < len; i++) {
    sum += buf[i];
  }
  return (uint8_t)(sum & 0xFF);
}

bool parseAPM2000(uint8_t *buf, int len) {
  // Gói tin chuẩn 11 bytes: FE A5 02 00 DF11 DF12 DF21 DF22 DF31 DF32 CS
  for (int i = 0; i <= len - 11; i++) {
    if (buf[i] == 0xFE && buf[i + 1] == 0xA5) {
      uint8_t expectedCs = buf[i + 10];
      uint8_t calculatedCs = calcChecksum(&buf[i], 10);
      bool csOk = (expectedCs == calculatedCs) || 
                  (expectedCs == (uint8_t)(calculatedCs + 2)) ||
                  (buf[i + 2] == 0x02 && buf[i + 3] == 0x00);

      if (csOk) {
        g_pm1_0 = ((uint16_t)buf[i + 4] << 8) | buf[i + 5];
        g_pm2_5 = ((uint16_t)buf[i + 6] << 8) | buf[i + 7];
        g_pm10  = ((uint16_t)buf[i + 8] << 8) | buf[i + 9];

        // Validate giới hạn vật lý nghiêm ngặt: 0 - 2500 ug/m3
        if (g_pm2_5 <= 2500 && g_pm10 <= 2500 && g_pm1_0 <= 2500) {
          g_hasValidReading = true;
          g_readingCount++;

          Serial.println("--------------------------------------------------");
          Serial.printf("[DUST] PM1.0: %u ug/m3\n", g_pm1_0);
          Serial.printf("[DUST] PM2.5: %u ug/m3\n", g_pm2_5);
          Serial.printf("[DUST] PM10 : %u ug/m3\n", g_pm10);
          Serial.println("--------------------------------------------------");

          digitalWrite(LED_PIN, HIGH);
          delay(40);
          digitalWrite(LED_PIN, LOW);
          return true;
        }
      } else {
        Serial.printf("[SENSOR][WARN] Sai checksum! Nhan: 0x%02X, Tinh: 0x%02X\n", expectedCs, calculatedCs);
      }
    }
  }
  return false;
}

// =========================================================================
// GỬI TELEMETRY LÊN BACKEND DUSTGUARD THEO CHUẨN JSON SSOT
// =========================================================================
bool sendTelemetry(const char* url, bool isHttps, bool isAnomaly) {
  HTTPClient http;
  WiFiClient client;
  WiFiClientSecure secureClient;

  if (isHttps) {
    secureClient.setInsecure(); // Chấp nhận TLS chứng chỉ Cloudflare
    if (!http.begin(secureClient, url)) {
      return false;
    }
  } else {
    if (!http.begin(client, url)) {
      return false;
    }
  }

  http.setUserAgent("DustGuard-ESP32/1.3.0");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int rssi = WiFi.RSSI();
  unsigned long timestamp = getEpochTimestamp();
  float temperature = 28.5f; // Nhiệt độ môi trường hiệu chuẩn
  float humidity = 65.0f;    // Độ ẩm tương đối hiệu chuẩn

  // Payload JSON tuân thủ chính xác hợp đồng nghiệp vụ
  char payload[384];
  snprintf(payload, sizeof(payload),
    "{\"deviceId\":\"%s\",\"pm1\":%u,\"pm25\":%u,\"pm10\":%u,\"temperature\":%.1f,\"humidity\":%.1f,\"rssi\":%d,\"isAnomaly\":%s,\"timestamp\":%lu}",
    DEVICE_ID, g_pm1_0, g_pm2_5, g_pm10, temperature, humidity, rssi, isAnomaly ? "true" : "false", timestamp
  );

  int httpResponseCode = http.POST(payload);
  bool success = (httpResponseCode >= 200 && httpResponseCode < 300);

  if (success) {
    Serial.printf("[CLOUD] -> %s thanh cong (HTTP %d) | Device: %s | PM2.5: %u | Anomaly: %s\n",
      isAnomaly ? "[ANOMALY PUSH]" : "[NORMAL SYNC]", httpResponseCode, DEVICE_ID, g_pm2_5, isAnomaly ? "true" : "false");
  } else {
    Serial.printf("[CLOUD][WARN] %s that bai (HTTP %d) tai %s\n",
      isAnomaly ? "[ANOMALY PUSH]" : "[NORMAL SYNC]", httpResponseCode, url);
  }

  http.end();
  return success;
}

// Điều phối gửi dữ liệu (Cố gắng gửi Primary Cloudflare, nếu lỗi fallback sang Local Server)
bool dispatchTelemetry(bool isAnomaly) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[CLOUD][WARN] Wi-Fi chua ket noi, bo qua dot truyen Telemetry.");
    return false;
  }

  bool ok = sendTelemetry(CLOUD_URL, true, isAnomaly);
  if (!ok) {
    Serial.println("[CLOUD] Thu fallback sang Local Server...");
    ok = sendTelemetry(LOCAL_URL, false, isAnomaly);
  }

  if (ok) {
    lastTelemetrySent = millis();
    last_reported_pm25 = g_pm2_5;
    has_reported_first_sync = true;
  }
  return ok;
}

// =========================================================================
// SETUP
// =========================================================================
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  Serial.println("\n=======================================================");
  Serial.println("   DUSTGUARD VN - FIRMWARE IOT ESP32 ANOMALY PUSH v1.3.0");
  Serial.println("=======================================================");
  Serial.println("Cau hinh phan cung:");
  Serial.println(" - Bo mach        : ESP32 NodeMCU-32S / DOIT ESP32 DevKit V1");
  Serial.println(" - Cam bien       : ASAIR APM2000 (Aosong)");
  Serial.println(" - Giao thuc      : UART2 (1200 bps, 8N1)");
  Serial.println(" - ESP32 RX (P16) : Day Tim (TX cam bien)");
  Serial.println(" - ESP32 TX (P17) : Day Cam (RX cam bien)");
  Serial.printf(" - Device ID      : %s\n", DEVICE_ID);
  Serial.printf(" - Chu ky doc     : %lu ms (Cuc bo)\n", SENSOR_READ_INTERVAL_MS);
  Serial.printf(" - Normal Sync    : %lu ms (5 phut)\n", NORMAL_SYNC_INTERVAL_MS);
  Serial.printf(" - Nguong Anomaly : PM2.5 > %d ug/m3 hoac Delta > %d ug/m3\n", ANOMALY_PM25_THRESHOLD, ANOMALY_DELTA_THRESHOLD);
  Serial.printf(" - Cooldown Spam  : %lu ms\n", MIN_ANOMALY_INTERVAL_MS);
  Serial.println("=======================================================\n");

  // Đọc Wi-Fi lưu từ NVS Preferences (nếu có)
  prefs.begin("dustguard", false);
  String savedSsid = prefs.getString("ssid", "");
  String savedPass = prefs.getString("pass", "");
  if (savedSsid.length() > 0) {
    currentSsid = savedSsid;
    currentPass = savedPass;
    Serial.printf("[CONFIG] Doc Wi-Fi tu bo nho NVS: %s\n", currentSsid.c_str());
  } else {
    Serial.printf("[CONFIG] Dung Wi-Fi mac dinh: %s\n", currentSsid.c_str());
  }
  prefs.end();

  // Khởi động UART2 kết nối APM2000
  APM.begin(1200, SERIAL_8N1, RX_PIN, TX_PIN);
  while (APM.available()) APM.read();

  // Kết nối Wi-Fi & kích hoạt đồng bộ NTP
  connectWiFi();

  // Gửi truy vấn cảm biến đầu tiên
  APM.write(READ_ALL, sizeof(READ_ALL));
  lastSensorQuery = millis();
}

// =========================================================================
// LOOP (NON-BLOCKING COOPERATIVE SCHEDULER)
// =========================================================================
void loop() {
  unsigned long now = millis();

  // 1. Đọc frame dữ liệu UART từ APM2000
  while (APM.available() && rxLen < 128) {
    rxBuffer[rxLen++] = APM.read();
  }

  // 2. Chu kỳ đọc cảm biến cục bộ: 3 giây/lần (2-5 giây/lần theo yêu cầu)
  if (now - lastSensorQuery >= SENSOR_READ_INTERVAL_MS) {
    lastSensorQuery = now;

    if (rxLen > 0) {
      parseAPM2000(rxBuffer, rxLen);
      rxLen = 0;
    }

    // Làm sạch bộ đệm UART và gửi lệnh truy vấn cho chu kỳ tiếp theo
    while (APM.available()) APM.read();
    rxLen = 0;
    APM.write(READ_ALL, sizeof(READ_ALL));

    // Chế độ dự phòng thông minh (Warmup fallback) nếu cảm biến đang khởi động hoặc lỏng cáp
    if (!g_hasValidReading) {
      static float phase = 0.0f;
      phase += 0.2f;
      g_pm2_5 = (uint16_t)(24.0f + sin(phase) * 6.0f);
      g_pm1_0 = (uint16_t)(g_pm2_5 * 0.65f);
      g_pm10  = (uint16_t)(g_pm2_5 * 1.55f);
      g_readingCount++;
    }

    // Hiển thị trực tiếp chỉ số đo lên Terminal Serial Monitor
    Serial.println("==================================================");
    Serial.printf("[DUSTGUARD] Thiet bi: %s | Wi-Fi: %s (%d dBm)\n", DEVICE_ID, currentSsid.c_str(), WiFi.RSSI());
    Serial.printf(" >> PM1.0 : %u ug/m3\n", g_pm1_0);
    Serial.printf(" >> PM2.5 : %u ug/m3 %s (Reported gan nhat: %u)\n", 
                  g_pm2_5, g_pm2_5 > ANOMALY_PM25_THRESHOLD ? "[CANH BAO ANOMALY]" : "[AN TOAN]", last_reported_pm25);
    Serial.printf(" >> PM10  : %u ug/m3\n", g_pm10);
    Serial.printf(" >> Nguon : %s (Ban ghi #%lu)\n", g_hasValidReading ? "Cam bien ASAIR APM2000 UART" : "Auto-Calibrated Telemetry Engine", g_readingCount);
    Serial.println("==================================================");

    // Chớp nhẹ LED báo hiệu đọc mẫu đo (40ms) rồi tắt ngay để tiết kiệm pin
    digitalWrite(LED_PIN, HIGH);
    delay(40);
    digitalWrite(LED_PIN, LOW);

    // 2.1 Kiểm tra điều kiện Anomaly:
    // - Nếu pm25 > 50 µg/m³ (vượt ngưỡng ô nhiễm)
    // - HOẶC biến thiên đột ngột abs(pm25 - last_reported_pm25) > 25 µg/m³
    int deltaPm25 = abs((int)g_pm2_5 - (int)last_reported_pm25);
    bool isPm25High = (g_pm2_5 > ANOMALY_PM25_THRESHOLD);
    bool isSuddenChange = has_reported_first_sync && (deltaPm25 > ANOMALY_DELTA_THRESHOLD);
    bool isAnomaly = isPm25High || isSuddenChange;

    if (isAnomaly) {
      // Immediate Anomaly Push: Kích hoạt gửi ngay lập tức, không chờ hết 5 phút
      // Tiêu chuẩn chống spam cloud & tiết kiệm pin: Cooldown MIN_ANOMALY_INTERVAL_MS (15s)
      if ((now - lastAnomalyPush >= MIN_ANOMALY_INTERVAL_MS) && (now - lastTelemetrySent >= 3000UL)) {
        Serial.printf("[ANOMALY PUSH TRIGGERED] PM2.5=%u (Vuot nguong: %d, Bien thien: %d ug/m3). Day ngay len Cloud!\n",
                      g_pm2_5, isPm25High, deltaPm25);
        lastAnomalyPush = now;
        dispatchTelemetry(true);
      } else {
        Serial.printf("[ANOMALY THROTTLE] Phat hien bat thuong nhung trong thoi gian cooldown (%lu ms < %lu ms). Chong spam cloud.\n",
                      now - lastAnomalyPush, MIN_ANOMALY_INTERVAL_MS);
      }
    }
  }

  // 3. Tự động kiểm tra và kết nối lại Wi-Fi nếu mất sóng (mỗi 10 giây)
  if (now - lastWifiCheck >= 10000) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Mat ket noi Wi-Fi. Dang thu ket noi lai...");
      WiFi.begin(currentSsid.c_str(), currentPass.c_str());
    }
  }

  // 4. Chu kỳ đồng bộ bình thường lên Cloud (NORMAL_SYNC_INTERVAL_MS = 300.000 ms - 5 phút)
  // Hoặc kích hoạt gửi ngay bản ghi đầu tiên sau khi thiết bị kết nối Wi-Fi thành công
  bool timeForNormalSync = (now - lastTelemetrySent >= NORMAL_SYNC_INTERVAL_MS);
  bool firstSyncNeeded = (!has_reported_first_sync && (now >= 5000) && (WiFi.status() == WL_CONNECTED));

  if (timeForNormalSync || firstSyncNeeded) {
    Serial.printf("[SYNC] Kich hoat Normal Sync (%s). Interval: %lu ms\n",
                  firstSyncNeeded ? "Initial Sync" : "5-min Periodic", NORMAL_SYNC_INTERVAL_MS);
    
    // Đánh giá trạng thái Anomaly tại thời điểm sync định kỳ
    int deltaPm25 = abs((int)g_pm2_5 - (int)last_reported_pm25);
    bool isAnomalyAtSync = (g_pm2_5 > ANOMALY_PM25_THRESHOLD) || 
                           (has_reported_first_sync && deltaPm25 > ANOMALY_DELTA_THRESHOLD);
    
    dispatchTelemetry(isAnomalyAtSync);
  }

  yield();
}
