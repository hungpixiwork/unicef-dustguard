@echo off
title DustGuard VN - Web Dashboard Launcher
echo =======================================================
echo   DUSTGUARD VN - MO TRANG DASHBOARD IOT TREN TRINH DUYET
echo   Samsung Innovation Campus 2026 - Nhom 11
echo =======================================================
echo.
echo 1. Dang mo trang bia de tai Samsung Innovation Campus (/sic)...
start "" "https://dustguard.phamphunguyenhung.com/sic"
timeout /t 2 >nul
echo 2. Dang mo trang Dashboard IoT truc quan (/iot)...
start "" "https://dustguard.phamphunguyenhung.com/iot"
echo.
echo Neu dang chay Server Local (Vite dev), ban co the truy cap:
echo http://localhost:5173/sic va http://localhost:5173/iot
echo.
pause
