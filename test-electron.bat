@echo off
setlocal
cd /d "%~dp0"

echo.
echo  Ghost City RLT - Test Mode
echo  ==========================
echo.
echo  Opens the real desktop app window against a live dev server.
echo  Code changes hot-reload automatically. Close the window to stop.
echo.

if not exist "node_modules" (
    echo  First run detected - installing dependencies. This can take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  ERROR: npm install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
)

call npm run electron:dev
