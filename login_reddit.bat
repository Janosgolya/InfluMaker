@echo off
title InfluMaker - Reddit Login
cd /d "%~dp0"
echo ======================================================
echo 🤖 INFLUMAKER: REDDIT SESSION LOGIN
echo ======================================================
echo.
node src/scripts/reddit_browser_login.js
echo.
echo ======================================================
pause
