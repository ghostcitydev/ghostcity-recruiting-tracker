@echo off
setlocal
cd /d "%~dp0"

echo.
echo  Ghost City RLT - Local Portable Build
echo  =====================================
echo  This mirrors the same steps the GitHub release build runs,
echo  so you get the same Portable EXE and No-Install ZIP saved
echo  straight into the dist\ folder here, no download required.
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo  Download it from https://nodejs.org ^(choose the LTS version^)
    pause
    exit /b 1
)

echo  [1/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 goto :buildfail

echo.
echo  [2/6] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 goto :buildfail

echo.
echo  [3/6] Rebuilding better-sqlite3 for Electron...
call npx @electron/rebuild -f -w better-sqlite3
if %errorlevel% neq 0 goto :buildfail

echo.
echo  [4/6] Building Next.js...
call npx next build
if %errorlevel% neq 0 goto :buildfail

echo.
echo  [5/6] Preparing standalone assets...
call node scripts\prepare-standalone.js
if %errorlevel% neq 0 goto :buildfail

echo.
echo  [6/6] Packaging with electron-builder...
call npx electron-builder --win --x64 --publish never
if %errorlevel% neq 0 goto :buildfail

echo.
echo  Creating no-install ZIP...
powershell -NoProfile -Command ^
  "$v = (Get-Content package.json | ConvertFrom-Json).version; Compress-Archive -Path 'dist/win-unpacked/*' -DestinationPath \"dist/Ghost City RLT No-Install $v.zip\" -Force"
if %errorlevel% neq 0 goto :buildfail

echo.
echo  ============================================
echo  Build complete! Find your files in:
echo  %cd%\dist
echo  ============================================
echo.
start "" "%cd%\dist"
pause
exit /b 0

:buildfail
echo.
echo  ============================================
echo  The build failed ^(code %errorlevel%^).
echo  Scroll up to see the error above this line,
echo  then press any key to close this window.
echo  ============================================
pause >nul
exit /b 1
