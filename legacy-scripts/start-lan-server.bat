@echo off
title AURUM LAN Server
color 0A
cd /d "%~dp0"
cls
echo.
echo  ================================================
echo   AURUM LAN Server - Brasilgo Jewels Pvt. Ltd.
echo  ================================================
echo.
echo  Starting server...
echo  Keep this window OPEN while staff are working.
echo  Close this window to stop the server.
echo.
if not exist node_modules (
    echo  [ERROR] Run setup first. node_modules not found.
    pause & exit /b 1
)
node server.js
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Server stopped with an error.
    pause
)
