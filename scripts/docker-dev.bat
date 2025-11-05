@echo off
setlocal enabledelayedexpansion

if "%1"=="" (
    echo 🐳 Docker Development Utilities
    echo.
    echo Usage: docker-dev.bat [command]
    echo.
    echo Commands:
    echo   start     - Start development databases
    echo   stop      - Stop development databases
    echo   restart   - Restart development databases
    echo   logs      - View database logs
    echo   reset     - Reset databases ^(removes all data^)
    echo   status    - Show container status
    echo   shell-db  - Connect to PostgreSQL shell
    echo   shell-redis - Connect to Redis shell
    echo.
    exit /b 0
)

if "%1"=="start" (
    echo 📦 Starting development databases...
    docker-compose -f docker-compose.dev.yml up -d
    echo ✅ Databases started
    goto :eof
)

if "%1"=="stop" (
    echo 🛑 Stopping development databases...
    docker-compose -f docker-compose.dev.yml down
    echo ✅ Databases stopped
    goto :eof
)

if "%1"=="restart" (
    echo 🔄 Restarting development databases...
    docker-compose -f docker-compose.dev.yml restart
    echo ✅ Databases restarted
    goto :eof
)

if "%1"=="logs" (
    echo 📋 Showing database logs...
    docker-compose -f docker-compose.dev.yml logs -f
    goto :eof
)

if "%1"=="reset" (
    echo ⚠️ This will delete all database data. Are you sure? ^(y/N^)
    set /p confirm=
    if /i "!confirm!"=="y" (
        echo 🗑️ Resetting databases...
        docker-compose -f docker-compose.dev.yml down -v
        docker-compose -f docker-compose.dev.yml up -d
        echo ✅ Databases reset
    ) else (
        echo ❌ Reset cancelled
    )
    goto :eof
)

if "%1"=="status" (
    echo 📊 Container status:
    docker-compose -f docker-compose.dev.yml ps
    goto :eof
)

if "%1"=="shell-db" (
    echo 🐘 Connecting to PostgreSQL...
    docker exec -it laudo-postgres-dev psql -U laudo_user -d laudo_db_dev
    goto :eof
)

if "%1"=="shell-redis" (
    echo 🔴 Connecting to Redis...
    docker exec -it laudo-redis-dev redis-cli
    goto :eof
)

echo ❌ Unknown command: %1
echo Run 'docker-dev.bat' without arguments to see available commands.