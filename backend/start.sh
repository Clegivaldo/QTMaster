#!/bin/bash
# Respect environment variables for database host/user/port so compose can configure them
PGHOST=${POSTGRES_HOST:-${DB_HOST:-postgres}}
PGPORT=${POSTGRES_PORT:-${DB_PORT:-5432}}
PGUSER=${POSTGRES_USER:-${DB_USER:-laudo_user}}

echo "Waiting for database at ${PGHOST}:${PGPORT} as user ${PGUSER}..."
until pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}"; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is ready, running migrations..."
npx prisma migrate deploy
# If there are no migration files (common in local/dev), ensure schema is present
# by pushing Prisma schema to the database (safe for dev environments).
npx prisma db push --accept-data-loss || true
echo "Running database seed..."
npm run db:seed
echo "Starting application..."
exec "$@"