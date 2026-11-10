@echo off
title PUCA Finance Launcher
cd /d "%~dp0"

:: Ensure Electron does not run as node
set ELECTRON_RUN_AS_NODE=

echo Checking local database server...
netstat -ano | findstr /R /C:":3306 " >nul
if errorlevel 1 (
    echo [INFO] MySQL is not running on port 3306. Starting XAMPP MySQL...
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        start "" /B "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
        timeout /t 3 /nobreak >nul
    ) else (
        echo [WARNING] C:\xampp\mysql\bin\mysqld.exe not found. Please ensure your MySQL server is running.
    )
)

if exist "dist\win-unpacked\PUCA Finance.exe" (
    echo Launching PUCA Finance...
    start "" "dist\win-unpacked\PUCA Finance.exe"
) else (
    echo [ERROR] Executable not found. Building it now...
    call pnpm electron:build
    start "" "dist\win-unpacked\PUCA Finance.exe"
)
