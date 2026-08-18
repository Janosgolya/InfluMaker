@echo off
title InfluMaker - X / Twitter Login
cd /d "%~dp0"
echo ======================================================
echo 🐦 INFLUMAKER: X (TWITTER) SESSION LOGIN
echo ======================================================
echo.
node src/scripts/twitter_browser_login.js
echo.
echo ======================================================
pause
