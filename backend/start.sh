#!/bin/bash
echo "Waiting for database..."
until pg_isready -h postgres -p 5432 -U laudo_user; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is ready, running migrations..."
npx prisma migrate deploy
echo "Running database seed..."
npm run db:seed
echo "Starting application..."
exec "$@"