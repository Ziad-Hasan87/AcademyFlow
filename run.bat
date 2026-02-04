@echo off

REM Start renderer dev server in a new command prompt
start "Renderer Dev" cmd /k "cd renderer && npm run dev"

REM Wait for renderer dev server to be ready
echo Waiting for renderer dev server...
:waitloop
timeout /t 2 >nul
netstat -an | find "5173" >nul
if errorlevel 1 goto waitloop

echo Renderer dev server is up!

REM Start main app
npm start
