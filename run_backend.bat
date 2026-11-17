@echo off
cd /d "%~dp0backend"
echo Starting RGS Enterprises Django Backend Server...
call ".\venv\Scripts\python.exe" manage.py runserver 8000
pause

