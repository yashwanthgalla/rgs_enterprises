Set-Location -Path "$PSScriptRoot\backend"
Write-Host "Starting RGS Enterprises Django Backend Server on port 8000..." -ForegroundColor Cyan
& ".\venv\Scripts\python.exe" manage.py runserver 8000

