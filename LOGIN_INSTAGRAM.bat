@echo off
title InfluMaker - Instagram Login
cd /d "%~dp0"
echo ======================================================
echo 📸 INFLUMAKER: INSTAGRAM SESSION LOGIN
echo ======================================================
echo.
node src/scripts/instagram_browser_login.js
echo.
echo ======================================================
pause
