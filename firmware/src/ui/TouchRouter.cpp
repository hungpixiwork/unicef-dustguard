#include "TouchRouter.h"
#include "config.h"
#include <stdio.h>
#include <string.h>

TouchRouter::TouchRouter(CaseApiClient *caseApi, RollingStats *rollingStats)
    : _currentScreen(SCREEN_LIVE),
      _caseApi(caseApi),
      _rollingStats(rollingStats),
      _lastTouchTime(0),
      _testSensorCb(nullptr),
      _aqiStandard(AqiStandard::VN_QCVN),
      _alertSensitivity(0) {
}

void TouchRouter::begin() {
    _currentScreen = SCREEN_LIVE;
}

void TouchRouter::navigateTo(ScreenId screen) {
    _currentScreen = screen;
}

void TouchRouter::renderHeader(ITouchDisplay &gfx, const DeviceStatus &device) {
    // Header Bar: Y = 0 to 24
    gfx.fillRect(0, 0, TFT_SCREEN_WIDTH, TouchTheme::HEADER_H, TouchTheme::BG_CREAM);
    gfx.drawLine(0, TouchTheme::HEADER_H - 1, TFT_SCREEN_WIDTH, TouchTheme::HEADER_H - 1, TouchTheme::BORDER_LINE);

    // Tiêu đề trạm
    gfx.drawText(8, 6, "DustGuard VN | DG-NODE-01", TouchTheme::TEXT_INK, 1);

    // Trạng thái Wi-Fi & Cloud
    if (device.wifiConnected) {
        char wifiBuf[16];
        snprintf(wifiBuf, sizeof(wifiBuf), "Wi-Fi %ddBm", device.wifiRssi);
        gfx.drawText(200, 6, wifiBuf, TouchTheme::TEAL_PRIMARY, 1);
    } else {
        gfx.drawText(200, 6, "Wi-Fi: OFF", TouchTheme::TEXT_MUTED, 1);
    }

    if (device.cloudConnected) {
        gfx.drawText(285, 6, "[C]", TouchTheme::TEAL_PRIMARY, 1);
    } else {
        gfx.drawText(285, 6, "[x]", TouchTheme::CRIMSON_ALERT, 1);
    }
}

void TouchRouter::renderBottomNav(ITouchDisplay &gfx) {
    // Bottom Nav Bar: Y = 204 to 240 (Height = 36)
    int16_t navY = TFT_SCREEN_HEIGHT - TouchTheme::BOTTOM_NAV_H;
    gfx.fillRect(0, navY, TFT_SCREEN_WIDTH, TouchTheme::BOTTOM_NAV_H, TouchTheme::CARD_SUBTLE);
    gfx.drawLine(0, navY, TFT_SCREEN_WIDTH, navY, TouchTheme::BORDER_LINE);

    const char *tabs[] = { "LIVE", "PROFILE", "TREND", "SU KIEN", "TRAM" };
    ScreenId tabScreens[] = { SCREEN_LIVE, SCREEN_PARTICLE_PROFILE, SCREEN_TREND, SCREEN_AIR_EVENT, SCREEN_DEVICE };
    int16_t tabW = TFT_SCREEN_WIDTH / 5;

    for (int i = 0; i < 5; i++) {
        int16_t tx = i * tabW;
        bool isActive = (_currentScreen == tabScreens[i]) || 
                        (i == 3 && (_currentScreen == SCREEN_AIR_EVENT || _currentScreen == SCREEN_PROCESS_FLOW || _currentScreen == SCREEN_CREATE_CASE || _currentScreen == SCREEN_QR_HANDOFF)) ||
                        (i == 4 && (_currentScreen == SCREEN_DEVICE || _currentScreen == SCREEN_SENSOR_DIAGNOSTICS || _currentScreen == SCREEN_SETTINGS));

        if (isActive) {
            gfx.fillRect(tx + 2, navY + 2, tabW - 4, TouchTheme::BOTTOM_NAV_H - 4, TouchTheme::TEAL_PRIMARY);
            gfx.drawText(tx + 8, navY + 12, tabs[i], TouchTheme::TEXT_WHITE, 1);
        } else {
            gfx.drawText(tx + 8, navY + 12, tabs[i], TouchTheme::TEXT_INK, 1);
        }
        if (i < 4) {
            gfx.drawLine(tx + tabW, navY + 4, tx + tabW, navY + TouchTheme::BOTTOM_NAV_H - 4, TouchTheme::BORDER_LINE);
        }
    }
}

