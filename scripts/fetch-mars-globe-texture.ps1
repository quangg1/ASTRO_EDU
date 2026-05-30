# Tải texture Mars globe (NASA Photojournal — public domain) vào đúng path app đang dùng.
# Sau đó chạy: .\scripts\sync-media-to-s3.ps1 (nếu deploy CDN/S3).
# Run from repo root.

$repoRoot = Split-Path $PSScriptRoot -Parent
$destDir = Join-Path $repoRoot "client\public\textures\nasa"
$destFile = Join-Path $destDir "mars_nasa.jpg"
$url = "https://photojournal.jpl.nasa.gov/jpeg/PIA14293.jpg"

New-Item -ItemType Directory -Path $destDir -Force | Out-Null
Write-Host "Downloading $url -> $destFile"
Invoke-WebRequest -Uri $url -OutFile $destFile -UseBasicParsing
Get-Item $destFile | Format-List Name, Length
