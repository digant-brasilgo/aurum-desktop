@echo off
title AURUM - Starting...
cd /d "%~dp0"
echo.
echo  Starting AURUM...
echo  (If a login screen appears, use: admin / admin123)
echo.

:: Check if built
if not exist dist\index.html (
    echo  [ERROR] App not built yet!
    echo  Please run setup.bat first.
    echo.
    pause
    exit /b 1
)

:: Check node_modules
if not exist node_modules (
    echo  [ERROR] Dependencies not installed!
    echo  Please run setup.bat first.
    echo.
    pause
    exit /b 1
)

npx electron .
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] AURUM failed to start. Error code: %errorlevel%
    echo  Try running setup.bat again.
    echo.
    pause
)
