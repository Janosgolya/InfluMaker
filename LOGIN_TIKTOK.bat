@echo off
title InfluMaker - TikTok Login
cd /d "%~dp0"
echo ======================================================
echo 📱 INFLUMAKER: TIKTOK SESSION LOGIN
echo ======================================================
echo.
node src/scripts/tiktok_browser_login.js
echo.
echo ======================================================
pause
