FROM node:20-bullseye

WORKDIR /app

# Install build deps commonly needed by native modules (canvas, prisma engines)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  build-essential \
  libcairo2-dev \
  libjpeg-dev \
  libpango1.0-dev \
  libglib2.0-dev \
  pkg-config \
  && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps --production=false

# Copy application source
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

# Use tsx at runtime to run the TypeScript server directly (avoids building full project)
CMD ["npx", "tsx", "src/server.ts"]