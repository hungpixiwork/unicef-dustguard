#!/usr/bin/env python3
"""
DustGuard VN — YouTube Thumbnail Generator (11.png, 1280x720 16:9)
Tạo ảnh đại diện video nộp bài cho Thầy TS. Nguyễn Văn Thái - SIC 2026
"""
from PIL import Image, ImageDraw, ImageFont
import os

WIDTH = 1280
HEIGHT = 720

# Palette
BG_COLOR = (253, 251, 247)         # #FDFBF7 Cream
CARD_BG = (255, 255, 255)          # White
TEXT_DARK = (15, 23, 42)           # #0F172A Ink Slate
TEXT_MUTED = (100, 116, 139)       # #64748B
TEAL = (13, 111, 100)              # #0D6F64 DustGuard Teal
SEAL_RED = (159, 36, 31)           # #9F241F
NAVY = (30, 58, 138)               # #1E3A8A UIT Blue
BORDER_COLOR = (203, 213, 225)     # #CBD5E1
GREEN_OK = (22, 163, 74)           # #16A34A

img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
draw = ImageDraw.Draw(img)

# Try loading standard system fonts
def get_font(size, bold=False):
    font_paths = [
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf" if bold else "C:\\Windows\\Fonts\\tahoma.ttf"
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

font_header = get_font(22, bold=True)
font_title = get_font(56, bold=True)
font_sub = get_font(26, bold=True)
font_body = get_font(20, bold=False)
font_author = get_font(22, bold=True)
font_metric_huge = get_font(68, bold=True)
font_metric_med = get_font(32, bold=True)
font_tag = get_font(16, bold=True)

# 1. Top Decorative Bar
draw.rectangle([(0, 0), (WIDTH, 12)], fill=TEAL)

# 2. Left Side: Academic & Project Info
# Program badges
draw.rounded_rectangle([(60, 45), (380, 85)], radius=8, fill=SEAL_RED)
draw.text((75, 53), "SAMSUNG INNOVATION CAMPUS 2026", fill=(255, 255, 255), font=font_tag)

draw.rounded_rectangle([(395, 45), (550, 85)], radius=8, fill=NAVY)
draw.text((410, 53), "FINAL PROJECT", fill=(255, 255, 255), font=font_tag)

draw.rounded_rectangle([(565, 45), (660, 85)], radius=8, fill=TEAL)
draw.text((580, 53), "STT: 11", fill=(255, 255, 255), font=font_tag)

# Title
draw.text((60, 105), "DUSTGUARD VN", fill=TEXT_DARK, font=font_title)
draw.text((60, 175), "HỆ THỐNG IOT GIÁM SÁT BỤI MỊN THEO THỜI GIAN THỰC", fill=TEAL, font=font_sub)
draw.text((60, 215), "APM2000 + ESP32 NodeMCU-32S + Web Dashboard (BOM lõi ~460.000đ)", fill=TEXT_MUTED, font=font_body)

# Academic Cards
# Supervisor Card
draw.rounded_rectangle([(60, 265), (660, 355)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=2)
draw.text((80, 280), "GIẢNG VIÊN HƯỚNG DẪN:", fill=TEXT_MUTED, font=font_tag)
draw.text((80, 305), "TS. Nguyễn Văn Thái", fill=TEXT_DARK, font=font_author)
draw.text((360, 308), "Khoa Điện-Điện tử — HCM-UTE", fill=TEXT_MUTED, font=font_body)

# Student Card
draw.rounded_rectangle([(60, 375), (660, 485)], radius=12, fill=CARD_BG, outline=BORDER_COLOR, width=2)
draw.text((80, 390), "SINH VIÊN THỰC HIỆN (NHÓM 11):", fill=TEXT_MUTED, font=font_tag)
draw.text((80, 415), "Phạm Phú Nguyễn Hưng", fill=TEXT_DARK, font=font_author)
draw.text((80, 445), "MSSV: 26730023  |  Trường ĐH Công nghệ Thông tin — ĐHQG-HCM (UIT)", fill=NAVY, font=font_body)

# Bottom Highlights
draw.rounded_rectangle([(60, 505), (660, 645)], radius=12, fill=(241, 245, 249), outline=BORDER_COLOR, width=1)
draw.text((80, 520), "TRIẾT LÝ THIẾT KẾ & TÍNH NĂNG NỔI BẬT:", fill=TEXT_DARK, font=font_tag)
draw.text((80, 550), "✓ Node = Sensor + Connectivity: Giữ phần cứng tối giản, đưa giao diện lên Web", fill=TEAL, font=font_body)
draw.text((80, 580), "✓ Đo đồng thời PM1.0, PM2.5, PM10 bằng cảm biến tán xạ laser APM2000", fill=TEXT_DARK, font=font_body)
draw.text((80, 610), "✓ Cloudflare D1 SSOT + Xác thực chữ ký số HMAC-SHA256 chống giả mạo", fill=NAVY, font=font_body)

# 3. Right Side: Simulated Hardware Display (Palm-sized Touchscreen Frame)
tx, ty, tw, th = 720, 95, 500, 550
# Device outer chassis
draw.rounded_rectangle([(tx, ty), (tx + tw, ty + th)], radius=24, fill=(15, 23, 42), outline=(51, 65, 85), width=4)

# Screen Bezel
sx, sy, sw, sh = tx + 16, ty + 16, tw - 32, th - 32
draw.rounded_rectangle([(sx, sy), (sx + sw, sy + sh)], radius=12, fill=BG_COLOR)

# Screen Top Nav
draw.rectangle([(sx, sy), (sx + sw, sy + 44)], fill=(15, 23, 42))
draw.text((sx + 15, sy + 10), "DustGuard", fill=(255, 255, 255), font=font_sub)
draw.text((sx + 175, sy + 14), "DG-NODE-011", fill=(125, 211, 252), font=font_tag)
# Status dots
draw.ellipse([(sx + sw - 120, sy + 16), (sx + sw - 106, sy + 30)], fill=GREEN_OK)
draw.text((sx + sw - 100, sy + 14), "WiFi", fill=(255, 255, 255), font=font_tag)
draw.ellipse([(sx + sw - 55, sy + 16), (sx + sw - 41, sy + 30)], fill=GREEN_OK)
draw.text((sx + sw - 35, sy + 14), "Cloud", fill=(255, 255, 255), font=font_tag)

# Air Status Banner
draw.rounded_rectangle([(sx + 12, sy + 54), (sx + sw - 12, sy + 88)], radius=6, fill=TEAL)
draw.text((sx + 95, sy + 62), "AIR STATUS: NORMAL (SAFE)", fill=(255, 255, 255), font=font_tag)

# Main PM2.5 Metric Card (Dominant)
mx, my, mw, mh = sx + 12, sy + 98, sw - 24, 180
draw.rounded_rectangle([(mx, my), (mx + mw, my + mh)], radius=12, fill=CARD_BG, outline=TEAL, width=3)
draw.text((mx + 16, my + 14), "BỤI MỊN PM2.5 (CHỦ ĐẠO)", fill=TEAL, font=font_tag)
draw.text((mx + 16, my + 45), "28.5", fill=TEXT_DARK, font=font_metric_huge)
draw.text((mx + 220, my + 85), "µg/m³", fill=TEXT_MUTED, font=font_sub)
draw.rounded_rectangle([(mx + 16, my + 130), (mx + 240, my + 162)], radius=6, fill=(241, 245, 249))
draw.text((mx + 26, my + 136), "TIÊU CHUẨN QCVN 05:2023", fill=TEXT_DARK, font=font_tag)

# Sub metrics: PM1.0 and PM10
sm_y = my + mh + 12
draw.rounded_rectangle([(mx, sm_y), (mx + (mw // 2) - 6, sm_y + 90)], radius=10, fill=CARD_BG, outline=BORDER_COLOR, width=2)
draw.text((mx + 12, sm_y + 10), "PM1.0 SIÊU MỊN", fill=TEXT_MUTED, font=font_tag)
draw.text((mx + 12, sm_y + 35), "12.4", fill=TEXT_DARK, font=font_metric_med)
draw.text((mx + 110, sm_y + 48), "µg/m³", fill=TEXT_MUTED, font=font_tag)

draw.rounded_rectangle([(mx + (mw // 2) + 6, sm_y), (mx + mw, sm_y + 90)], radius=10, fill=CARD_BG, outline=BORDER_COLOR, width=2)
draw.text((mx + (mw // 2) + 18, sm_y + 10), "PM10 TỔNG HỢP", fill=TEXT_MUTED, font=font_tag)
draw.text((mx + (mw // 2) + 18, sm_y + 35), "41.8", fill=TEXT_DARK, font=font_metric_med)
draw.text((mx + (mw // 2) + 116, sm_y + 48), "µg/m³", fill=TEXT_MUTED, font=font_tag)

# Bottom Touch Navigation Bar
bnav_y = sy + sh - 55
draw.rectangle([(sx, bnav_y), (sx + sw, sy + sh)], fill=(15, 23, 42))
btn_w = (sw - 20) // 4
for i, name in enumerate(["HOME", "CHART", "DEVICE", "MORE"]):
    bx = sx + 4 + i * (btn_w + 4)
    btn_bg = TEAL if i == 0 else (30, 41, 59)
    draw.rounded_rectangle([(bx, bnav_y + 6), (bx + btn_w, bnav_y + 46)], radius=6, fill=btn_bg)
    draw.text((bx + 18, bnav_y + 16), name, fill=(255, 255, 255), font=font_tag)

output_path = os.path.abspath("11/11.png")
os.makedirs(os.path.dirname(output_path), exist_ok=True)
img.save(output_path, "PNG")
print(f"Generated 11.png successfully at: {output_path}")
