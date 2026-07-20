@echo off
setlocal

:: If deps or DB missing, run first-time setup automatically
if not exist "node_modules" (
    echo  First-time setup required. Running setup.bat...
    echo.
    call setup.bat
    exit /b %errorlevel%
)
if not exist "prisma\dev.db" (
    echo  Database missing. Running setup.bat...
    echo.
    call setup.bat
    exit /b %errorlevel%
)

echo.
echo  CFB Recruiting Evolution Tracker
echo  Starting at http://localhost:3000
echo.
echo  Keep this window open while using the app.
echo  Close it to stop the server.
echo.
start "" /b cmd /c "timeout /t 2 >nul && start http://localhost:3000"
call npm run dev
