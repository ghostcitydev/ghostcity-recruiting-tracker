@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  Ghost City RLT
echo  ==============
echo  Getting everything ready and starting the app...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo  Download it from https://nodejs.org ^(choose the LTS version^)
    pause
    exit /b 1
)

if not exist ".env" (
    echo  Creating config file...
    echo DATABASE_URL="file:./dev.db"> .env
)

if not exist "node_modules" (
    echo  First run detected - installing dependencies. This can take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  ERROR: npm install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
)

if not exist "dev.db" (
    echo  Setting up the database...
    call npx prisma db push
    if %errorlevel% neq 0 (
        echo.
        echo  ERROR: Database setup failed.
        pause
        exit /b 1
    )
    echo.
)

echo  Clearing anything still running on port 3000...
set FOUND=0
for /f "tokens=1-5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    if /I "%%d"=="LISTENING" (
        taskkill /F /PID %%e >nul 2>&1
        set FOUND=1
    )
)
if !FOUND!==1 timeout /t 2 >nul

echo  Making sure the database driver matches this Node version...
call npm rebuild better-sqlite3 >nul 2>&1

echo  Updating the database client for any new tables...
call npx prisma generate --schema prisma/schema.prisma
if %errorlevel% neq 0 goto :startfail

echo.
echo  Opening http://localhost:3000 in your browser shortly.
echo  Leave this window open while you use the app. Close it to stop the server.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"

call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo  ============================================
    echo  The server exited unexpectedly ^(code %errorlevel%^).
    echo  Scroll up to see the error above this line,
    echo  then press any key to close this window.
    echo  ============================================
    pause >nul
)
exit /b 0

:startfail
echo.
echo  ============================================
echo  Setup failed ^(code %errorlevel%^).
echo  Scroll up to see the error above this line,
echo  then press any key to close this window.
echo  ============================================
pause >nul
exit /b 1
