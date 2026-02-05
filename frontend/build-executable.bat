@echo off
echo Building F80 Frontend Executable...
echo.

REM Check if pkg is installed globally
pkg --version >nul 2>&1
if errorlevel 1 (
    echo Installing pkg globally...
    npm install -g pkg
    echo.
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Build the SvelteKit app
echo Building SvelteKit application...
npm run build
echo.

REM Create the executable
echo Creating executable...
npm run build-launcher
echo.

if exist "f80-frontend.exe" (
    echo.
    echo SUCCESS! Executable created: f80-frontend.exe
    echo.
    echo To run the application, simply double-click f80-frontend.exe
    echo or run it from command line: f80-frontend.exe
    echo.
) else (
    echo.
    echo ERROR: Failed to create executable
    echo.
)

pause
