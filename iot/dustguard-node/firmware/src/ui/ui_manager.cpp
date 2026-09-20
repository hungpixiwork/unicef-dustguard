#include "ui_manager.h"
#include <algorithm>
#include <cstdio>
#include <cstring>

UIManager::UIManager() 
    : _tft(TFT_WIDTH, TFT_HEIGHT),
      _currentScreen(SCREEN_HOME),
      _lastScreen(SCREEN_NONE),
      _lastRenderTime(0),
      _historyCount(0),
      _historyHead(0),
      _chartMetric(METRIC_PM25),
      _chartRange(RANGE_30_MIN) {
    memset(_historyPm1, 0, sizeof(_historyPm1));
    memset(_historyPm25, 0, sizeof(_historyPm25));
    memset(_historyPm10, 0, sizeof(_historyPm10));
}

void UIManager::begin() {
    _tft.init();
    _tft.setRotation(1); // 1 = Landscape (480x320)
    _tft.fillScreen(COLOR_BG);
    _tft.setTextFont(2);
    Serial.println("[UI] Initialized TFT 480x320 Landscape.");
}

void UIManager::recordMetricSample(float pm1, float pm25, float pm10) {
    int idx = (_historyHead + _historyCount) % 60;
    _historyPm1[idx] = pm1;
    _historyPm25[idx] = pm25;
    _historyPm10[idx] = pm10;

    if (_historyCount < 60) {
        _historyCount++;
    } else {
        _historyHead = (_historyHead + 1) % 60;
    }
}

void UIManager::update(const DeviceState &state) {
    uint32_t now = millis();
    if (now - _lastRenderTime >= INTERVAL_UI_REFRESH_MS) {
        _lastRenderTime = now;
        renderScreen(state);
    }
}

void UIManager::navigateTo(ScreenId screen) {
    if (_currentScreen != screen) {
        _currentScreen = screen;
        _tft.fillScreen(COLOR_BG);
    }
}

// =========================================================================
// Rendering Engine
// =========================================================================

void UIManager::renderScreen(const DeviceState &state) {
    renderHeader(state);

    switch (_currentScreen) {
        case SCREEN_HOME:
            renderScreenHome(state);
            break;
        case SCREEN_CHART:
            renderScreenChart(state);
            break;
        case SCREEN_DEVICE:
            renderScreenDevice(state);
            break;
        case SCREEN_SENSOR:
            renderScreenSensor(state);
            break;
        case SCREEN_NETWORK:
            renderScreenNetwork(state);
            break;
        case SCREEN_ABOUT:
            renderScreenAbout(state);
            break;
        default:
            renderScreenHome(state);
            break;
    }

    renderBottomNav();
    _lastScreen = _currentScreen;
}

void UIManager::renderHeader(const DeviceState &state) {
    _tft.fillRect(0, 0, 480, 36, COLOR_NAV_BG);
    
    _tft.setTextColor(TFT_WHITE, COLOR_NAV_BG);
    _tft.drawString("DustGuard", 10, 8, 4);

    _tft.setTextColor(0x7BEF, COLOR_NAV_BG);
    _tft.drawString(DUSTGUARD_DEVICE_ID, 160, 10, 2);

    // Wi-Fi Indicator
    if (state.wifiConnected) {
        _tft.fillCircle(380, 18, 5, COLOR_GREEN_OK);
        _tft.setTextColor(TFT_WHITE, COLOR_NAV_BG);
        _tft.drawString("WiFi", 345, 10, 2);
    } else {
        _tft.fillCircle(380, 18, 5, COLOR_SEAL_RED);
        _tft.setTextColor(0xC618, COLOR_NAV_BG);
        _tft.drawString("WiFi x", 335, 10, 2);
    }

    // Cloud Indicator
    if (state.cloudConnected) {
        _tft.fillCircle(455, 18, 5, COLOR_GREEN_OK);
        _tft.setTextColor(TFT_WHITE, COLOR_NAV_BG);
        _tft.drawString("Cloud", 410, 10, 2);
    } else {
        _tft.fillCircle(455, 18, 5, COLOR_SEAL_RED);
        _tft.setTextColor(0xC618, COLOR_NAV_BG);
        _tft.drawString("Cloud x", 400, 10, 2);
    }
}