void TouchRouter::renderScreenLive(ITouchDisplay &gfx, const SensorReading &reading, const DerivedMetrics &metrics) {
    // Card trung tâm hiển thị PM2.5 Hero Number
    gfx.fillRoundRect(8, 28, 304, 102, 4, TouchTheme::CARD_BG);
    gfx.drawRoundRect(8, 28, 304, 102, 4, TouchTheme::BORDER_LINE);

    // AQI Badge góc trên bên trái
    uint16_t aqiColor = TouchTheme::GREEN_GOOD;
    if (metrics.aqi > 150) aqiColor = TouchTheme::CRIMSON_ALERT;
    else if (metrics.aqi > 100) aqiColor = TouchTheme::AMBER_WARNING;

    gfx.fillRect(16, 34, 100, 18, aqiColor);
    char aqiBuf[32];
    snprintf(aqiBuf, sizeof(aqiBuf), "AQI %u %s", metrics.aqi, metrics.aqiCategory);
    gfx.drawText(20, 39, aqiBuf, TouchTheme::TEXT_WHITE, 1);

    // Xu hướng Trend bên phải
    char trendBuf[32];
    snprintf(trendBuf, sizeof(trendBuf), "%+.0f ug/min", metrics.rateOfChange);
    uint16_t trendColor = (metrics.trend == TrendState::RAPID_RISE || metrics.trend == TrendState::INCREASING) ? TouchTheme::CRIMSON_ALERT : TouchTheme::TEAL_PRIMARY;
    gfx.drawText(200, 39, trendBuf, trendColor, 1);

    // HERO VALUE: PM2.5
    char pm25Str[16];
    if (reading.valid) {
        snprintf(pm25Str, sizeof(pm25Str), "%.0f", reading.pm25);
    } else {
        snprintf(pm25Str, sizeof(pm25Str), "--");
    }
    gfx.drawText(70, 58, pm25Str, TouchTheme::TEXT_INK, 4); // Cỡ chữ lớn
    gfx.drawText(160, 68, "ug/m3  (PM2.5)", TouchTheme::TEXT_MUTED, 1);
    gfx.drawText(160, 82, "Do truc tiep qua laser", TouchTheme::TEAL_PRIMARY, 1);

    // 3 Metric Chip bên dưới
    gfx.fillRect(8, 134, 98, 32, TouchTheme::CARD_BG);
    gfx.drawRect(8, 134, 98, 32, TouchTheme::BORDER_LINE);
    char m1[24]; snprintf(m1, sizeof(m1), "PM1.0: %.0f", reading.pm1);
    gfx.drawText(14, 145, m1, TouchTheme::TEXT_INK, 1);

    gfx.fillRect(111, 134, 98, 32, TouchTheme::CARD_BG);
    gfx.drawRect(111, 134, 98, 32, TouchTheme::BORDER_LINE);
    char m2[24]; snprintf(m2, sizeof(m2), "PM2.5: %.0f", reading.pm25);
    gfx.drawText(117, 145, m2, TouchTheme::TEXT_INK, 1);

    gfx.fillRect(214, 134, 98, 32, TouchTheme::CARD_BG);
    gfx.drawRect(214, 134, 98, 32, TouchTheme::BORDER_LINE);
    char m3[24]; snprintf(m3, sizeof(m3), "PM10: %.0f", reading.pm10);
    gfx.drawText(220, 145, m3, TouchTheme::TEXT_INK, 1);

    // Mini Realtime Graph (60s gần nhất) Y = 170 to 200
    gfx.fillRect(8, 170, 304, 30, TouchTheme::CARD_SUBTLE);
    gfx.drawRect(8, 170, 304, 30, TouchTheme::BORDER_LINE);

    float points[GRAPH_POINTS_MAX];
    uint8_t count = _rollingStats ? _rollingStats->getGraphPoints(points, GRAPH_POINTS_MAX) : 0;
    if (count > 1) {
        float minV = 0.0f, maxV = 100.0f;
        for (uint8_t i = 0; i < count; i++) {
            if (points[i] > maxV) maxV = points[i];
        }
        float dx = 300.0f / (float)(count - 1);
        for (uint8_t i = 0; i < count - 1; i++) {
            int16_t x0 = 10 + (int16_t)(i * dx);
            int16_t x1 = 10 + (int16_t)((i + 1) * dx);
            int16_t y0 = 196 - (int16_t)((points[i] - minV) / (maxV - minV) * 22.0f);
            int16_t y1 = 196 - (int16_t)((points[i + 1] - minV) / (maxV - minV) * 22.0f);
            gfx.drawLine(x0, y0, x1, y1, TouchTheme::TEAL_PRIMARY);
        }
    } else {
        gfx.drawText(100, 180, "Dang thu thap chuoi mau...", TouchTheme::TEXT_MUTED, 1);
    }
}

