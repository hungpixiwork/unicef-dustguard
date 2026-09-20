#include "EventDetector.h"
#include "config.h"
#include <stdio.h>
#include <string.h>

void EventDetector::evaluate(const SensorReading &reading, DerivedMetrics &metrics) {
    float pm25 = reading.pm25;
    float rate = metrics.rateOfChange;
    float avg5m = metrics.pm25Avg5m;

    // 1. Kiểm tra Spike (Đột biến tức thì: Tăng nhanh trong thời gian ngắn)
    if (rate >= SPIKE_THRESHOLD_DELTA_PM25 || (metrics.currentVsAvg5mPercent >= 80.0f && pm25 > 50.0f)) {
        metrics.eventState = DustEventSeverity::SPIKE;
        snprintf(metrics.eventDescription, sizeof(metrics.eventDescription),
                 "PM2.5 tang vot +%.0f ug/m3/min!", rate);
        return;
    }

    // 2. Kiểm tra Sustained High (Nồng độ cao kéo dài trên 5 phút)
    if (avg5m >= SUSTAINED_HIGH_PM25 && pm25 >= SUSTAINED_HIGH_PM25) {
        metrics.eventState = DustEventSeverity::SUSTAINED_HIGH;
        snprintf(metrics.eventDescription, sizeof(metrics.eventDescription),
                 "PM2.5 cao lien tuc tren %.0f ug/m3 (5 phut)", SUSTAINED_HIGH_PM25);
        return;
    }

    // 3. Mức High
    if (pm25 >= 150.0f) {
        metrics.eventState = DustEventSeverity::HIGH_LEVEL;
        snprintf(metrics.eventDescription, sizeof(metrics.eventDescription),
                 "Chi so PM2.5 o muc o nhiem cao (%.0f ug/m3)", pm25);
        return;
    }

    // 4. Mức Elevated
    if (pm25 >= ELEVATED_PM25) {
        metrics.eventState = DustEventSeverity::ELEVATED;
        snprintf(metrics.eventDescription, sizeof(metrics.eventDescription),
                 "Nong do bui tang tren muc trung binh");
        return;
    }

    // 5. Bình thường
    metrics.eventState = DustEventSeverity::NORMAL;
    snprintf(metrics.eventDescription, sizeof(metrics.eventDescription),
             "Chat luong khong khi on dinh");
}
