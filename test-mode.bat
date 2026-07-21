@echo off
setlocal
cd /d "%~dp0"

echo.
echo  Ghost City RLT — Test Mode
echo  ==========================
echo.
echo  Opens the real desktop app window against a live dev server.
echo  Code changes hot-reload automatically. Close the window to stop.
echo.

if not exist "node_modules" (
    echo  First-time setup required. Running setup.bat...
    echo.
    call setup.bat
)

call npm run electron:dev