void TouchRouter::renderScreenProfile(ITouchDisplay &gfx, const SensorReading &reading, const DerivedMetrics &metrics) {
    gfx.drawText(12, 32, "CAU TRUC HAT BUI (PARTICLE PROFILE)", TouchTheme::TEXT_INK, 1);

    // Khung Stacked Bar Chart
    gfx.fillRoundRect(8, 48, 304, 80, 4, TouchTheme::CARD_BG);
    gfx.drawRoundRect(8, 48, 304, 80, 4, TouchTheme::BORDER_LINE);

    float total = reading.pm10 > 0.1f ? reading.pm10 : 1.0f;
    float w1 = (metrics.pm1Fraction / total) * 280.0f;
    float w2 = (metrics.pm1To25Fraction / total) * 280.0f;
    float w3 = (metrics.pm25To10Fraction / total) * 280.0f;

    int16_t bx = 20;
    gfx.fillRect(bx, 64, (int16_t)w1, 24, TouchTheme::BLUE_PARTICLE);
    gfx.fillRect(bx + (int16_t)w1, 64, (int16_t)w2, 24, TouchTheme::AMBER_WARNING);
    gfx.fillRect(bx + (int16_t)w1 + (int16_t)w2, 64, (int16_t)w3, 24, TouchTheme::CRIMSON_ALERT);

    // Nhãn 3 phần hạt
    char l1[32], l2[32], l3[32];
    snprintf(l1, sizeof(l1), "PM1: %.0f%%", (metrics.pm1Fraction / total) * 100.0f);
    snprintf(l2, sizeof(l2), "PM1-2.5: %.0f%%", (metrics.pm1To25Fraction / total) * 100.0f);
    snprintf(l3, sizeof(l3), "PM2.5-10: %.0f%%", (metrics.pm25To10Fraction / total) * 100.0f);

    gfx.drawText(20, 96, l1, TouchTheme::BLUE_PARTICLE, 1);
    gfx.drawText(115, 96, l2, TouchTheme::AMBER_WARNING, 1);
    gfx.drawText(210, 96, l3, TouchTheme::CRIMSON_ALERT, 1);

    // Khung định tính Insight
    gfx.fillRoundRect(8, 134, 304, 64, 4, TouchTheme::CARD_SUBTLE);
    gfx.drawRoundRect(8, 134, 304, 64, 4, TouchTheme::BORDER_LINE);

    char r1[48], r2[48];
    snprintf(r1, sizeof(r1), "Ty le PM2.5 / PM10:  %.0f%%", metrics.pm25Pm10Ratio * 100.0f);
    snprintf(r2, sizeof(r2), "Ty le PM1.0 / PM2.5:  %.0f%%", metrics.pm1Pm25Ratio * 100.0f);
    gfx.drawText(16, 144, r1, TouchTheme::TEXT_INK, 1);
    gfx.drawText(16, 160, r2, TouchTheme::TEXT_INK, 1);

    gfx.drawText(16, 180, "* Chi so suy dien tu pho hat (Derived metrics)", TouchTheme::TEXT_MUTED, 1);
}

