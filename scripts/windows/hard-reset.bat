@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\..\.."

echo.
echo  Ghost City RLT - Hard Reset
echo  ===========================
echo.
echo  Looking for anything still listening on port 3000...
echo.

set FOUND=0
for /f "tokens=1-5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    if /I "%%d"=="LISTENING" (
        echo  Killing stale process on port 3000 ^(PID %%e^)...
        taskkill /F /PID %%e >nul 2>&1
        set FOUND=1
    )
)

if !FOUND!==0 (
    echo  Nothing found on port 3000. Good, no stale process to clear.
) else (
    echo.
    echo  Done. Waiting a moment for the port to free up...
    timeout /t 2 >nul
)

echo.
echo  Starting a fresh server...
echo.
call "%~dp0run-local.bat"
