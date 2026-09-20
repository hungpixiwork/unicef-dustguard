#ifndef DUSTGUARD_SECRETS_EXAMPLE_H
#define DUSTGUARD_SECRETS_EXAMPLE_H

// ==========================================
// Wi-Fi Credentials
// ==========================================
#define WIFI_SSID               "YOUR_WIFI_SSID"
#define WIFI_PASSWORD           "YOUR_WIFI_PASSWORD"

// ==========================================
// DustGuard Cloud API Configuration
// ==========================================
// Địa chỉ Cloud API hoặc máy chủ cục bộ thử nghiệm
#define API_BASE_URL            "https://dustguard-api.unicef.workers.dev"
#define API_TELEMETRY_PATH      "/api/iot/telemetry"

// ==========================================
// Device Identity & HMAC Pre-Shared Key (SSOT)
// ==========================================
#define DEVICE_SENSOR_CODE      "SENSOR-VD1-01"
#define DEVICE_SECRET_KEY       "dustguard_secret_key_2026"

#endif // DUSTGUARD_SECRETS_EXAMPLE_H
