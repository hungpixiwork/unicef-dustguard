#!/usr/bin/env python3
"""
DustGuard IoT Node — Serial Monitor Tool
Đọc trực tiếp cổng COM từ ESP32 DevKit và hiển thị log chẩn đoán
"""
import sys
import time

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("Vui lòng cài đặt pyserial: pip install pyserial")
    sys.exit(1)

def list_ports():
    ports = serial.tools.list_ports.comports()
    for p in ports:
        print(f"- {p.device}: {p.description}")
    return [p.device for p in ports]

def main():
    print("==================================================")
    print(" DustGuard IoT Node — Serial Monitor (115200 bps)")
    print("==================================================")
    ports = list_ports()
    if not ports:
        print("Không tìm thấy cổng COM nào. Vui lòng cắm ESP32 vào máy tính.")
        return

    port = sys.argv[1] if len(sys.argv) > 1 else ports[0]
    print(f"Đang mở cổng {port}...")

    try:
        ser = serial.Serial(port, 115200, timeout=1)
        print("Đã kết nối! Đang lắng nghe dữ liệu từ ESP32...\n")
        while True:
            line = ser.readline().decode('utf-8', errors='replace').strip()
            if line:
                print(f"[{time.strftime('%H:%M:%S')}] {line}")
    except KeyboardInterrupt:
        print("\nĐã dừng monitor.")
    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == '__main__':
    main()