void UIManager::renderAlertBanner(AirStatus status, float pm25) {
    uint16_t bannerColor = COLOR_GREEN_OK;
    const char* statusText = "AIR STATUS: NORMAL (SAFE)";

    if (status == AIR_VERY_HIGH) {
        bannerColor = COLOR_SEAL_RED;
        statusText = "AIR STATUS: VERY HIGH (HAZARDOUS)";
    } else if (status == AIR_HIGH) {
        bannerColor = COLOR_ORANGE_ALERT;
        statusText = "AIR STATUS: HIGH (> QCVN 05:2023)";
    } else if (status == AIR_MODERATE) {
        bannerColor = 0xC480; // Yellow-Orange
        statusText = "AIR STATUS: MODERATE (CAUTION)";
    }

    _tft.fillRoundRect(8, 40, 464, 26, 6, bannerColor);
    _tft.setTextColor(TFT_WHITE, bannerColor);
    _tft.drawCentreString(statusText, 240, 44, 2);
}

// -------------------------------------------------------------------------
// SCREEN 1: HOME / LIVE
// -------------------------------------------------------------------------
void UIManager::renderScreenHome(const DeviceState &state) {
    renderAlertBanner(state.airStatus, state.pm25);

    // Dominant Card: PM2.5 (Center-Left)
    drawMetricCard(8, 70, 250, 150, "PM2.5 (DOMINANT)", state.pm25, "ug/m3", COLOR_TEAL_PRIMARY, true);

    // Metric Cards: PM1.0 & PM10 (Right Stack)
    drawMetricCard(266, 70, 206, 72, "PM1.0 (ULTRAFINE)", state.pm1, "ug/m3", COLOR_TEXT_MAIN, false);
    drawMetricCard(266, 148, 206, 72, "PM10 (INHALABLE)", state.pm10, "ug/m3", COLOR_TEXT_MAIN, false);

    // Sensor Status Subtext
    _tft.fillRect(8, 224, 464, 44, COLOR_BG);
    _tft.setTextColor(COLOR_TEXT_MUTED, COLOR_BG);
    char buf[96];
    snprintf(buf, sizeof(buf), "Sensor: %s | Read: %lu s ago | Upload: %lu s ago", 
             DUSTGUARD_SENSOR_MODEL, 
             (unsigned long)state.sensorLastReadSecondsAgo, 
             (unsigned long)state.lastUploadSecondsAgo);
    _tft.drawString(buf, 14, 236, 2);
}

