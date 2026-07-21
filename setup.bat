@echo off
setlocal

echo.
echo  CFB Recruiting Evolution Tracker — Setup
echo  =========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo.
    echo  Download it from https://nodejs.org ^(choose the LTS version^)
    echo  then run this script again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  Node.js found: %NODE_VER%
echo.

:: Create .env if missing (not included in the download — Prisma needs it to find the database)
if not exist ".env" (
    echo  Creating config file...
    echo DATABASE_URL="file:./dev.db"> .env
)

:: Install dependencies
echo  Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
)
echo.

:: Create/update database tables
echo  Setting up database...
call npx prisma db push
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Database setup failed.
    pause
    exit /b 1
)

:: Generate Prisma client
echo  Generating database client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Prisma generate failed.
    pause
    exit /b 1
)
echo.

echo  Setup complete!
echo.
echo  Starting the app...
echo  It will open at http://localhost:3000
echo.
echo  ^(Keep this window open while using the app. Close it to stop the server.^)
echo.

:: Open browser after a short delay
start "" /b cmd /c "timeout /t 3 >nul && start http://localhost:3000"

:: Start the dev server
call npm run dev