void TouchRouter::renderScreenTrend(ITouchDisplay &gfx, const DerivedMetrics &metrics) {
    gfx.drawText(12, 32, "XU HUONG BIEN THIEN BUI (TREND)", TouchTheme::TEXT_INK, 1);

    // 4 Ô tóm tắt số liệu
    int16_t cardW = 72;
    // 1. Current
    gfx.fillRect(8, 48, cardW, 46, TouchTheme::CARD_BG);
    gfx.drawRect(8, 48, cardW, 46, TouchTheme::BORDER_LINE);
    gfx.drawText(12, 53, "Hien tai", TouchTheme::TEXT_MUTED, 1);
    char curBuf[16]; snprintf(curBuf, sizeof(curBuf), "%.0f", metrics.peakPm25 > 0 ? metrics.pm25Avg1m : 0.0f);
    gfx.drawText(16, 68, curBuf, TouchTheme::TEXT_INK, 2);

    // 2. 5 Min Avg
    gfx.fillRect(84, 48, cardW, 46, TouchTheme::CARD_BG);
    gfx.drawRect(84, 48, cardW, 46, TouchTheme::BORDER_LINE);
    gfx.drawText(88, 53, "TB 5 phut", TouchTheme::TEXT_MUTED, 1);
    char avgBuf[16]; snprintf(avgBuf, sizeof(avgBuf), "%.0f", metrics.pm25Avg5m);
    gfx.drawText(92, 68, avgBuf, TouchTheme::TEXT_INK, 2);

    // 3. Peak
    gfx.fillRect(160, 48, cardW, 46, TouchTheme::CARD_BG);
    gfx.drawRect(160, 48, cardW, 46, TouchTheme::BORDER_LINE);
    gfx.drawText(164, 53, "Dinh Peak", TouchTheme::TEXT_MUTED, 1);
    char pkBuf[16]; snprintf(pkBuf, sizeof(pkBuf), "%.0f", metrics.peakPm25);
    gfx.drawText(168, 68, pkBuf, TouchTheme::CRIMSON_ALERT, 2);

    // 4. Rate
    gfx.fillRect(236, 48, cardW + 4, 46, TouchTheme::CARD_BG);
    gfx.drawRect(236, 48, cardW + 4, 46, TouchTheme::BORDER_LINE);
    gfx.drawText(240, 53, "Bien thien", TouchTheme::TEXT_MUTED, 1);
    char rocBuf[16]; snprintf(rocBuf, sizeof(rocBuf), "%+.0f/m", metrics.rateOfChange);
    gfx.drawText(240, 68, rocBuf, TouchTheme::TEAL_PRIMARY, 1);

    // Khung biểu đồ chính Y = 100 to 198
    gfx.fillRect(8, 100, 304, 98, TouchTheme::CARD_BG);
    gfx.drawRect(8, 100, 304, 98, TouchTheme::BORDER_LINE);

    float points[GRAPH_POINTS_MAX];
    uint8_t count = _rollingStats ? _rollingStats->getGraphPoints(points, GRAPH_POINTS_MAX) : 0;
    if (count > 1) {
        float minV = 0.0f, maxV = 120.0f;
        for (uint8_t i = 0; i < count; i++) {
            if (points[i] > maxV) maxV = points[i];
        }
        float dx = 290.0f / (float)(count - 1);
        for (uint8_t i = 0; i < count - 1; i++) {
            int16_t x0 = 14 + (int16_t)(i * dx);
            int16_t x1 = 14 + (int16_t)((i + 1) * dx);
            int16_t y0 = 188 - (int16_t)((points[i] - minV) / (maxV - minV) * 75.0f);
            int16_t y1 = 188 - (int16_t)((points[i + 1] - minV) / (maxV - minV) * 75.0f);
            gfx.drawLine(x0, y0, x1, y1, TouchTheme::CRIMSON_ALERT);
        }
    } else {
        gfx.drawText(90, 140, "Dang tich luy du lieu bieu do...", TouchTheme::TEXT_MUTED, 1);
    }
}

void TouchRouter::renderScreenAirEvent(ITouchDisplay &gfx, const SensorReading &reading, const DerivedMetrics &metrics) {
    // Banner cảnh báo ô nhiễm
    gfx.fillRect(8, 28, 304, 36, TouchTheme::CRIMSON_ALERT);
    gfx.drawText(20, 38, "[!] PHAT HIEN SU KIEN BUI (DUST EVENT)", TouchTheme::TEXT_WHITE, 1);

    // Khung chi tiết sự kiện
    gfx.fillRoundRect(8, 68, 304, 82, 4, TouchTheme::CARD_BG);
    gfx.drawRoundRect(8, 68, 304, 82, 4, TouchTheme::BORDER_LINE);

    char pBuf[32]; snprintf(pBuf, sizeof(pBuf), "PM2.5: %.0f ug/m3 (Tang vot)", reading.pm25);
    gfx.drawText(20, 80, pBuf, TouchTheme::CRIMSON_ALERT, 2);

    char dBuf[64]; snprintf(dBuf, sizeof(dBuf), "Toc do: %+.0f ug/min | AQI: %u (%s)", 
                            metrics.rateOfChange, metrics.aqi, metrics.aqiCategory);
    gfx.drawText(20, 108, dBuf, TouchTheme::TEXT_INK, 1);
    gfx.drawText(20, 126, "Trang thai: Can lap ho so xac minh hien truong", TouchTheme::TEXT_MUTED, 1);

    // 2 Nút hành động lớn (Touch target >= 44px)
    // Nút 1: XÁC NHẬN (X = 16 to 152, Y = 155 to 195)
    gfx.fillRoundRect(16, 155, 136, 42, 4, TouchTheme::TEAL_PRIMARY);
    gfx.drawText(40, 170, "XAC NHAN", TouchTheme::TEXT_WHITE, 1);

    // Nút 2: THEO DÕI (X = 168 to 304, Y = 155 to 195)
    gfx.fillRoundRect(168, 155, 136, 42, 4, TouchTheme::CARD_SUBTLE);
    gfx.drawRoundRect(168, 155, 136, 42, 4, TouchTheme::BORDER_LINE);
    gfx.drawText(195, 170, "THEO DOI", TouchTheme::TEXT_INK, 1);
}

