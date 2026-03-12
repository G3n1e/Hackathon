@echo off
REM SK-Connect Job Card Service - Startup Script (Windows)
REM Usage: Double-click start.bat or run from Command Prompt

cd /d "%~dp0server"

where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js is not installed. Download from https://nodejs.org
  pause
  exit /b 1
)

IF NOT EXIST node_modules (
  echo Installing dependencies...
  npm install
)

echo.
echo ================================================
echo   SK-Connect Job Card Service
echo   Server: http://127.0.0.1:8787
echo   Ollama: http://127.0.0.1:11434
echo ================================================
echo.
echo Keep this window open while using the extension.
echo Press Ctrl+C to stop.
echo.

npm start
pause
