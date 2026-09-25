# DustGuard VN - Touchscreen Simulator PowerShell Launcher
# Samsung Innovation Campus 2026 - Nhom 11

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  DUSTGUARD VN - KHOI DONG TRINH GIA LAP MAN HINH CAM UNG" -ForegroundColor Yellow
Write-Host "  Samsung Innovation Campus 2026 - SVTH: Pham Phu Nguyen Hung" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dang mo trinh duyet tai http://localhost:3456 ..." -ForegroundColor White

Start-Process "http://localhost:3456"
node "$PSScriptRoot\..\scripts\touchscreen-simulator.mjs"
