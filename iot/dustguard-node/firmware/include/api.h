#ifndef DUSTGUARD_API_CLIENT_H
#define DUSTGUARD_API_CLIENT_H

#include <Arduino.h>
#include <WString.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "types.h"
#include "config.h"

struct QueuedReading {
    float pm1;
    float pm25;
    float pm10;
    uint32_t timestamp;
    int rssi;
};

class ApiClient {
public:
    ApiClient();
    void begin(const char* baseUrl, const char* endpoint, const char* secret);
    
    // Gửi mẫu đo hiện tại lên Cloud
    bool uploadReading(const SensorReading &reading, DeviceState &state);

    // Gửi mẫu đo có trong hàng đợi offline
    bool flushQueue(DeviceState &state);

    // Kiểm tra kết nối Cloud
    bool testCloud(DeviceState &state);

    int getPendingQueueCount() const { return _queueCount; }

private:
    const char* _baseUrl;
    const char* _endpoint;
    const char* _secret;

    QueuedReading _queue[OFFLINE_QUEUE_CAPACITY];
    int _queueCount;
    int _queueHead;

    void enqueueReading(const SensorReading &reading, int rssi);
    bool postPayload(const String &jsonPayload, int &responseCode);
    String computeHmacSha256(const String &data, const String &key);
};

#endif // DUSTGUARD_API_CLIENT_H
