#ifndef DUSTGUARD_UI_MANAGER_H
#define DUSTGUARD_UI_MANAGER_H

#include <Arduino.h>
#include <TFT_eSPI.h>
#include "types.h"
#include "config.h"

// Color Palette (High-Contrast Light/Industrial Theme for arm's length visibility)
#define COLOR_BG            0xF7BE  // #FDFBF7 Cream
#define COLOR_TEXT_MAIN     0x0863  // #0F172A Dark Ink Slate
#define COLOR_TEXT_MUTED    0x632C  // #64748B Slate Grey
#define COLOR_TEAL_PRIMARY  0x0B6C  // #0D6F64 DustGuard Teal
#define COLOR_SEAL_RED      0x9924  // #9F241F Warning Red
#define COLOR_ORANGE_ALERT  0xB282  // #C2410C Moderate Alert
#define COLOR_GREEN_OK      0x1525  // #16A34A Success Green
#define COLOR_CARD_BG       0xFFFF  // #FFFFFF Pure White
#define COLOR_BORDER        0xCE59  // #CBD5E1 Light Border
#define COLOR_NAV_BG        0x0863  // #0F172A Nav Bar Background

class UIManager {
public:
    UIManager();
    void begin();
    
    // Non-blocking update called in main loop
    void update(const DeviceState &state);

    // Touch event handler
    void handleTouch(int16_t x, int16_t y, DeviceState &state, 
                     void (*wifiReconnectCb)(), void (*cloudSyncCb)());

    void navigateTo(ScreenId screen);
    ScreenId getCurrentScreen() const { return _currentScreen; }

    // Push historical reading for chart
    void recordMetricSample(float pm1, float pm25, float pm10);

private:
    TFT_eSPI _tft;
    ScreenId _currentScreen;
    ScreenId _lastScreen;
    uint32_t _lastRenderTime;
    
    // Chart history buffers (60 samples circular buffer)
    float _historyPm1[60];
    float _historyPm25[60];
    float _historyPm10[60];
    int _historyCount;
    int _historyHead;

    // Active chart filters
    ChartMetric _chartMetric;
    ChartTimeRange _chartRange;

    // Screen Renderers
    void renderScreen(const DeviceState &state);
    void renderHeader(const DeviceState &state);
    void renderBottomNav();
    void renderAlertBanner(AirStatus status, float pm25);

    void renderScreenHome(const DeviceState &state);
    void renderScreenChart(const DeviceState &state);
    void renderScreenDevice(const DeviceState &state);
    void renderScreenSensor(const DeviceState &state);
    void renderScreenNetwork(const DeviceState &state);
    void renderScreenAbout(const DeviceState &state);

    // Reusable UI Components
    void drawMetricCard(int16_t x, int16_t y, int16_t w, int16_t h, 
                        const char* title, float value, const char* unit, 
                        uint16_t accentColor, bool isDominant = false);
    void drawButton(int16_t x, int16_t y, int16_t w, int16_t h, 
                    const char* label, uint16_t bg, uint16_t text, bool active = false);
    void drawStatusBadge(int16_t x, int16_t y, const char* text, bool ok);
};

#endif // DUSTGUARD_UI_MANAGER_H
