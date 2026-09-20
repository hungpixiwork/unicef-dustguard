# =========================================================================
# DustGuard VN — Script đóng gói mã nguồn nộp bài (11-Code.zip)
# Chuẩn quy cách Final Project Samsung Innovation Campus 2026 (STT: 11)
# =========================================================================

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
$outputZip = "$PSScriptRoot\11-Code.zip"
$tempStaging = "$PSScriptRoot\temp_11_code"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Đóng gói 11-Code.zip cho Nhóm 11 (Samsung SIC 2026)" -ForegroundColor Cyan
Write-Host " Sinh viên: Phạm Phú Nguyễn Hưng (26730023 - UIT)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Dọn dẹp staging cũ nếu có
if (Test-Path $tempStaging) {
    Remove-Item -Recurse -Force $tempStaging
}
if (Test-Path $outputZip) {
    Remove-Item -Force $outputZip
}

New-Item -ItemType Directory -Path $tempStaging | Out-Null
New-Item -ItemType Directory -Path "$tempStaging\iot" | Out-Null
New-Item -ItemType Directory -Path "$tempStaging\app" | Out-Null

Write-Host "1. Sao chép module IoT (firmware, docs, tools)..." -ForegroundColor Yellow
Copy-Item -Recurse -Path "$root\iot\dustguard-node" -Destination "$tempStaging\iot\"

Write-Host "2. Sao chép mã nguồn Web và Backend cần thiết..." -ForegroundColor Yellow
# Copy app excluding node_modules, .git, dist, .wrangler
$appExclude = @('node_modules', '.git', 'dist', '.wrangler', '.vite', 'dev.db')
Get-ChildItem -Path "$root\app" | Where-Object { $appExclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Recurse -Path $_.FullName -Destination "$tempStaging\app\"
}

Write-Host "3. Sao chép tài liệu tổng quan..." -ForegroundColor Yellow
if (Test-Path "$root\README.md") {
    Copy-Item -Path "$root\README.md" -Destination "$tempStaging\"
}

Write-Host "4. Nén thành file 11-Code.zip..." -ForegroundColor Yellow
Compress-Archive -Path "$tempStaging\*" -DestinationPath $outputZip -CompressionLevel Optimal

# Dọn dẹp thư mục tạm
Remove-Item -Recurse -Force $tempStaging

$zipSize = (Get-Item $outputZip).Length / 1MB
Write-Host "==================================================" -ForegroundColor Green
Write-Host " THÀNH CÔNG! Đã tạo file: 11\11-Code.zip" -ForegroundColor Green
Write-Host (" Dung lượng file nén: {0:N2} MB" -f $zipSize) -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
