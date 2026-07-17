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

:: Run database migrations
echo  Setting up database...
call npx prisma migrate dev --name init 2>nul
if %errorlevel% neq 0 (
    :: Migration may already be applied — that's fine, just generate the client
    echo  ^(Migrations already applied, continuing...^)
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