// -------------------------------------------------------------------------
// SCREEN 2: LIVE CHART
// -------------------------------------------------------------------------
void UIManager::renderScreenChart(const DeviceState &state) {
    _tft.fillRect(8, 40, 464, 224, COLOR_BG);

    // Metric Tabs
    drawButton(8, 40, 90, 28, "PM1.0", _chartMetric == METRIC_PM1 ? COLOR_TEAL_PRIMARY : COLOR_CARD_BG, _chartMetric == METRIC_PM1 ? TFT_WHITE : COLOR_TEXT_MAIN);
    drawButton(104, 40, 90, 28, "PM2.5", _chartMetric == METRIC_PM25 ? COLOR_TEAL_PRIMARY : COLOR_CARD_BG, _chartMetric == METRIC_PM25 ? TFT_WHITE : COLOR_TEXT_MAIN);
    drawButton(200, 40, 90, 28, "PM10", _chartMetric == METRIC_PM10 ? COLOR_TEAL_PRIMARY : COLOR_CARD_BG, _chartMetric == METRIC_PM10 ? TFT_WHITE : COLOR_TEXT_MAIN);

    // Time Range Tabs
    drawButton(310, 40, 75, 28, "5 MIN", _chartRange == RANGE_5_MIN ? COLOR_NAV_BG : COLOR_CARD_BG, _chartRange == RANGE_5_MIN ? TFT_WHITE : COLOR_TEXT_MAIN);
    drawButton(392, 40, 75, 28, "30 MIN", _chartRange == RANGE_30_MIN ? COLOR_NAV_BG : COLOR_CARD_BG, _chartRange == RANGE_30_MIN ? TFT_WHITE : COLOR_TEXT_MAIN);

    // Chart Box (x:10, y:74, w:310, h:145)
    _tft.fillRoundRect(8, 74, 310, 145, 6, COLOR_CARD_BG);
    _tft.drawRoundRect(8, 74, 310, 145, 6, COLOR_BORDER);

    float *buf = (_chartMetric == METRIC_PM1) ? _historyPm1 : ((_chartMetric == METRIC_PM25) ? _historyPm25 : _historyPm10);
    float minVal = 999.0f, maxVal = 0.0f, sumVal = 0.0f;
    int count = _historyCount > 0 ? _historyCount : 1;

    for (int i = 0; i < count; i++) {
        int idx = (_historyHead + i) % 60;
        float v = buf[idx];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
        sumVal += v;
    }
    if (minVal > maxVal) { minVal = 0; maxVal = 50; }
    if (maxVal - minVal < 10) maxVal = minVal + 10;
    float avgVal = sumVal / count;

    // Draw Chart Lines
    int prevX = 14, prevY = 200;
    for (int i = 0; i < count; i++) {
        int idx = (_historyHead + i) % 60;
        float v = buf[idx];
        int x = 14 + (i * 296) / 59;
        int y = 205 - (int)(((v - minVal) / (maxVal - minVal)) * 115.0f);
        if (y < 85) y = 85;
        if (y > 205) y = 205;

        if (i > 0) {
            _tft.drawLine(prevX, prevY, x, y, COLOR_TEAL_PRIMARY);
            _tft.drawLine(prevX, prevY + 1, x, y + 1, COLOR_TEAL_PRIMARY);
        }
        prevX = x;
        prevY = y;
    }

    // Stats Card (Right Column x:326, y:74, w:146, h:145)
    _tft.fillRoundRect(326, 74, 146, 145, 6, COLOR_CARD_BG);
    _tft.drawRoundRect(326, 74, 146, 145, 6, COLOR_BORDER);

    _tft.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
    _tft.drawString("STATISTICS", 336, 82, 2);

    char valStr[32];
    _tft.setTextColor(COLOR_TEXT_MAIN, COLOR_CARD_BG);
    snprintf(valStr, sizeof(valStr), "Current: %.1f", (_chartMetric == METRIC_PM1) ? state.pm1 : ((_chartMetric == METRIC_PM25) ? state.pm25 : state.pm10));
    _tft.drawString(valStr, 336, 106, 2);

    snprintf(valStr, sizeof(valStr), "Average: %.1f", avgVal);
    _tft.drawString(valStr, 336, 132, 2);

    snprintf(valStr, sizeof(valStr), "Max:     %.1f", maxVal);
    _tft.drawString(valStr, 336, 158, 2);

    snprintf(valStr, sizeof(valStr), "Min:     %.1f", minVal);
    _tft.drawString(valStr, 336, 184, 2);
}

// -------------------------------------------------------------------------
// SCREEN 3: DEVICE STATUS
// -------------------------------------------------------------------------
void UIManager::renderScreenDevice(const DeviceState &state) {
    _tft.fillRect(8, 40, 464, 224, COLOR_BG);

    _tft.fillRoundRect(8, 40, 464, 160, 6, COLOR_CARD_BG);
    _tft.drawRoundRect(8, 40, 464, 160, 6, COLOR_BORDER);

    _tft.setTextColor(COLOR_TEAL_PRIMARY, COLOR_CARD_BG);
    _tft.drawString("DEVICE SYSTEM TELEMETRY", 20, 48, 4);

    _tft.setTextColor(COLOR_TEXT_MAIN, COLOR_CARD_BG);
    char buf[128];
    snprintf(buf, sizeof(buf), "Device: %s  |  Firmware: %s", DUSTGUARD_DEVICE_ID, DUSTGUARD_FIRMWARE_VERSION);
    _tft.drawString(buf, 20, 80, 2);

    snprintf(buf, sizeof(buf), "Sensor: %s (%s)", DUSTGUARD_SENSOR_MODEL, state.sensorConnected ? "OK" : "CHECK");
    _tft.drawString(buf, 20, 102, 2);

    snprintf(buf, sizeof(buf), "Wi-Fi: %s (%d dBm)", state.wifiConnected ? "CONNECTED" : "OFFLINE", state.wifiRSSI);
    _tft.drawString(buf, 20, 124, 2);

    snprintf(buf, sizeof(buf), "Cloud: %s  |  Uploads: %d sent, %d failed", 
             state.cloudConnected ? "ONLINE" : "OFFLINE", state.readingsSent, state.failedUploads);
    _tft.drawString(buf, 20, 146, 2);

    int hrs = (int)(state.uptimeSeconds / 3600);
    int mins = (int)((state.uptimeSeconds % 3600) / 60);
    int secs = (int)(state.uptimeSeconds % 60);
    snprintf(buf, sizeof(buf), "Uptime: %02d:%02d:%02ds  |  Pending Queue: %d", hrs, mins, secs, state.pendingUploads);
    _tft.drawString(buf, 20, 168, 2);

    // Operational Action Buttons (Touch Targets >= 60px height)
    drawButton(20, 208, 210, 48, "RECONNECT WIFI", COLOR_NAV_BG, TFT_WHITE);
    drawButton(250, 208, 210, 48, "SYNC NOW", COLOR_TEAL_PRIMARY, TFT_WHITE);
}

