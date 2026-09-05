@echo off
title InfluMaker - Instagram Connection & Session Manager
cd /d "%~dp0"
cls
echo ======================================================
echo 📸 INFLUMAKER: INSTAGRAM CONNECTION MANAGER
echo Target: @secretsofthelondonmansion
echo ======================================================
echo.
echo  [1] Log in / Refresh Instagram Session (Opens Browser)
echo  [2] Check Instagram Connection Health & Diagnostics
echo  [3] Exit
echo.
set /p choice="Select an option [1-3] (Default: 1): "

if "%choice%"=="2" goto health
if "%choice%"=="3" exit /b 0

:login
cls
echo ======================================================
echo 📸 LAUNCHING INSTAGRAM LOGIN HELPER...
echo ======================================================
node src/scripts/instagram_browser_login.js
echo.
pause
exit /b 0

:health
cls
echo ======================================================
echo 🏥 RUNNING INSTAGRAM CONNECTION HEALTH CHECK...
echo ======================================================
node src/scripts/check_instagram_health.js --live
echo.
pause
exit /b 0

