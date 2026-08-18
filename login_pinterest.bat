@echo off
title InfluMaker - Pinterest Login
cd /d "%~dp0"
echo ======================================================
echo 📌 INFLUMAKER: PINTEREST SESSION LOGIN
echo ======================================================
echo.
echo Launching visible browser...
echo Please log in to your Pinterest account in the opened browser.
echo.
node src/scripts/pinterest_browser_login.js
echo.
echo ======================================================
pause
