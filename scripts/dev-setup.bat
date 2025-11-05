@echo off
setlocal enabledelayedexpansion

echo 🚀 Setting up Sistema de Laudos Térmicos development environment...
echo.

REM Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

REM Start development databases
echo 📦 Starting PostgreSQL and Redis containers...
docker-compose -f docker-compose.dev.yml up -d
if errorlevel 1 (
    echo ❌ Failed to start database containers
    pause
    exit /b 1
)

REM Wait for databases to be ready
echo ⏳ Waiting for databases to be ready...
timeout /t 15 /nobreak > nul

REM Check if databases are healthy
echo 🔍 Checking database connectivity...
docker-compose -f docker-compose.dev.yml ps

REM Setup backend
echo.
echo 📦 Setting up backend...
cd backend

REM Copy environment file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating backend .env file...
    copy .env.example .env
)

echo 📦 Installing backend dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)

echo 🗄️ Setting up database schema...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Failed to generate Prisma client
    cd ..
    pause
    exit /b 1
)

call npx prisma db push
if errorlevel 1 (
    echo ❌ Failed to push database schema
    cd ..
    pause
    exit /b 1
)

echo 🌱 Seeding database with initial data...
call npm run db:seed
if errorlevel 1 (
    echo ⚠️ Database seeding failed, but continuing...
)

REM Setup frontend
echo.
echo 📦 Setting up frontend...
cd ..\frontend

REM Copy environment file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating frontend .env file...
    copy .env.example .env
)

echo 📦 Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ✅ Development environment setup complete!
echo.
echo 🚀 Quick start commands:
echo   Start backend:  cd backend ^&^& npm run dev
echo   Start frontend: cd frontend ^&^& npm run dev
echo.
echo 🐳 Docker commands:
echo   View logs:      docker-compose -f docker-compose.dev.yml logs -f
echo   Stop databases: docker-compose -f docker-compose.dev.yml down
echo   Reset data:     docker-compose -f docker-compose.dev.yml down -v
echo.
echo 🌐 Application URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo   Database: localhost:5433 (user: laudo_user, db: laudo_db_dev)
echo.

pause