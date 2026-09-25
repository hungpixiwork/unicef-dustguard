@echo off
title DustGuard VN - Touchscreen Simulator Launcher
echo =======================================================
echo   DUSTGUARD VN - KHOI DONG TRINH GIA LAP MAN HINH CAM UNG
echo   Samsung Innovation Campus 2026 - Nhom 11
echo =======================================================
echo.
echo Dang khoi dong may chu Simulator tai cong 3456...
start "" http://localhost:3456
node "%~dp0..\scripts\touchscreen-simulator.mjs"
pause
