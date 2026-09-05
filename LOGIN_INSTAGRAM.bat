@echo off
title InfluMaker - Instagram Connection & Session Manager
cd /d "%~dp0"
cls
echo ======================================================
echo 📸 INFLUMAKER: INSTAGRAM CONNECTION MANAGER
echo Target: @secretsofthelondonmansion
echo ======================================================
echo.
echo  [1] Direct Login in Clean Browser (Pre-fills @secretsofthelondonmansion)
echo  [2] Quick Import sessionid from your normal browser (10 seconds)
echo  [3] Check Instagram Connection Health & Diagnostics
echo  [4] Exit
echo.
set /p choice="Select an option [1-4] (Default: 1): "

if "%choice%"=="2" goto import
if "%choice%"=="3" goto health
if "%choice%"=="4" exit /b 0

:login
cls
echo ======================================================
echo 📸 LAUNCHING DIRECT INSTAGRAM LOGIN HELPER...
echo ======================================================
node src/scripts/instagram_browser_login.js
echo.
pause
exit /b 0

:import
cls
node src/scripts/import_instagram_cookie.js
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

