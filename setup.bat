@echo off
title AURUM Setup
color 0B
cls
echo.
echo  ================================================
echo   AURUM - Jewellery Metal Tracking and Control
echo   Setup Script - Brasilgo Jewels Pvt. Ltd.
echo  ================================================
echo.
echo  Current folder: %~dp0
echo.

:: Block Program Files
echo %~dp0 | findstr /i "Program Files" >nul
if %errorlevel%==0 (
    color 0C
    echo  [ERROR] Cannot install inside "Program Files"!
    echo  Move the folder to D:\Aurum\aurum-desktop\ and try again.
    pause
    exit /b 1
)

:: Check Node.js
echo  Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from nodejs.org
    pause
    exit /b 1
)
echo  [OK] Node.js found.
echo.

:: Clean old install
echo  Cleaning previous install (if any)...
if exist node_modules (
    echo  Removing old node_modules...
    rmdir /s /q node_modules
    echo  Done.
)
echo.

:: npm install
echo  ================================================
echo   STEP 1 of 2: Installing packages
echo   This takes 5-10 minutes. Do not close window.
echo  ================================================
echo.
call npm install --no-audit --no-fund
echo.
echo  npm install exit code: %errorlevel%
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] npm install failed!
    echo  See the error messages above for details.
    echo.
    pause
    exit /b 1
)
echo  [OK] Packages installed.
echo.

:: Build
echo  ================================================
echo   STEP 2 of 2: Building the app
echo  ================================================
echo.
call npx vite build
echo.
echo  Build exit code: %errorlevel%
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Build failed!
    echo  See the error messages above for details.
    echo.
    pause
    exit /b 1
)
echo  [OK] App built successfully.
echo.

echo  ================================================
echo   Setup Complete!
echo  ================================================
echo.
echo  Now double-click:  start-standalone.bat
echo.
echo  Default login:  admin  /  admin123
echo.
pause
