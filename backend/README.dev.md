# Backend — Development notes

This file explains how to run the backend locally and how to solve `PrismaClientInitializationError: Can't reach database server at postgres:5432`.

## Common fixes for `Can't reach database server at postgres:5432`

1. The repository uses Docker by default (`docker-compose.yml`) where the Postgres service is named `postgres`, and `backend/.env` is configured to connect to `postgres:5432` (the Docker service name). If you run the backend outside Docker, the host name `postgres` does not resolve on the host machine. Use one of these options:

### Option A — Recommended: Run everything with Docker

From the project root, run in PowerShell:

```powershell
# This script builds the images, starts postgres + backend + redis and runs migrations
.\docker-start.ps1
```

This exposes Postgres on the host at `localhost:5432` while using the internal Docker DNS name `postgres` for services inside the Docker network.

### Option B — Run backend locally but Dockerize Postgres

If you prefer to run the Node backend on your machine and still use the database from the Docker container, change the database host in `backend/.env` to `localhost` after starting docker-compose. Example `.env` snippet:

```
DATABASE_URL="postgresql://laudo_user:laudo_password@localhost:5432/laudo_db"
```

Start only postgres and redis with Docker:

```powershell
docker-compose up -d postgres redis
```

Then run the backend:

```powershell
cd backend
npm run dev:backend
```

### Option C — Run Postgres locally (native installation)

Install PostgreSQL on your Windows machine and create the database `laudo_db` with user `laudo_user`. Update `backend/.env` to point to the correct host and credentials.

## Helpful commands

- Check if Postgres is reachable via host/port:

```powershell
# check port 5432 from host
Test-NetConnection -ComputerName localhost -Port 5432

# use psql (from a container or host installation)
psql -h localhost -p 5432 -U laudo_user -d laudo_db
```

- Show helpful logs for docker

```powershell
docker-compose logs -f backend
```

## Why you saw the error

When `backend/.env` contains `postgres:5432` the host name is resolvable only when the backend runs inside the same Docker network where the service name `postgres` exists. Running `npm start` on the host tries to connect to `postgres:5432` which doesn't resolve → Prisma throws `PrismaClientInitializationError`.

## Developer improvement we added

We added a pre-start database connectivity check to the backend (in `server.ts`) so the server fails early with a clear reason and hints on how to fix it (Docker / change host). This helps quickly identify misconfiguration when running on Windows or outside Docker.