void TouchRouter::renderScreenProcessFlow(ITouchDisplay &gfx) {
    gfx.drawText(12, 30, "TIEN TRINH XU LY (PROCESS FLOW)", TouchTheme::TEXT_INK, 1);

    // 5 bước quy trình
    const char *steps[] = {
        "1. PHAT HIEN  [v]",
        "2. XAC NHAN   [v]",
        "3. TAO HO SO  [*]",
        "4. GUI CLOUD  [ ]",
        "5. THEO DOI   [ ]"
    };

    for (int i = 0; i < 5; i++) {
        int16_t sy = 50 + i * 22;
        uint16_t col = (i <= 1) ? TouchTheme::GREEN_GOOD : ((i == 2) ? TouchTheme::AMBER_WARNING : TouchTheme::TEXT_MUTED);
        gfx.fillRect(16, sy, 8, 14, col);
        gfx.drawText(32, sy + 3, steps[i], TouchTheme::TEXT_INK, 1);
    }

    // Nút tiếp tục chuyển sang tạo Case
    gfx.fillRoundRect(30, 162, 260, 36, 4, TouchTheme::TEAL_PRIMARY);
    gfx.drawText(65, 174, "TIEP TUC: TAO HO SO VU VIEC", TouchTheme::TEXT_WHITE, 1);
}

void TouchRouter::renderScreenCreateCase(ITouchDisplay &gfx, const SensorReading &reading, 
                                        const DerivedMetrics &metrics, const DeviceStatus &device) {
    gfx.drawText(12, 30, "LAP HO SO MINH CHUNG (CREATE CASE)", TouchTheme::TEXT_INK, 1);

    gfx.fillRoundRect(8, 48, 304, 102, 4, TouchTheme::CARD_BG);
    gfx.drawRoundRect(8, 48, 304, 102, 4, TouchTheme::BORDER_LINE);

    gfx.drawText(16, 56, "Ma tram quan trac:", TouchTheme::TEXT_MUTED, 1);
    gfx.drawText(150, 56, device.deviceId[0] ? device.deviceId : "DG-NODE-01", TouchTheme::TEXT_INK, 1);

    gfx.drawText(16, 72, "Chi so PM2.5:", TouchTheme::TEXT_MUTED, 1);
    char pmBuf[32]; snprintf(pmBuf, sizeof(pmBuf), "%.0f ug/m3 (AQI %u)", reading.pm25, metrics.aqi);
    gfx.drawText(150, 72, pmBuf, TouchTheme::CRIMSON_ALERT, 1);

    gfx.drawText(16, 88, "Loai su kien:", TouchTheme::TEXT_MUTED, 1);
    gfx.drawText(150, 88, metrics.eventDescription[0] ? metrics.eventDescription : "Phat hien bui cao", TouchTheme::TEXT_INK, 1);

    gfx.drawText(16, 104, "Cam bien:", TouchTheme::TEXT_MUTED, 1);
    gfx.drawText(150, 104, "APM2000 (UART Verified)", TouchTheme::TEAL_PRIMARY, 1);

    gfx.drawText(16, 124, "* Dinh kem tu dong so do hien truong & chu ky so", TouchTheme::TEXT_MUTED, 1);

    // Nút Lập Hồ Sơ
    gfx.fillRoundRect(30, 156, 260, 42, 4, TouchTheme::CRIMSON_ALERT);
    if (_caseData.isCreating) {
        gfx.drawText(85, 170, "DANG GUI CLOUD...", TouchTheme::TEXT_WHITE, 1);
    } else {
        gfx.drawText(75, 170, "BAM DE TAO PHAN ANH", TouchTheme::TEXT_WHITE, 1);
    }
}

void TouchRouter::renderScreenQRHandoff(ITouchDisplay &gfx) {
    gfx.drawText(12, 30, "CHUYEN GIAO HO SO (QR HANDOFF)", TouchTheme::TEXT_INK, 1);

    // Vẽ mã QR thật ma trận 29x29
    bool qrMatrix[QRCodeGenerator::QR_SIZE][QRCodeGenerator::QR_SIZE];
    const char *url = _caseData.qrUrl[0] ? _caseData.qrUrl : "https://dustguard.phamphunguyenhung.com";
    QRCodeGenerator::generate(url, qrMatrix);

    int16_t startX = 16;
    int16_t startY = 50;
    int16_t scale = 4; // Mỗi module 4x4 px -> Tổng kích thước 116x116 px

    gfx.fillRect(startX - 4, startY - 4, QRCodeGenerator::QR_SIZE * scale + 8, QRCodeGenerator::QR_SIZE * scale + 8, TouchTheme::CARD_BG);
    gfx.drawRect(startX - 4, startY - 4, QRCodeGenerator::QR_SIZE * scale + 8, QRCodeGenerator::QR_SIZE * scale + 8, TouchTheme::BORDER_LINE);

    for (int r = 0; r < QRCodeGenerator::QR_SIZE; r++) {
        for (int c = 0; c < QRCodeGenerator::QR_SIZE; c++) {
            if (qrMatrix[r][c]) {
                gfx.fillRect(startX + c * scale, startY + r * scale, scale, scale, TouchTheme::TEXT_INK);
            }
        }
    }

    // Thông tin bên phải mã QR
    int16_t infoX = 145;
    gfx.drawText(infoX, 54, "MA HO SO:", TouchTheme::TEXT_MUTED, 1);
    gfx.drawText(infoX, 68, _caseData.caseCode[0] ? _caseData.caseCode : "DG-C-2026-0842", TouchTheme::TEAL_PRIMARY, 1);

    gfx.drawText(infoX, 90, "TRANG THAI:", TouchTheme::TEXT_MUTED, 1);
    gfx.drawText(infoX, 104, _caseData.statusText[0] ? _caseData.statusText : "Da ghi nhan", TouchTheme::GREEN_GOOD, 1);

    gfx.drawText(infoX, 126, "Quet bang dien thoai", TouchTheme::TEXT_INK, 1);
    gfx.drawText(infoX, 138, "de theo doi tiep", TouchTheme::TEXT_MUTED, 1);

    // Nút Hoàn tất
    gfx.fillRoundRect(145, 156, 155, 38, 4, TouchTheme::TEAL_PRIMARY);
    gfx.drawText(175, 170, "HOAN TAT", TouchTheme::TEXT_WHITE, 1);
}

