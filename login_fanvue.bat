@echo off
title InfluMaker - Fanvue Authentication
echo ======================================================
echo 🔐 INFLUMAKER: Fanvue OAuth Authentication Assistant
echo ======================================================
echo.
echo [1/2] Zwalnianie portu 57280...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :57280') do (
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo [2/2] Uruchamianie asystenta autoryzacji Fanvue...
echo Otwieram przegladarke do autoryzacji InfluMaker...
echo.
node src/scripts/fanvue_auth.js
echo.
pause
