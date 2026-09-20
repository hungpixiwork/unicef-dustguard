#!/usr/bin/env python3
"""
DustGuard IoT Node — API Ingest Verifier
Kiểm thử đẩy dữ liệu lên backend Cloudflare Worker với chữ ký mật mã HMAC-SHA256
"""
import hmac
import hashlib
import json
import time
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:3001/api/iot/v1/readings"
DEVICE_ID = "DG-NODE-011"
SECRET_KEY = "dustguard_secret_key_2026"

def send_telemetry(pm1, pm25, pm10, tamper_sign=False):
    payload = {
        "deviceId": DEVICE_ID,
        "timestamp": int(time.time()),
        "sensors": {
            "pm1": pm1,
            "pm25": pm25,
            "pm10": pm10
        },
        "system": {
            "wifiRssi": -55,
            "uptime": 3600,
            "firmware": "1.0.0"
        }
    }

    raw_body = json.dumps(payload).encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()

    if tamper_sign:
        signature = "deadbeef" + signature[8:]

    req = urllib.request.Request(API_URL, data=raw_body, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('x-device-id', DEVICE_ID)
    req.add_header('x-signature', signature)
    req.add_header('x-device-secret', SECRET_KEY)

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"[OK] Response HTTP {resp.status}: {data.get('message')}")
            print(f"     Recorded ID: {data.get('data', {}).get('id')}")
            return True
    except urllib.error.HTTPError as e:
        err_data = e.read().decode('utf-8')
        print(f"[ERROR] HTTP {e.code}: {err_data}")
        return False
    except Exception as e:
        print(f"[CONNECTION FAILED]: {e}")
        return False

def main():
    print("==================================================")
    print(" DustGuard IoT Node — API Integration Test")
    print(f" Target: {API_URL} (Device: {DEVICE_ID})")
    print("==================================================")

    print("\n1. Test đẩy dữ liệu hợp lệ (Normal Air):")
    send_telemetry(12.4, 24.5, 41.8)

    print("\n2. Test đẩy dữ liệu giả mạo chữ ký (Tampered HMAC):")
    send_telemetry(12.4, 24.5, 41.8, tamper_sign=True)

    print("\n3. Test dữ liệu vượt ngưỡng cảnh báo QCVN 05:2023 (High Dust):")
    send_telemetry(38.0, 78.5, 135.0)

if __name__ == '__main__':
    main()