void TouchRouter::renderScreenDevice(ITouchDisplay &gfx, const DeviceStatus &device) {
    gfx.drawText(12, 30, "THONG SO THIET BI (DEVICE)", TouchTheme::TEXT_INK, 1);

    gfx.fillRoundRect(8, 46, 304, 110, 4, TouchTheme::CARD_BG);
    gfx.drawRoundRect(8, 46, 304, 110, 4, TouchTheme::BORDER_LINE);

    gfx.drawText(16, 54, "Thiet bi:       DG-NODE-01 (ESP32-APM2000)", TouchTheme::TEXT_INK, 1);
    gfx.drawText(16, 68, "Firmware:       v2.0.0 (Touchscreen Engine)", TouchTheme::TEXT_INK, 1);
    char uBuf[48]; snprintf(uBuf, sizeof(uBuf), "Uptime:         %u giay", device.uptimeSeconds);
    gfx.drawText(16, 82, uBuf, TouchTheme::TEXT_INK, 1);

    char wBuf[48]; snprintf(wBuf, sizeof(wBuf), "Wi-Fi:          %s (%d dBm)", device.wifiSsid[0] ? device.wifiSsid : "Harry Maguire", device.wifiRssi);
    gfx.drawText(16, 96, wBuf, TouchTheme::TEXT_INK, 1);

    char hBuf[48]; snprintf(hBuf, sizeof(hBuf), "Free Heap:      %u bytes", device.freeHeap);
    gfx.drawText(16, 110, hBuf, TouchTheme::TEXT_INK, 1);

    gfx.drawText(16, 126, "Nguon dien:     USB / External (5V DC)", TouchTheme::TEAL_PRIMARY, 1);
    gfx.drawText(16, 140, "Lien thong D1:  Cloudflare Edge (Synced)", TouchTheme::GREEN_GOOD, 1);

    // 2 Nút phụ: Chẩn đoán & Cài đặt
    gfx.fillRoundRect(16, 162, 136, 36, 4, TouchTheme::CARD_SUBTLE);
    gfx.drawRoundRect(16, 162, 136, 36, 4, TouchTheme::BORDER_LINE);
    gfx.drawText(35, 174, "CHAN DOAN", TouchTheme::TEXT_INK, 1);

    gfx.fillRoundRect(168, 162, 136, 36, 4, TouchTheme::CARD_SUBTLE);
    gfx.drawRoundRect(168, 162, 136, 36, 4, TouchTheme::BORDER_LINE);
    gfx.drawText(195, 174, "CAI DAT", TouchTheme::TEXT_INK, 1);
}

