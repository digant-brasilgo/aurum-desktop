@echo off
title AURUM - Connecting to Server...
cd /d "%~dp0"

:: Read saved server URL
set SERVER_URL=
if exist .server-url (
    set /p SERVER_URL=<.server-url
)

if "%SERVER_URL%"=="" (
    echo.
    echo  Enter the AURUM Server URL shown on the Server PC
    echo  Example: http://192.168.1.100:3737
    echo.
    set /p SERVER_URL=Server URL: 
    echo %SERVER_URL%>.server-url
)

set AURUM_SERVER_URL=%SERVER_URL%
start "" /B npx electron . --server-url=%SERVER_URL%