// -------------------------------------------------------------------------
// SCREEN 4: SENSOR DETAILS
// -------------------------------------------------------------------------
void UIManager::renderScreenSensor(const DeviceState &state) {
    _tft.fillRect(8, 40, 464, 224, COLOR_BG);

    _tft.fillRoundRect(8, 40, 464, 160, 6, COLOR_CARD_BG);
    _tft.drawRoundRect(8, 40, 464, 160, 6, COLOR_BORDER);

    _tft.setTextColor(COLOR_TEAL_PRIMARY, COLOR_CARD_BG);
    _tft.drawString("SENSOR DIAGNOSTICS: APM2000", 20, 48, 4);

    _tft.setTextColor(COLOR_TEXT_MAIN, COLOR_CARD_BG);
    char buf[128];
    snprintf(buf, sizeof(buf), "PM1: %.1f ug/m3  |  PM2.5: %.1f ug/m3  |  PM10: %.1f ug/m3", state.pm1, state.pm25, state.pm10);
    _tft.drawString(buf, 20, 80, 2);

    snprintf(buf, sizeof(buf), "UART2 Protocol: 9600 Baud (8N1) - Receiving: %s", state.sensorConnected ? "YES" : "NO");
    _tft.drawString(buf, 20, 104, 2);

    snprintf(buf, sizeof(buf), "Valid Frames: %lu  |  Invalid Frames: %lu", 
             (unsigned long)state.validFrames, (unsigned long)state.invalidFrames);
    _tft.drawString(buf, 20, 128, 2);

    snprintf(buf, sizeof(buf), "Total Measurements: %lu  |  Read Interval: 2s", 
             (unsigned long)state.totalMeasurements);
    _tft.drawString(buf, 20, 152, 2);

    drawButton(20, 208, 210, 48, "REFRESH SENSOR", COLOR_NAV_BG, TFT_WHITE);
    drawButton(250, 208, 210, 48, "SENSOR INFO", COLOR_CARD_BG, COLOR_TEXT_MAIN);
}

// -------------------------------------------------------------------------
// SCREEN 5: NETWORK / CLOUD
// -------------------------------------------------------------------------
void UIManager::renderScreenNetwork(const DeviceState &state) {
    _tft.fillRect(8, 40, 464, 224, COLOR_BG);

    _tft.fillRoundRect(8, 40, 464, 160, 6, COLOR_CARD_BG);
    _tft.drawRoundRect(8, 40, 464, 160, 6, COLOR_BORDER);

    _tft.setTextColor(COLOR_TEAL_PRIMARY, COLOR_CARD_BG);
    _tft.drawString("NETWORK & CLOUDFLARE CLOUD", 20, 48, 4);

    _tft.setTextColor(COLOR_TEXT_MAIN, COLOR_CARD_BG);
    char buf[128];
    snprintf(buf, sizeof(buf), "SSID: %s  |  IP: %s", state.ssid, state.ipAddress);
    _tft.drawString(buf, 20, 80, 2);

    snprintf(buf, sizeof(buf), "API: %s  |  Code: %d", DUSTGUARD_API_ENDPOINT, state.lastHttpResponse);
    _tft.drawString(buf, 20, 104, 2);

    snprintf(buf, sizeof(buf), "Security: HMAC-SHA256 Signed  |  Secret: [Loaded]");
    _tft.drawString(buf, 20, 128, 2);

    snprintf(buf, sizeof(buf), "Offline Queue: %d / %d records cached", state.pendingUploads, OFFLINE_QUEUE_CAPACITY);
    _tft.drawString(buf, 20, 152, 2);

    drawButton(20, 208, 210, 48, "TEST CLOUD", COLOR_TEAL_PRIMARY, TFT_WHITE);
    drawButton(250, 208, 210, 48, "RETRY QUEUE", COLOR_NAV_BG, TFT_WHITE);
}