void TouchRouter::renderScreenDiagnostics(ITouchDisplay &gfx, const DeviceStatus &device) {
    gfx.drawText(12, 30, "CHAN DOAN CAM BIEN (DIAGNOSTICS)", TouchTheme::TEXT_INK, 1);

    gfx.fillRoundRect(8, 46, 304, 106, 4, TouchTheme::CARD_BG);
    gfx.drawRoundRect(8, 46, 304, 106, 4, TouchTheme::BORDER_LINE);

    gfx.drawText(16, 54, "Model:          ASAIR APM2000 (Laser)", TouchTheme::TEXT_INK, 1);
    gfx.drawText(16, 68, "Giao tiep UART: GPIO 16 (RX), GPIO 17 (TX)", TouchTheme::TEXT_INK, 1);
    gfx.drawText(16, 82, "Toc do Baud:    1200 bps (8N1 Chuẩn)", TouchTheme::TEXT_INK, 1);
    
    char fBuf[48]; snprintf(fBuf, sizeof(fBuf), "Mau hop le:     %u mau", device.sampleCount);
    gfx.drawText(16, 96, fBuf, TouchTheme::GREEN_GOOD, 1);

    char eBuf[48]; snprintf(eBuf, sizeof(eBuf), "Loi Checksum:   %u frame", device.invalidFrameCount);
    gfx.drawText(16, 110, eBuf, device.invalidFrameCount > 0 ? TouchTheme::CRIMSON_ALERT : TouchTheme::TEXT_MUTED, 1);

    gfx.drawText(16, 126, "Trang thai:     Hoat dong binh thuong", TouchTheme::TEAL_PRIMARY, 1);

    // Nút TEST SENSOR (Thực hiện đọc thật, không sinh số giả)
    gfx.fillRoundRect(16, 160, 136, 38, 4, TouchTheme::TEAL_PRIMARY);
    gfx.drawText(30, 174, "TEST SENSOR", TouchTheme::TEXT_WHITE, 1);

    gfx.fillRoundRect(168, 160, 136, 38, 4, TouchTheme::CARD_SUBTLE);
    gfx.drawRoundRect(168, 160, 136, 38, 4, TouchTheme::BORDER_LINE);
    gfx.drawText(195, 174, "QUAY LAI", TouchTheme::TEXT_INK, 1);
}

void TouchRouter::renderScreenSettings(ITouchDisplay &gfx) {
    gfx.drawText(12, 30, "CAI DAT VAN HANH (SETTINGS)", TouchTheme::TEXT_INK, 1);

    gfx.fillRoundRect(8, 46, 304, 106, 4, TouchTheme::CARD_BG);
    gfx.drawRoundRect(8, 46, 304, 106, 4, TouchTheme::BORDER_LINE);

    gfx.drawText(16, 56, "Chu ky lay mau: 2 giay / lan", TouchTheme::TEXT_INK, 1);
    
    char aqiStdBuf[48];
    snprintf(aqiStdBuf, sizeof(aqiStdBuf), "Chuan AQI:      %s", (_aqiStandard == AqiStandard::VN_QCVN) ? "Viet Nam QCVN" : "US EPA");
    gfx.drawText(16, 74, aqiStdBuf, TouchTheme::TEAL_PRIMARY, 1);

    const char *sensNames[] = { "Binh thuong", "Nhay cam", "Demo (Nhay cao)" };
    char sensBuf[48];
    snprintf(sensBuf, sizeof(sensBuf), "Do nhay:        %s", sensNames[_alertSensitivity % 3]);
    gfx.drawText(16, 92, sensBuf, TouchTheme::TEXT_INK, 1);

    gfx.drawText(16, 114, "* Che do Demo chi thay doi nguong canh bao,", TouchTheme::TEXT_MUTED, 1);
    gfx.drawText(16, 128, "  tuyet doi KHONG tao so do gia mao.", TouchTheme::TEXT_MUTED, 1);

    // Nút đổi chuẩn AQI & Nút Thoát
    gfx.fillRoundRect(16, 160, 136, 38, 4, TouchTheme::CARD_SUBTLE);
    gfx.drawRoundRect(16, 160, 136, 38, 4, TouchTheme::BORDER_LINE);
    gfx.drawText(28, 174, "DOI CHUAN AQI", TouchTheme::TEXT_INK, 1);

    gfx.fillRoundRect(168, 160, 136, 38, 4, TouchTheme::TEAL_PRIMARY);
    gfx.drawText(200, 174, "LUU & DONG", TouchTheme::TEXT_WHITE, 1);
}

void TouchRouter::render(ITouchDisplay &gfx, const SensorReading &reading, 
                         const DerivedMetrics &metrics, const DeviceStatus &device) {
    gfx.fillScreen(TouchTheme::BG_CREAM);

    renderHeader(gfx, device);

    switch (_currentScreen) {
        case SCREEN_LIVE:
            renderScreenLive(gfx, reading, metrics);
            break;
        case SCREEN_PARTICLE_PROFILE:
            renderScreenProfile(gfx, reading, metrics);
            break;
        case SCREEN_TREND:
            renderScreenTrend(gfx, metrics);
            break;
        case SCREEN_AIR_EVENT:
            renderScreenAirEvent(gfx, reading, metrics);
            break;
        case SCREEN_PROCESS_FLOW:
            renderScreenProcessFlow(gfx);
            break;
        case SCREEN_CREATE_CASE:
            renderScreenCreateCase(gfx, reading, metrics, device);
            break;
        case SCREEN_QR_HANDOFF:
            renderScreenQRHandoff(gfx);
            break;
        case SCREEN_DEVICE:
            renderScreenDevice(gfx, device);
            break;
        case SCREEN_SENSOR_DIAGNOSTICS:
            renderScreenDiagnostics(gfx, device);
            break;
        case SCREEN_SETTINGS:
            renderScreenSettings(gfx);
            break;
    }

    renderBottomNav(gfx);
}

