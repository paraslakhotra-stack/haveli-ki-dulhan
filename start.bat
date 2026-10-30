@echo off
REM Double-click on Windows to start Nightfall.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org ^(LTS^), then run this again. & pause & exit /b 1)
if not exist node_modules call npm install
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000/tv"
npm start
pause