// -------------------------------------------------------------------------
// SCREEN 6: ABOUT
// -------------------------------------------------------------------------
void UIManager::renderScreenAbout(const DeviceState &state) {
    _tft.fillRect(8, 40, 464, 224, COLOR_BG);

    _tft.fillRoundRect(8, 40, 464, 216, 6, COLOR_CARD_BG);
    _tft.drawRoundRect(8, 40, 464, 216, 6, COLOR_BORDER);

    _tft.setTextColor(COLOR_TEAL_PRIMARY, COLOR_CARD_BG);
    _tft.drawString("SAMSUNG INNOVATION CAMPUS 2026", 20, 48, 4);

    _tft.setTextColor(COLOR_TEXT_MAIN, COLOR_CARD_BG);
    _tft.drawString("Final Project - Mon: Van vat ket noi (IoT)", 20, 78, 2);
    _tft.drawString("De tai: DustGuard VN - IoT Node APM2000 & Cloud D1", 20, 98, 2);
    _tft.drawString("GVHD:   TS. Nguyen Van Thai (HCM-UTE)", 20, 118, 2);

    _tft.setTextColor(COLOR_SEAL_RED, COLOR_CARD_BG);
    _tft.drawString("SVTH:   Pham Phu Nguyen Hung (MSSV: 26730023)", 20, 138, 2);
    _tft.drawString("Truong: DH Cong nghe Thong tin - DHQG-HCM (UIT)", 20, 158, 2);

    _tft.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
    _tft.drawString("Dashboard Web: /sic & /iot  |  Node: DG-NODE-011", 20, 184, 2);
}

// -------------------------------------------------------------------------
// Bottom Navigation Bar
// -------------------------------------------------------------------------
void UIManager::renderBottomNav() {
    _tft.fillRect(0, 270, 480, 50, COLOR_NAV_BG);

    drawButton(6, 274, 110, 42, "HOME", _currentScreen == SCREEN_HOME ? COLOR_TEAL_PRIMARY : COLOR_CARD_BG, _currentScreen == SCREEN_HOME ? TFT_WHITE : COLOR_TEXT_MAIN);
    drawButton(124, 274, 110, 42, "CHART", _currentScreen == SCREEN_CHART ? COLOR_TEAL_PRIMARY : COLOR_CARD_BG, _currentScreen == SCREEN_CHART ? TFT_WHITE : COLOR_TEXT_MAIN);
    drawButton(242, 274, 110, 42, "DEVICE", _currentScreen == SCREEN_DEVICE ? COLOR_TEAL_PRIMARY : COLOR_CARD_BG, _currentScreen == SCREEN_DEVICE ? TFT_WHITE : COLOR_TEXT_MAIN);

    const char* moreLabel = (_currentScreen == SCREEN_SENSOR) ? "SENSOR" : ((_currentScreen == SCREEN_NETWORK) ? "NETWORK" : "MORE");
    drawButton(360, 274, 114, 42, moreLabel, (_currentScreen >= SCREEN_SENSOR) ? COLOR_TEAL_PRIMARY : COLOR_CARD_BG, (_currentScreen >= SCREEN_SENSOR) ? TFT_WHITE : COLOR_TEXT_MAIN);
}

