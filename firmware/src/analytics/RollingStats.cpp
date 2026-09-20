#include "RollingStats.h"
#include <Arduino.h>
#include <string.h>
#include <stdio.h>
#include <math.h>

RollingStats::RollingStats() {
    reset();
}

void RollingStats::reset() {
    _head = 0;
    _count = 0;
    _peakPm25 = 0.0f;
    _peakPm10 = 0.0f;
    _peakTimeStr[0] = '\0';
    _cumulativeExposure = 0.0;
    _lastSampleTimeMs = 0;
    for (size_t i = 0; i < ROLLING_BUFFER_5M_SIZE; i++) {
        _pm25Buffer[i] = 0.0f;
        _pm10Buffer[i] = 0.0f;
        _timeBuffer[i] = 0;
    }
}

void RollingStats::addSample(const SensorReading &reading) {
    if (!reading.valid) return;

    uint32_t nowMs = millis();

    // 1. Tích lũy phơi nhiễm (Exposure Index)
    if (_lastSampleTimeMs > 0 && nowMs > _lastSampleTimeMs) {
        float dtSec = (float)(nowMs - _lastSampleTimeMs) / 1000.0f;
        if (dtSec > 0.1f && dtSec < 60.0f) {
            _cumulativeExposure += (double)(reading.pm25 * dtSec);
        }
    }
    _lastSampleTimeMs = nowMs;

    // 2. Cập nhật đỉnh Peak
    if (reading.pm25 > _peakPm25) {
        _peakPm25 = reading.pm25;
        // Format thời gian HH:MM:SS từ uptime
        uint32_t totalSec = nowMs / 1000;
        uint32_t h = (totalSec / 3600) % 24;
        uint32_t m = (totalSec / 60) % 60;
        uint32_t s = totalSec % 60;
        snprintf(_peakTimeStr, sizeof(_peakTimeStr), "%02u:%02u:%02u", h, m, s);
    }
    if (reading.pm10 > _peakPm10) {
        _peakPm10 = reading.pm10;
    }

    // 3. Đưa vào Ring Buffer
    _pm25Buffer[_head] = reading.pm25;
    _pm10Buffer[_head] = reading.pm10;
    _timeBuffer[_head] = nowMs;

    _head = (_head + 1) % ROLLING_BUFFER_5M_SIZE;
    if (_count < ROLLING_BUFFER_5M_SIZE) {
        _count++;
    }
}

void RollingStats::compute(DerivedMetrics &metrics) {
    if (_count == 0) return;

    metrics.peakPm25 = _peakPm25;
    metrics.peakPm10 = _peakPm10;
    strncpy(metrics.peakTimeStr, _peakTimeStr, sizeof(metrics.peakTimeStr) - 1);
    // Exposure Index quy chuẩn (µg/m³ · giờ)
    metrics.exposureIndex = (float)(_cumulativeExposure / 3600.0);

    // Tính trung bình 1 phút (tối đa 30 mẫu gần nhất)
    uint16_t samples1m = (_count < ROLLING_BUFFER_1M_SIZE) ? _count : ROLLING_BUFFER_1M_SIZE;
    float sum25_1m = 0.0f;
    for (uint16_t i = 0; i < samples1m; i++) {
        int idx = (int)_head - 1 - i;
        if (idx < 0) idx += ROLLING_BUFFER_5M_SIZE;
        sum25_1m += _pm25Buffer[idx];
    }
    metrics.pm25Avg1m = sum25_1m / (float)samples1m;

    // Tính trung bình 5 phút (toàn bộ buffer hiện có)
    float sum25_5m = 0.0f;
    float sum10_5m = 0.0f;
    for (uint16_t i = 0; i < _count; i++) {
        sum25_5m += _pm25Buffer[i];
        sum10_5m += _pm10Buffer[i];
    }
    metrics.pm25Avg5m = sum25_5m / (float)_count;
    metrics.pm10Avg5m = sum10_5m / (float)_count;

    // Chênh lệch hiện tại so với TB 5 phút
    int latestIdx = (int)_head - 1;
    if (latestIdx < 0) latestIdx += ROLLING_BUFFER_5M_SIZE;
    float currentPm25 = _pm25Buffer[latestIdx];

    if (metrics.pm25Avg5m > 0.5f) {
        metrics.currentVsAvg5mPercent = ((currentPm25 - metrics.pm25Avg5m) / metrics.pm25Avg5m) * 100.0f;
    } else {
        metrics.currentVsAvg5mPercent = 0.0f;
    }

    // Tính tốc độ biến thiên ΔPM2.5 / phút dựa trên mẫu cách đây 60 giây (hoặc mẫu cũ nhất trong 1m)
    if (_count >= 2) {
        int oldIdx = (int)_head - samples1m;
        if (oldIdx < 0) oldIdx += ROLLING_BUFFER_5M_SIZE;
        
        float dtMin = (float)(_timeBuffer[latestIdx] - _timeBuffer[oldIdx]) / 60000.0f;
        if (dtMin >= 0.1f) {
            metrics.rateOfChange = (currentPm25 - _pm25Buffer[oldIdx]) / dtMin;
        } else {
            metrics.rateOfChange = 0.0f;
        }
    } else {
        metrics.rateOfChange = 0.0f;
    }

    // Đánh giá TrendState
    if (metrics.rateOfChange >= RAPID_RISE_RATE_PER_MIN) {
        metrics.trend = TrendState::RAPID_RISE;
    } else if (metrics.rateOfChange >= 3.0f) {
        metrics.trend = TrendState::INCREASING;
    } else if (metrics.rateOfChange <= -3.0f) {
        metrics.trend = TrendState::DECREASING;
    } else {
        metrics.trend = TrendState::STABLE;
    }
}

uint8_t RollingStats::getGraphPoints(float *outPoints, uint8_t maxPoints) const {
    if (!outPoints || maxPoints == 0 || _count == 0) return 0;

    uint8_t n = (_count < maxPoints) ? (uint8_t)_count : maxPoints;
    for (uint8_t i = 0; i < n; i++) {
        int idx = (int)_head - n + i;
        if (idx < 0) idx += ROLLING_BUFFER_5M_SIZE;
        outPoints[i] = _pm25Buffer[idx];
    }
    return n;
}
