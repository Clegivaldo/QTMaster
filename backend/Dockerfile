FROM node:20-bullseye

WORKDIR /app

# Install build deps commonly needed by native modules (canvas, prisma engines)
# AND Puppeteer dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  build-essential \
  libcairo2-dev \
  libjpeg-dev \
  libpango1.0-dev \
  libglib2.0-dev \
  pkg-config \
  # Puppeteer dependencies
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first
COPY python/requirements.txt /app/python/
RUN pip3 install --no-cache-dir -r /app/python/requirements.txt

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps --production=false

# Copy application source
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

# Use tsx at runtime to run the TypeScript server directly (avoids building full project)
CMD ["npx", "tsx", "src/server.ts"]