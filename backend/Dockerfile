# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application (compile TypeScript only for backend)
# The project `build` script runs `tsc && vite build` which is intended
# for the frontend; in the backend image we only need to compile TypeScript.
RUN npm run build:backend

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install system dependencies for Puppeteer and PDF generation
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  freetype-dev \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  wget \
  curl \
  python3 \
  py3-pip

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
# Use a consistent executable path and ensure skipping download during build.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies and tsx for TypeScript execution
RUN npm ci --only=production && npm install -g tsx && npm cache clean --force \
  && pip install --no-cache-dir -r backend/python/requirements.txt || echo "Python fallback requirements skipped (path may not exist in build context)"

# Copy source code and generated Prisma client from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create necessary directories
RUN mkdir -p uploads uploads/reports templates public/images/gallery signatures certificates

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Ensure a home directory and Puppeteer cache exist for the non-root user
RUN mkdir -p /home/nodejs && \
  mkdir -p /home/nodejs/.cache/puppeteer && \
  chown -R nodejs:nodejs /home/nodejs && \
  chown -R nodejs:nodejs /home/nodejs/.cache/puppeteer

# Set HOME to the node user's home
ENV HOME=/home/nodejs

# Ensure consistent chromium binary name (create symlink if necessary)
RUN if [ -f /usr/bin/chromium-browser ]; then ln -sf /usr/bin/chromium-browser /usr/bin/chromium; \
  elif [ -f /usr/bin/chromium ]; then ln -sf /usr/bin/chromium /usr/bin/chromium-browser; fi

USER nodejs

# Expose port (documented default); the container reads $PORT at runtime
ENV PORT=5000
EXPOSE 5000

# Health check uses the PORT env var so it can follow configured port
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const p=process.env.PORT||5000; require('http').get(`http://localhost:${p}/api/health`, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]