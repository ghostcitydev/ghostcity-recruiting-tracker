@echo off
title CFB 27 Dynasty Tracker
cd /d "%~dp0"
echo Starting CFB 27 Dynasty Tracker...
echo.
echo Once you see "Ready", open http://localhost:3000 in your browser.
echo Press Ctrl+C to stop the server.
echo.
start "" "http://localhost:3000"
npm run dev
