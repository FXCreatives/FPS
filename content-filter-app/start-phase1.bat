@echo off
REM Content Filter API - Phase 1 Startup Script for Windows
REM This script installs dependencies and starts the server

echo 🚀 Content Filter API - Phase 1 Startup
echo ======================================
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 14+ first:
    echo    Download from: https://nodejs.org
    echo    Install the LTS version
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=2 delims=v." %%i in ('node -v') do set NODE_VERSION=%%i
if %NODE_VERSION% LSS 14 (
    echo ❌ Node.js version %NODE_VERSION% is too old. Please install Node.js 14 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js %NODE_VERSION%.x found

REM Check if npm is installed
npm -v >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm found

REM Install dependencies
echo.
echo 📦 Installing dependencies...
if exist phase1-package.json (
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ phase1-package.json not found
    pause
    exit /b 1
)

REM Create data directory
echo.
echo 📁 Creating data directory...
if not exist data mkdir data
echo ✅ Data directory ready

REM Start the server
echo.
echo 🎯 Starting Content Filter API...
echo    Server: http://localhost:3000
echo    Health: http://localhost:3000/api/health
echo    Docs:   http://localhost:3000/api/docs
echo    Test:   http://localhost:3000/api/test
echo.
echo 📋 API Key: Use 'X-API-Key: cf_demo_key' (any key starting with 'cf_')
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start server with error handling
node phase1-server.js

REM If server stops, show helpful information
echo.
echo 📊 Server stopped
echo.
echo 🔧 Troubleshooting:
echo    1. Check if port 3000 is already in use
echo    2. View logs above for error details
echo    3. Run 'npm test' to test the API
echo.
echo 🚀 To restart: double-click this file again
pause