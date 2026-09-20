#!/usr/bin/env python3
"""
DustGuard IoT Node — Mock Sensor Simulator (Development Only)
Dành cho việc kiểm thử Dashboard và API khi chưa có phần cứng vật lý bên cạnh.
"""
import time
import math
import json
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:3001/api/iot/v1/readings"
DEVICE_ID = "DG-NODE-011"
SECRET = "dustguard_secret_key_2026"

def run_mock(interval=5):
    print(f"Bắt đầu giả lập phát dữ liệu cảm biến APM2000 lên {API_URL}...")
    step = 0
    while True:
        step += 1
        # Sinh dao động tự nhiên quanh mức an toàn và thỉnh thoảng tăng nhẹ
        pm25 = round(22.0 + 8.0 * math.sin(step * 0.2) + (5.0 if step % 7 == 0 else 0.0), 1)
        pm1 = round(pm25 * 0.45, 1)
        pm10 = round(pm25 * 1.5, 1)

        payload = {
            "deviceId": DEVICE_ID,
            "timestamp": int(time.time()),
            "sensors": { "pm1": pm1, "pm25": pm25, "pm10": pm10 },
            "system": { "wifiRssi": -55, "uptime": step * interval, "firmware": "1.0.0" }
        }

        req = urllib.request.Request(API_URL, data=json.dumps(payload).encode('utf-8'), method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('x-device-id', DEVICE_ID)
        req.add_header('x-device-secret', SECRET)

        try:
            with urllib.request.urlopen(req) as resp:
                print(f"[{time.strftime('%H:%M:%S')}] Đã gửi mẫu #{step}: PM2.5={pm25}, PM10={pm10} -> HTTP {resp.status}")
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] Lỗi gửi mẫu #{step}: {e}")

        time.sleep(interval)

if __name__ == '__main__':
    try:
        run_mock(5)
    except KeyboardInterrupt:
        print("\nĐã dừng mock simulator.")