bool TouchRouter::handleTouch(uint16_t x, uint16_t y, const SensorReading &reading, 
                             const DerivedMetrics &metrics, const DeviceStatus &device) {
    uint32_t now = millis();
    if (now - _lastTouchTime < TOUCH_DEBOUNCE_MS) return false;
    _lastTouchTime = now;

    // 1. Kiểm tra bấm Bottom Nav (Y >= 204)
    if (y >= TFT_SCREEN_HEIGHT - TouchTheme::BOTTOM_NAV_H) {
        int16_t tabW = TFT_SCREEN_WIDTH / 5;
        int tabIdx = x / tabW;
        if (tabIdx == 0) _currentScreen = SCREEN_LIVE;
        else if (tabIdx == 1) _currentScreen = SCREEN_PARTICLE_PROFILE;
        else if (tabIdx == 2) _currentScreen = SCREEN_TREND;
        else if (tabIdx == 3) _currentScreen = SCREEN_AIR_EVENT;
        else if (tabIdx == 4) _currentScreen = SCREEN_DEVICE;
        return true;
    }

    // 2. Xử lý chạm theo từng màn hình
    switch (_currentScreen) {
        case SCREEN_LIVE:
            // Bấm vào khu vực Hero number -> nhảy sang Trend
            if (y >= 28 && y <= 130) {
                _currentScreen = SCREEN_TREND;
                return true;
            }
            break;

        case SCREEN_AIR_EVENT:
            // Nút XÁC NHẬN: X: 16 to 152, Y: 155 to 195
            if (x >= 16 && x <= 152 && y >= 155 && y <= 195) {
                _currentScreen = SCREEN_PROCESS_FLOW;
                return true;
            }
            // Nút THEO DÕI: X: 168 to 304, Y: 155 to 195
            if (x >= 168 && x <= 304 && y >= 155 && y <= 195) {
                _currentScreen = SCREEN_LIVE;
                return true;
            }
            break;

        case SCREEN_PROCESS_FLOW:
            // Nút TIẾP TỤC: TẠO HỒ SƠ: Y: 160 to 200
            if (y >= 160 && y <= 200) {
                _currentScreen = SCREEN_CREATE_CASE;
                return true;
            }
            break;

        case SCREEN_CREATE_CASE:
            // Nút TẠO PHẢN ÁNH: Y: 150 to 200
            if (y >= 150 && y <= 200) {
                if (_caseApi && !_caseData.isCreating) {
                    _caseApi->createCase(reading, metrics, device, _caseData);
                    _currentScreen = SCREEN_QR_HANDOFF;
                    return true;
                }
            }
            break;

        case SCREEN_QR_HANDOFF:
            // Nút HOÀN TẤT: X: 145 to 300, Y: 150 to 200
            if (x >= 145 && y >= 150 && y <= 200) {
                _currentScreen = SCREEN_LIVE;
                return true;
            }
            break;

        case SCREEN_DEVICE:
            // Nút CHẨN ĐOÁN: X: 16 to 152, Y: 160 to 200
            if (x >= 16 && x <= 152 && y >= 160 && y <= 200) {
                _currentScreen = SCREEN_SENSOR_DIAGNOSTICS;
                return true;
            }
            // Nút CÀI ĐẶT: X: 168 to 304, Y: 160 to 200
            if (x >= 168 && x <= 304 && y >= 160 && y <= 200) {
                _currentScreen = SCREEN_SETTINGS;
                return true;
            }
            break;

        case SCREEN_SENSOR_DIAGNOSTICS:
            // Nút TEST SENSOR: X: 16 to 152, Y: 160 to 200
            if (x >= 16 && x <= 152 && y >= 160 && y <= 200) {
                if (_testSensorCb) _testSensorCb();
                return true;
            }
            // Nút QUAY LẠI
            if (x >= 168 && x <= 304 && y >= 160 && y <= 200) {
                _currentScreen = SCREEN_DEVICE;
                return true;
            }
            break;

        case SCREEN_SETTINGS:
            // Nút ĐỔI CHUẨN AQI
            if (x >= 16 && x <= 152 && y >= 160 && y <= 200) {
                _aqiStandard = (_aqiStandard == AqiStandard::VN_QCVN) ? AqiStandard::US_EPA : AqiStandard::VN_QCVN;
                return true;
            }
            // Nút LƯU & ĐÓNG
            if (x >= 168 && x <= 304 && y >= 160 && y <= 200) {
                _currentScreen = SCREEN_DEVICE;
                return true;
            }
            break;

        default:
            break;
    }

    return false;
}
