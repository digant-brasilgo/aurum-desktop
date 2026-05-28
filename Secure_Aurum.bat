@echo off
title SECURE AURUM — Daily Backup
color 0A

echo ================================================
echo  SECURE AURUM — DAILY BACKUP
echo ================================================
echo.

:: ── STEP 1: Copy latest Handoff from Downloads to D:\Aurum ──────────────────
echo [1/5] Copying latest Handoff document from Downloads to D:\Aurum...
echo.

:: Find and copy the most recently modified SESSION*_HANDOFF.md from Downloads
set DOWNLOADS=C:\Users\Server\Downloads
set AURUM_ROOT=D:\Aurum

:: Copy all SESSION*HANDOFF* files — overwrites existing same-name files
for %%F in ("%DOWNLOADS%\SESSION*HANDOFF*") do (
    echo     Copying: %%~nxF
    copy /Y "%%F" "%AURUM_ROOT%\%%~nxF"
)

echo  [OK] Handoff copied.
echo.

:: ── STEP 2: Backup MainApp.jsx as MainApp.jsx.bak ───────────────────────────
echo [2/5] Backing up MainApp.jsx as MainApp.jsx.bak...
echo.

set MAINSRC=D:\Aurum\aurum-desktop\src\MainApp.jsx
set MAINBAK=D:\Aurum\aurum-desktop\src\MainApp.jsx.bak

if exist "%MAINSRC%" (
    copy /Y "%MAINSRC%" "%MAINBAK%"
    echo  [OK] MainApp.jsx.bak updated.
) else (
    echo  [WARN] MainApp.jsx not found at expected path.
)
echo.

:: ── STEP 3: Backup D:\Aurum to G:\Aurum ─────────────────────────────────────
echo [3/5] Backing up D:\Aurum to G:\Aurum ...
echo       (This may take a minute — copying all files and subfolders)
echo.

if not exist "G:\Aurum" mkdir "G:\Aurum"

robocopy "D:\Aurum" "G:\Aurum" /E /COPYALL /DCOPY:T /R:2 /W:2 /NP /LOG+:"%AURUM_ROOT%\backup_log.txt"

echo  [OK] D:\Aurum backed up to G:\Aurum
echo.

:: ── STEP 4: Backup D:\Aurum Business to G:\Aurum Business ───────────────────
echo [4/5] Backing up "D:\Aurum Business" to "G:\Aurum Business" ...
echo       (This may take a minute — copying all files and subfolders)
echo.

if not exist "G:\Aurum Business" mkdir "G:\Aurum Business"

robocopy "D:\Aurum Business" "G:\Aurum Business" /E /COPYALL /DCOPY:T /R:2 /W:2 /NP /LOG+:"%AURUM_ROOT%\backup_log.txt"

echo  [OK] "D:\Aurum Business" backed up to "G:\Aurum Business"
echo.

:: ── STEP 5: GitHub Backup of AUD ────────────────────────────────────────────
echo [5/5] Pushing AUD to GitHub...
echo.

cd /d "D:\Aurum\aurum-desktop"

git add .
git commit -m "Daily backup — %DATE% %TIME%"
git push

echo.
echo  [OK] GitHub backup complete.
echo.

:: ── DONE ────────────────────────────────────────────────────────────────────
echo ================================================
echo  SECURE AURUM — BACKUP COMPLETE
echo ================================================
echo.
echo  Backup log saved to: D:\Aurum\backup_log.txt
echo.
pause
