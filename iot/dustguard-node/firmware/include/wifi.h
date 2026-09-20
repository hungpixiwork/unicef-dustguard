#ifndef DUSTGUARD_WIFI_H
#define DUSTGUARD_WIFI_H

#include <WiFi.h>
#include "types.h"

class WiFiService {
public:
    WiFiService();
    void begin(const char* ssid, const char* password);
    void update(DeviceState &state);
    void reconnect();

    bool isConnected() const;
    int getRSSI() const;
    String getIP() const;
    const char* getSSID() const { return _ssid; }

private:
    const char* _ssid;
    const char* _password;
    uint32_t _lastReconnectAttempt;
    bool _connecting;
};

#endif // DUSTGUARD_WIFI_H