// -------------------------------------------------------------------------
// Reusable Components
// -------------------------------------------------------------------------
void UIManager::drawMetricCard(int16_t x, int16_t y, int16_t w, int16_t h, 
                              const char* title, float value, const char* unit, 
                              uint16_t accentColor, bool isDominant) {
    _tft.fillRoundRect(x, y, w, h, 8, COLOR_CARD_BG);
    _tft.drawRoundRect(x, y, w, h, 8, isDominant ? accentColor : COLOR_BORDER);
    if (isDominant) {
        _tft.drawRoundRect(x + 1, y + 1, w - 2, h - 2, 7, accentColor);
    }

    _tft.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
    _tft.drawString(title, x + 10, y + 8, 2);

    char valBuf[16];
    snprintf(valBuf, sizeof(valBuf), "%.1f", value);

    if (isDominant) {
        _tft.setTextColor(COLOR_TEXT_MAIN, COLOR_CARD_BG);
        _tft.drawString(valBuf, x + 10, y + 40, 7); // Very Large 56-72px font
        _tft.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
        _tft.drawString(unit, x + 12, y + 118, 2);
    } else {
        _tft.setTextColor(COLOR_TEXT_MAIN, COLOR_CARD_BG);
        _tft.drawString(valBuf, x + 10, y + 32, 4); // Medium 34-44px font
        _tft.setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
        _tft.drawString(unit, x + 120, y + 38, 2);
    }
}

void UIManager::drawButton(int16_t x, int16_t y, int16_t w, int16_t h, 
                          const char* label, uint16_t bg, uint16_t text, bool active) {
    _tft.fillRoundRect(x, y, w, h, 6, bg);
    _tft.drawRoundRect(x, y, w, h, 6, active ? COLOR_TEAL_PRIMARY : COLOR_BORDER);
    _tft.setTextColor(text, bg);
    _tft.drawCentreString(label, x + (w / 2), y + (h / 2) - 8, 2);
}

void UIManager::drawStatusBadge(int16_t x, int16_t y, const char* text, bool ok) {
    uint16_t color = ok ? COLOR_GREEN_OK : COLOR_SEAL_RED;
    _tft.fillRoundRect(x, y, 70, 22, 4, color);
    _tft.setTextColor(TFT_WHITE, color);
    _tft.drawCentreString(text, x + 35, y + 4, 2);
}

// -------------------------------------------------------------------------
// Touch Event Router (XPT2046 480x320)
// -------------------------------------------------------------------------
void UIManager::handleTouch(int16_t x, int16_t y, DeviceState &state,
                           void (*wifiReconnectCb)(), void (*cloudSyncCb)()) {
    // 1. Bottom Nav Touch Bar (y: 270 - 320)
    if (y >= 265) {
        if (x < 120) {
            navigateTo(SCREEN_HOME);
        } else if (x < 240) {
            navigateTo(SCREEN_CHART);
        } else if (x < 360) {
            navigateTo(SCREEN_DEVICE);
        } else {
            // Cycle through MORE screens: SENSOR -> NETWORK -> ABOUT -> SENSOR
            if (_currentScreen == SCREEN_SENSOR) navigateTo(SCREEN_NETWORK);
            else if (_currentScreen == SCREEN_NETWORK) navigateTo(SCREEN_ABOUT);
            else navigateTo(SCREEN_SENSOR);
        }
        return;
    }

    // 2. Chart Screen Interactions
    if (_currentScreen == SCREEN_CHART && y >= 35 && y <= 70) {
        if (x < 100) _chartMetric = METRIC_PM1;
        else if (x < 200) _chartMetric = METRIC_PM25;
        else if (x < 300) _chartMetric = METRIC_PM10;
        else if (x < 385) _chartRange = RANGE_5_MIN;
        else _chartRange = RANGE_30_MIN;
        renderScreen(state);
        return;
    }

    // 3. Action Buttons on Device Screen (y: 200 - 260)
    if (_currentScreen == SCREEN_DEVICE && y >= 200 && y <= 260) {
        if (x < 235 && wifiReconnectCb) {
            Serial.println("[TOUCH] Action: [ RECONNECT WIFI ]");
            wifiReconnectCb();
        } else if (x >= 240 && cloudSyncCb) {
            Serial.println("[TOUCH] Action: [ SYNC NOW ]");
            cloudSyncCb();
        }
        return;
    }

    // 4. Action Buttons on Network Screen
    if (_currentScreen == SCREEN_NETWORK && y >= 200 && y <= 260) {
        if (cloudSyncCb) {
            Serial.println("[TOUCH] Action: [ TEST CLOUD / RETRY QUEUE ]");
            cloudSyncCb();
        }
        return;
    }
}
