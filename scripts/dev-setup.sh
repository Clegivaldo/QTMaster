#!/bin/bash

set -e  # Exit on any error

echo "🚀 Setting up Sistema de Laudos Térmicos development environment..."
echo ""

# Check if Docker is running
if ! docker version >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Node.js is installed
if ! node --version >/dev/null 2>&1; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Start development databases
echo "📦 Starting PostgreSQL and Redis containers..."
if ! docker-compose -f docker-compose.dev.yml up -d; then
    echo "❌ Failed to start database containers"
    exit 1
fi

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 15

# Check if databases are healthy
echo "🔍 Checking database connectivity..."
docker-compose -f docker-compose.dev.yml ps

# Setup backend
echo ""
echo "📦 Setting up backend..."
cd backend

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
fi

echo "📦 Installing backend dependencies..."
if ! npm install; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

echo "🗄️ Setting up database schema..."
if ! npx prisma generate; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

if ! npx prisma db push; then
    echo "❌ Failed to push database schema"
    exit 1
fi

echo "🌱 Seeding database with initial data..."
if ! npm run db:seed; then
    echo "⚠️ Database seeding failed, but continuing..."
fi

# Setup frontend
echo ""
echo "📦 Setting up frontend..."
cd ../frontend

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating frontend .env file..."
    cp .env.example .env
fi

echo "📦 Installing frontend dependencies..."
if ! npm install; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "🚀 Quick start commands:"
echo "  Start backend:  cd backend && npm run dev"
echo "  Start frontend: cd frontend && npm run dev"
echo ""
echo "🐳 Docker commands:"
echo "  View logs:      docker-compose -f docker-compose.dev.yml logs -f"
echo "  Stop databases: docker-compose -f docker-compose.dev.yml down"
echo "  Reset data:     docker-compose -f docker-compose.dev.yml down -v"
echo ""
echo "🌐 Application URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  Database: localhost:5433 (user: laudo_user, db: laudo_db_dev)"
echo ""