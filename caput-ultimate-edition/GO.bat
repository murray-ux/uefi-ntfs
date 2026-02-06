@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  GENESIS 2.0 — Windows Quick Launch (MSI Laptop)
REM ═══════════════════════════════════════════════════════════════════════════
REM  Double-click this file or run from terminal:  GO.bat
REM ═══════════════════════════════════════════════════════════════════════════

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║       G E N E S I S   2 . 0          ║
echo  ║       Developer Pro — Starting        ║
echo  ╚═══════════════════════════════════════╝
echo.

REM Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    echo         Recommended: Node 20 LTS or later
    pause
    exit /b 1
)

echo [1/4] Node.js found:
node --version

REM Install deps if needed
if not exist "node_modules" (
    echo [2/4] Installing dependencies...
    call npm install
) else (
    echo [2/4] Dependencies already installed
)

REM Run setup (creates dirs, .env, JWT secret)
echo [3/4] Running first-time setup...
node scripts\setup.js

REM Load .env and start
echo [4/4] Starting GENESIS server...
echo.

REM Parse .env and set variables
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        REM Skip comments and empty lines
        echo %%a | findstr /r "^#" >nul || (
            if not "%%a"=="" if not "%%b"=="" set "%%a=%%b"
        )
    )
)

echo  Dashboard:  http://localhost:8080/
echo  Press Ctrl+C to stop
echo.

npx tsx src\server.ts
pause
