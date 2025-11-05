#!/bin/bash

if [ $# -eq 0 ]; then
    echo "🐳 Docker Development Utilities"
    echo ""
    echo "Usage: ./docker-dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start development databases"
    echo "  stop      - Stop development databases"
    echo "  restart   - Restart development databases"
    echo "  logs      - View database logs"
    echo "  reset     - Reset databases (removes all data)"
    echo "  status    - Show container status"
    echo "  shell-db  - Connect to PostgreSQL shell"
    echo "  shell-redis - Connect to Redis shell"
    echo ""
    exit 0
fi

case "$1" in
    "start")
        echo "📦 Starting development databases..."
        docker-compose -f docker-compose.dev.yml up -d
        echo "✅ Databases started"
        ;;
    "stop")
        echo "🛑 Stopping development databases..."
        docker-compose -f docker-compose.dev.yml down
        echo "✅ Databases stopped"
        ;;
    "restart")
        echo "🔄 Restarting development databases..."
        docker-compose -f docker-compose.dev.yml restart
        echo "✅ Databases restarted"
        ;;
    "logs")
        echo "📋 Showing database logs..."
        docker-compose -f docker-compose.dev.yml logs -f
        ;;
    "reset")
        echo "⚠️ This will delete all database data. Are you sure? (y/N)"
        read -r confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            echo "🗑️ Resetting databases..."
            docker-compose -f docker-compose.dev.yml down -v
            docker-compose -f docker-compose.dev.yml up -d
            echo "✅ Databases reset"
        else
            echo "❌ Reset cancelled"
        fi
        ;;
    "status")
        echo "📊 Container status:"
        docker-compose -f docker-compose.dev.yml ps
        ;;
    "shell-db")
        echo "🐘 Connecting to PostgreSQL..."
        docker exec -it laudo-postgres-dev psql -U laudo_user -d laudo_db_dev
        ;;
    "shell-redis")
        echo "🔴 Connecting to Redis..."
        docker exec -it laudo-redis-dev redis-cli
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Run './docker-dev.sh' without arguments to see available commands."
        exit 1
        ;;
esac