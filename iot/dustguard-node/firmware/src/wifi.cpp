#include "wifi.h"
#include "config.h"

WiFiService::WiFiService() : _ssid(nullptr), _password(nullptr), _lastReconnectAttempt(0), _connecting(false) {}

void WiFiService::begin(const char* ssid, const char* password) {
    _ssid = ssid;
    _password = password;
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(_ssid, _password);
    _connecting = true;
    _lastReconnectAttempt = millis();
    Serial.printf("[WiFi] Connecting to SSID: %s...\n", _ssid);
}

void WiFiService::update(DeviceState &state) {
    bool connected = (WiFi.status() == WL_CONNECTED);
    state.wifiConnected = connected;

    if (connected) {
        state.wifiRSSI = WiFi.RSSI();
        String ip = WiFi.localIP().toString();
        strncpy(state.ipAddress, ip.c_str(), sizeof(state.ipAddress) - 1);
        state.ipAddress[sizeof(state.ipAddress) - 1] = '\0';
        strncpy(state.ssid, _ssid ? _ssid : "Unknown", sizeof(state.ssid) - 1);
        _connecting = false;
    } else {
        state.wifiRSSI = 0;
        strncpy(state.ipAddress, "0.0.0.0", sizeof(state.ipAddress));
        
        // Auto-reconnect interval every 10 seconds if disconnected
        if (millis() - _lastReconnectAttempt > 10000) {
            reconnect();
        }
    }
}

void WiFiService::reconnect() {
    Serial.println("[WiFi] Reconnecting to Wi-Fi...");
    _lastReconnectAttempt = millis();
    WiFi.disconnect();
    WiFi.begin(_ssid, _password);
    _connecting = true;
}

bool WiFiService::isConnected() const {
    return WiFi.status() == WL_CONNECTED;
}

int WiFiService::getRSSI() const {
    return WiFi.RSSI();
}

String WiFiService::getIP() const {
    return WiFi.localIP().toString();
}
