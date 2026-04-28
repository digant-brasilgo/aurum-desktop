@echo off
title AURUM Builder
color 0A
cd /d D:\Aurum\aurum-desktop

:: ── Check admin rights ──────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  *** Please right-click build-aurum.bat and choose
    echo  *** "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo  AURUM BUILD SCRIPT
echo ================================================
echo.

:: ── Check icon ───────────────────────────────────────────────────
if not exist "assets\aurum_icon.ico" (
    echo  ERROR: assets\aurum_icon.ico not found.
    pause
    exit /b 1
)
echo  [OK] Icon found.

:: ── Install node_modules if missing ─────────────────────────────
if not exist "node_modules" (
    echo  Installing node_modules...
    call npm install --no-audit --no-fund
    if errorlevel 1 ( echo [ERROR] npm install failed && pause && exit /b 1 )
    echo  [OK] node_modules installed.
)

:: ── Kill running instances ───────────────────────────────────────
echo  Closing running AURUM instances...
taskkill /f /im electron.exe >nul 2>&1
taskkill /f /im AURUM.exe    >nul 2>&1
timeout /t 2 /nobreak >nul
if exist "release\win-unpacked\AURUM.exe" del /f /q "release\win-unpacked\AURUM.exe" >nul 2>&1
if exist "release\AURUM*.exe"             del /f /q "release\AURUM*.exe"             >nul 2>&1
echo  [OK] Done.
echo.

:: ── Step 1: Vite ────────────────────────────────────────────────
echo [1/4] Building React app (Vite)...
call npx vite build
if %errorlevel% neq 0 (
    echo  ERROR: Vite build failed.
    pause
    exit /b 1
)
echo  [OK] Vite build successful.
echo.

:: ── Step 2: ffmpeg.dll ──────────────────────────────────────────
echo [2/4] Copying ffmpeg.dll...
if exist "node_modules\electron\dist\ffmpeg.dll" (
    copy /y "node_modules\electron\dist\ffmpeg.dll" "release\win-unpacked\ffmpeg.dll" >nul 2>&1
    echo  [OK] ffmpeg.dll ready.
) else (
    echo  [WARN] ffmpeg.dll not found - will rely on electron-builder.
)
echo.

:: ── Step 3: electron-builder ────────────────────────────────────
echo [3/4] Packaging with electron-builder...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo  ERROR: electron-builder failed.
    pause
    exit /b 1
)
echo  [OK] Package built.
echo.

:: ── Step 4: Finalise ────────────────────────────────────────────
echo [4/4] Finalising...

:: Copy ffmpeg into unpacked folder after builder runs
if exist "node_modules\electron\dist\ffmpeg.dll" (
    copy /y "node_modules\electron\dist\ffmpeg.dll" "release\win-unpacked\ffmpeg.dll" >nul 2>&1
    echo  [OK] ffmpeg.dll in unpacked folder.
)

:: Firewall rules
netsh advfirewall firewall delete rule name="AURUM" >nul 2>&1
netsh advfirewall firewall delete rule name="AURUM Port 3737" >nul 2>&1
netsh advfirewall firewall add rule name="AURUM" dir=in action=allow program="D:\Aurum\aurum-desktop\release\win-unpacked\AURUM.exe" enable=yes profile=any >nul 2>&1
netsh advfirewall firewall add rule name="AURUM Port 3737" dir=in action=allow protocol=TCP localport=3737 enable=yes profile=any >nul 2>&1
echo  [OK] Firewall rules set.

:: Clear icon cache
ie4uinit.exe -show >nul 2>&1
echo  [OK] Icon cache refreshed.

:: Create desktop shortcut via temp PowerShell script
echo $ws = New-Object -ComObject WScript.Shell > "%TEMP%\aurum_shortcut.ps1"
echo $sc = $ws.CreateShortcut("$env:USERPROFILE\Desktop\AURUM.lnk") >> "%TEMP%\aurum_shortcut.ps1"
echo $sc.TargetPath = "D:\Aurum\aurum-desktop\release\win-unpacked\AURUM.exe" >> "%TEMP%\aurum_shortcut.ps1"
echo $sc.IconLocation = "D:\Aurum\aurum-desktop\assets\aurum_icon.ico" >> "%TEMP%\aurum_shortcut.ps1"
echo $sc.WorkingDirectory = "D:\Aurum\aurum-desktop\release\win-unpacked" >> "%TEMP%\aurum_shortcut.ps1"
echo $sc.Description = "AURUM - Jewellery Metal Tracking" >> "%TEMP%\aurum_shortcut.ps1"
echo $sc.Save() >> "%TEMP%\aurum_shortcut.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\aurum_shortcut.ps1" >nul 2>&1
del "%TEMP%\aurum_shortcut.ps1" >nul 2>&1
echo  [OK] Desktop shortcut created with mandala icon.
echo.

echo ================================================
echo  BUILD COMPLETE
echo  App: release\win-unpacked\AURUM.exe
echo  Shortcut on your Desktop shows mandala icon.
echo ================================================
echo.
pause
