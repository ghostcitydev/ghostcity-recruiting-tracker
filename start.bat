@echo off
echo.
echo  CFB Recruiting Evolution Tracker
echo  Starting at http://localhost:3000
echo.
echo  Keep this window open while using the app.
echo  Close it to stop the server.
echo.
start "" /b cmd /c "timeout /t 2 >nul && start http://localhost:3000"
call npm run dev
