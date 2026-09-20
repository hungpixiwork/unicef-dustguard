# Đặc Tả Giao Thức API DustGuard IoT (API Contract)

## 1. Phương Thức Xác Thực & Bảo Mật
Các request từ IoT Node gửi lên Cloudflare Worker được xác thực bằng mật mã:
- Header `x-device-id`: Định danh phần cứng của trạm đo (vd: `DG-NODE-011`).
- Header `x-signature`: Chuỗi Hex chữ ký HMAC-SHA256 tạo từ chuỗi raw JSON payload kết hợp khóa bí mật `device_secret`.
- Header `x-device-secret`: Khóa bí mật (Pre-shared key) nạp sẵn trong firmware ESP32.

---

## 2. Các Endpoints Chính

### 2.1. Đẩy Dữ Liệu Đo Đạc (Ingest Telemetry)
- **Method**: `POST`
- **Path**: `/api/iot/v1/readings`
- **Request Body**:
```json
{
  "deviceId": "DG-NODE-011",
  "timestamp": 1789275600,
  "sensors": {
    "pm1": 12.4,
    "pm25": 28.5,
    "pm10": 41.8
  },
  "system": {
    "wifiRssi": -58,
    "uptime": 3812,
    "firmware": "1.0.0"
  }
}
```

- **Phản Hồi Thành Công (HTTP 201 Created)**:
```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "id": "iot_rd_1789275600_011",
    "deviceId": "DG-NODE-011",
    "pm1": 12.4,
    "pm25": 28.5,
    "pm10": 41.8,
    "wifiRssi": -58,
    "uptime": 3812,
    "capturedAt": "2026-09-13T04:20:00.000Z",
    "receivedAt": "2026-09-13T04:20:01.000Z",
    "verified": true
  },
  "message": "Tiếp nhận dữ liệu đo DustGuard IoT thành công."
}
```

- **Phản Hồi Lỗi Xác Thực (HTTP 401 Unauthorized - RFC 7807)**:
```json
{
  "type": "https://dustguard.vn/errors/401",
  "title": "Unauthorized",
  "status": 401,
  "code": "INVALID_SIGNATURE",
  "detail": "Chữ ký HMAC-SHA256 không hợp lệ hoặc thiết bị bị từ chối.",
  "instance": "/api/iot/v1/readings"
}
```

---

### 2.2. Lấy Thông Tin Mới Nhất Của Thiết Bị
- **Method**: `GET`
- **Path**: `/api/iot/v1/devices/:deviceId/latest`
- **Response (HTTP 200 OK)**:
```json
{
  "status": "success",
  "data": {
    "id": "iot_rd_1789275600_011",
    "device_id": "DG-NODE-011",
    "pm1": 12.4,
    "pm25": 28.5,
    "pm10": 41.8,
    "wifi_rssi": -58,
    "uptime": 3812,
    "captured_at": "2026-09-13T04:20:00.000Z",
    "received_at": "2026-09-13T04:20:01.000Z"
  }
}
```

---

### 2.3. Lấy Lịch Sử Mẫu Đo (Time-series Readings)
- **Method**: `GET`
- **Path**: `/api/iot/v1/devices/:deviceId/readings?limit=50&offset=0`
- **Response (HTTP 200 OK)**:
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "iot_rd_1",
        "device_id": "DG-NODE-011",
        "pm1": 12.4,
        "pm25": 28.5,
        "pm10": 41.8,
        "wifi_rssi": -58,
        "uptime": 3812,
        "captured_at": "2026-09-13T04:20:00.000Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "count": 1
    }
  }
}
```

---

### 2.4. Gửi Nhịp Tim (Heartbeat)
- **Method**: `POST`
- **Path**: `/api/iot/v1/devices/:deviceId/heartbeat`
- **Response (HTTP 200 OK)**:
```json
{
  "status": "success",
  "data": {
    "deviceId": "DG-NODE-011",
    "status": "ONLINE",
    "timestamp": "2026-09-13T04:20:00.000Z"
  },
  "message": "Nhận tín hiệu Heartbeat thiết bị thành công."
}
```
