@echo off
title TikTok Login - InfluMaker
cd /d "%~dp0"
echo ======================================================
echo 🎬 INFLUMAKER: TikTok Browser Session Login
echo ======================================================
echo Otwieram okno logowania TikToka...
echo Zaloguj sie na konto Betty Ryal.
echo ======================================================
node src/scripts/tiktok_browser_login.js
pause
