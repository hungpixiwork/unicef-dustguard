#include "api.h"
#include <mbedtls/md.h>

ApiClient::ApiClient() 
    : _baseUrl(nullptr), _endpoint(nullptr), _secret(nullptr), _queueCount(0), _queueHead(0) {
    memset(_queue, 0, sizeof(_queue));
}

void ApiClient::begin(const char* baseUrl, const char* endpoint, const char* secret) {
    _baseUrl = baseUrl;
    _endpoint = endpoint;
    _secret = secret;
    Serial.printf("[API] Initialized endpoint %s%s\n", _baseUrl, _endpoint);
}

String ApiClient::computeHmacSha256(const String &data, const String &key) {
    uint8_t hmacResult[32];
    mbedtls_md_context_t ctx;
    mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;

    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1);
    mbedtls_md_hmac_starts(&ctx, (const unsigned char*)key.c_str(), key.length());
    mbedtls_md_hmac_update(&ctx, (const unsigned char*)data.c_str(), data.length());
    mbedtls_md_hmac_finish(&ctx, hmacResult);
    mbedtls_md_free(&ctx);

    char hexBuf[65];
    for (int i = 0; i < 32; i++) {
        sprintf(&hexBuf[i * 2], "%02x", hmacResult[i]);
    }
    hexBuf[64] = '\0';
    return String(hexBuf);
}

bool ApiClient::postPayload(const String &jsonPayload, int &responseCode) {
    if (WiFi.status() != WL_CONNECTED) {
        responseCode = -1;
        return false;
    }

    HTTPClient http;
    String fullUrl = String(_baseUrl) + String(_endpoint);
    http.begin(fullUrl);
    http.setTimeout(4000);
    http.addHeader("Content-Type", "application/json");

    // Add security headers: device secret or HMAC signature
    String signature = computeHmacSha256(jsonPayload, String(_secret));
    http.addHeader("x-device-id", DUSTGUARD_DEVICE_ID);
    http.addHeader("x-signature", signature);
    http.addHeader("x-device-secret", _secret);

    responseCode = http.POST(jsonPayload);
    bool success = (responseCode >= 200 && responseCode < 300);
    http.end();

    return success;
}

void ApiClient::enqueueReading(const SensorReading &reading, int rssi) {
    if (_queueCount < OFFLINE_QUEUE_CAPACITY) {
        int idx = (_queueHead + _queueCount) % OFFLINE_QUEUE_CAPACITY;
        _queue[idx].pm1 = reading.pm1;
        _queue[idx].pm25 = reading.pm25;
        _queue[idx].pm10 = reading.pm10;
        _queue[idx].timestamp = millis() / 1000;
        _queue[idx].rssi = rssi;
        _queueCount++;
        Serial.printf("[API] Enqueued offline reading (total queued: %d)\n", _queueCount);
    } else {
        Serial.println("[API] Offline queue full, dropping oldest reading.");
        _queueHead = (_queueHead + 1) % OFFLINE_QUEUE_CAPACITY;
        int idx = (_queueHead + _queueCount - 1) % OFFLINE_QUEUE_CAPACITY;
        _queue[idx].pm1 = reading.pm1;
        _queue[idx].pm25 = reading.pm25;
        _queue[idx].pm10 = reading.pm10;
        _queue[idx].timestamp = millis() / 1000;
        _queue[idx].rssi = rssi;
    }
}

bool ApiClient::uploadReading(const SensorReading &reading, DeviceState &state) {
    StaticJsonDocument<384> doc;
    doc["deviceId"] = DUSTGUARD_DEVICE_ID;
    doc["timestamp"] = millis() / 1000;

    JsonObject sensors = doc.createNestedObject("sensors");
    sensors["pm1"] = reading.pm1;
    sensors["pm25"] = reading.pm25;
    sensors["pm10"] = reading.pm10;

    JsonObject sys = doc.createNestedObject("system");
    sys["wifiRssi"] = state.wifiRSSI;
    sys["uptime"] = state.uptimeSeconds;
    sys["firmware"] = DUSTGUARD_FIRMWARE_VERSION;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    int responseCode = 0;
    bool ok = postPayload(jsonPayload, responseCode);
    state.lastHttpResponse = responseCode;

    if (ok) {
        state.cloudConnected = true;
        state.lastUploadSecondsAgo = 0;
        state.readingsSent++;
        Serial.printf("[API] Upload success (201 OK). Sent readings: %d\n", state.readingsSent);
        
        // Try flushing offline queue if items remain
        if (_queueCount > 0) {
            flushQueue(state);
        }
        return true;
    } else {
        state.cloudConnected = false;
        state.failedUploads++;
        Serial.printf("[API] Upload failed (HTTP %d). Enqueuing to offline buffer...\n", responseCode);
        enqueueReading(reading, state.wifiRSSI);
        state.pendingUploads = _queueCount;
        return false;
    }
}

bool ApiClient::flushQueue(DeviceState &state) {
    if (_queueCount == 0 || WiFi.status() != WL_CONNECTED) {
        return false;
    }

    Serial.printf("[API] Flushing %d queued offline readings oldest-first...\n", _queueCount);
    while (_queueCount > 0) {
        QueuedReading qr = _queue[_queueHead];

        StaticJsonDocument<384> doc;
        doc["deviceId"] = DUSTGUARD_DEVICE_ID;
        doc["timestamp"] = qr.timestamp;

        JsonObject sensors = doc.createNestedObject("sensors");
        sensors["pm1"] = qr.pm1;
        sensors["pm25"] = qr.pm25;
        sensors["pm10"] = qr.pm10;

        JsonObject sys = doc.createNestedObject("system");
        sys["wifiRssi"] = qr.rssi;
        sys["uptime"] = state.uptimeSeconds;
        sys["firmware"] = DUSTGUARD_FIRMWARE_VERSION;

        String jsonPayload;
        serializeJson(doc, jsonPayload);

        int resp = 0;
        if (postPayload(jsonPayload, resp)) {
            _queueHead = (_queueHead + 1) % OFFLINE_QUEUE_CAPACITY;
            _queueCount--;
            state.readingsSent++;
            state.pendingUploads = _queueCount;
        } else {
            Serial.printf("[API] Queue flush stopped at remaining: %d\n", _queueCount);
            return false;
        }
    }

    state.cloudConnected = true;
    return true;
}

bool ApiClient::testCloud(DeviceState &state) {
    SensorReading testR = { state.pm1, state.pm25, state.pm10, millis(), true };
    return uploadReading(testR, state);
}
