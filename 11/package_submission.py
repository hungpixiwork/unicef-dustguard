#!/usr/bin/env python3
"""
DustGuard VN — Script nén 11-Code.zip sạch, chuẩn quy cách SIC 2026
Lọc bỏ hoàn toàn node_modules, .git, .pio, cache, database lớn (>1MB)
"""
import os
import zipfile
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_ZIP = os.path.abspath(os.path.join(os.path.dirname(__file__), "11-Code.zip"))

EXCLUDE_DIRS = {
    'node_modules', '.git', '.pio', 'dist', '.wrangler', '.vite',
    '.gemini', '.claude', '.agents', '.specify', 'temp_11_code',
    'audit-output', 'backups', '__pycache__'
}

EXCLUDE_EXTS = {
    '.db', '.sqlite', '.sqlite3', '.log', '.tmp', '.zip'
}

def create_clean_zip():
    print(f"[PACKAGING] Source: {ROOT_DIR}")
    print(f"[PACKAGING] Target: {OUTPUT_ZIP}")

    if os.path.exists(OUTPUT_ZIP):
        os.remove(OUTPUT_ZIP)

    included_count = 0
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        # 1. Thêm toàn bộ module iot/dustguard-node
        iot_dir = os.path.join(ROOT_DIR, "iot", "dustguard-node")
        if os.path.exists(iot_dir):
            for root, dirs, files in os.walk(iot_dir):
                dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in EXCLUDE_EXTS or file.endswith('.exe'):
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, ROOT_DIR)
                    zf.write(full_path, rel_path)
                    included_count += 1

        # 2. Thêm thư mục app (trừ node_modules, dist, dev.db)
        app_dir = os.path.join(ROOT_DIR, "app")
        if os.path.exists(app_dir):
            for root, dirs, files in os.walk(app_dir):
                dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in EXCLUDE_EXTS or file.endswith('.docx') and 'PhuLuc' in file:
                        continue
                    # Bỏ file quá 5MB
                    full_path = os.path.join(root, file)
                    if os.path.getsize(full_path) > 5 * 1024 * 1024:
                        continue
                    rel_path = os.path.relpath(full_path, ROOT_DIR)
                    zf.write(full_path, rel_path)
                    included_count += 1

        # 3. Thêm tài liệu tổng quan
        readme = os.path.join(ROOT_DIR, "README.md")
        if os.path.exists(readme):
            zf.write(readme, "README.md")
            included_count += 1

    size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
    print(f"[SUCCESS] Packaged {included_count} files into 11-Code.zip ({size_mb:.2f} MB)")

if __name__ == '__main__':
    create_clean_zip()
