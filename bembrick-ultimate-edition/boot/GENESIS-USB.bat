@echo off
:: ═══════════════════════════════════════════════════════════════════════════
:: GENESIS 2.0 — USB Portable Launcher
:: ═══════════════════════════════════════════════════════════════════════════
:: Owner: Murray Bembrick (murray@bembrick.org)
:: YubiKey: 5C FIPS (Serial: 31695265)
:: ═══════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

title GENESIS 2.0 — Sovereign Security Platform

:: Colors via ANSI (Windows 10+)
echo.
echo [96m═══════════════════════════════════════════════════════════════[0m
echo [96m   ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗[0m
echo [96m  ██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝[0m
echo [96m  ██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗[0m
echo [96m  ██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║[0m
echo [96m  ╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║[0m
echo [96m   ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝[0m
echo [96m              Version 2.0 — USB Portable Mode[0m
echo [96m═══════════════════════════════════════════════════════════════[0m
echo.
echo [92m  Owner: Murray Bembrick (murray@bembrick.org)[0m
echo [92m  Mode:  USB Portable[0m
echo [96m═══════════════════════════════════════════════════════════════[0m
echo.

:: Think Different Manifesto
echo [93m┌───────────────────────────────────────────────────────────────┐[0m
echo [93m│[0m                                                               [93m│[0m
echo [93m│[0m  [97mHere's to the crazy ones.[0m                                    [93m│[0m
echo [93m│[0m  [90mThe rebels. The troublemakers. The round pegs.[0m              [93m│[0m
echo [93m│[0m  [90mThe ones who see things differently.[0m                        [93m│[0m
echo [93m│[0m                                                               [93m│[0m
echo [93m│[0m  [97mThey invent. They imagine. They heal.[0m                        [93m│[0m
echo [93m│[0m  [97mThey explore. They create. They inspire.[0m                     [93m│[0m
echo [93m│[0m                                                               [93m│[0m
echo [93m│[0m  [96mWe make tools for these kinds of people.[0m                    [93m│[0m
echo [93m│[0m                                                               [93m│[0m
echo [93m└───────────────────────────────────────────────────────────────┘[0m
echo.
timeout /t 2 /nobreak >nul

:: Get USB drive letter
set "USB_DRIVE=%~d0"
set "GENESIS_ROOT=%~dp0"

echo [93m[GENESIS][0m USB Drive: %USB_DRIVE%
echo [93m[GENESIS][0m Root: %GENESIS_ROOT%
echo.

:: Check for YubiKey
echo [93m[GENESIS][0m Checking for YubiKey 5C FIPS (31695265)...
where ykman >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=2" %%a in ('ykman info 2^>nul ^| findstr "Serial"') do (
        if "%%a"=="31695265" (
            echo [92m[GENESIS][0m ✓ YubiKey verified: 5C FIPS ^(31695265^)
            set "YUBIKEY_VERIFIED=true"
        ) else (
            echo [91m[GENESIS][0m ✗ Wrong YubiKey: %%a ^(expected: 31695265^)
            set "YUBIKEY_VERIFIED=false"
        )
    )
) else (
    echo [93m[GENESIS][0m YubiKey Manager not found. Skipping verification.
    set "YUBIKEY_VERIFIED=unknown"
)
echo.

:: Set environment
set "GENESIS_OWNER_ID=murray@bembrick.org"
set "GENESIS_OWNER_NAME=Murray Bembrick"
set "GENESIS_JURISDICTION=AU"
set "GENESIS_OWNER_ROLE=ADMIN"
set "GENESIS_ADMIN_EXCLUSIVE=true"
set "GENESIS_YUBIKEY_SERIAL=31695265"
set "GENESIS_YUBIKEY_MODE=otp"
set "GENESIS_PDP_PORT=8080"

:: Data directories on USB
set "GENESIS_KEY_DIR=%GENESIS_ROOT%data\keys"
set "GENESIS_AUDIT_DIR=%GENESIS_ROOT%data\audit"
set "GENESIS_EVIDENCE_DIR=%GENESIS_ROOT%data\evidence"

:: Create directories if needed
if not exist "%GENESIS_KEY_DIR%" mkdir "%GENESIS_KEY_DIR%"
if not exist "%GENESIS_AUDIT_DIR%" mkdir "%GENESIS_AUDIT_DIR%"
if not exist "%GENESIS_EVIDENCE_DIR%" mkdir "%GENESIS_EVIDENCE_DIR%"

echo [93m[GENESIS][0m Data directories configured
echo.

:: Check for Node.js
echo [93m[GENESIS][0m Checking for Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [91m[GENESIS][0m Node.js not found!
    echo.
    echo [93m[GENESIS][0m Options:
    echo   1. Install Node.js from: https://nodejs.org
    echo   2. Use portable Node.js from USB
    echo   3. Open static dashboard only
    echo.

    :: Check for portable Node
    if exist "%GENESIS_ROOT%node\node.exe" (
        echo [92m[GENESIS][0m Found portable Node.js on USB
        set "PATH=%GENESIS_ROOT%node;%PATH%"
        goto :start_server
    )

    :: Open static dashboard
    echo [93m[GENESIS][0m Opening static dashboard...
    if exist "%GENESIS_ROOT%..\bembrick-ultimate-edition\static\index.html" (
        start "" "%GENESIS_ROOT%..\bembrick-ultimate-edition\static\index.html"
    )
    goto :end
)

:start_server
echo [92m[GENESIS][0m ✓ Node.js found
echo.

:: Navigate to app
cd /d "%GENESIS_ROOT%..\bembrick-ultimate-edition"

:: Check dependencies
if not exist "node_modules" (
    echo [93m[GENESIS][0m Installing dependencies...
    call npm install --production
    echo.
)

:: Generate JWT secret if not set
if "%GENESIS_JWT_SECRET%"=="" (
    for /f %%a in ('powershell -Command "[System.Guid]::NewGuid().ToString('N') + [System.Guid]::NewGuid().ToString('N')"') do set "GENESIS_JWT_SECRET=%%a"
)

:: Start server
echo [93m[GENESIS][0m Starting GENESIS server...
echo.

start "GENESIS Server" cmd /c "npm start"

:: Wait for server
timeout /t 3 /nobreak >nul

:: Open dashboard
echo [92m[GENESIS][0m Opening dashboard...
start "" "http://localhost:8080"

echo.
echo [96m═══════════════════════════════════════════════════════════════[0m
echo [92m  GENESIS 2.0 — Running[0m
echo [96m═══════════════════════════════════════════════════════════════[0m
echo   Dashboard:  [96mhttp://localhost:8080[0m
echo   Owner:      [92mMurray Bembrick[0m
echo   YubiKey:    [92m31695265[0m
echo [96m═══════════════════════════════════════════════════════════════[0m
echo.
echo Press any key to stop the server...

:end
pause >nul
echo.
echo [93m[GENESIS][0m Shutting down...

:: Kill Node processes started from this USB
taskkill /f /im node.exe /fi "WINDOWTITLE eq GENESIS*" >nul 2>&1

echo [92m[GENESIS][0m Goodbye.
timeout /t 2 >nul
