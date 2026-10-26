@echo off
setlocal
cd /d "%~dp0"
echo Synesthesia
echo Open http://localhost:8080/ in your browser after the server starts.
echo Keep this window open. Press Ctrl+C to stop the server.
echo.
where py >nul 2>&1
if not errorlevel 1 (
    py -3 -m http.server 8080 --bind 127.0.0.1
) else (
    python -m http.server 8080 --bind 127.0.0.1
)
if errorlevel 1 (
    echo.
    echo The server could not start. Check that Python 3 is installed and port 8080 is available.
    pause
)
endlocal
