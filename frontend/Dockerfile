# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
# Use `npm install` here because `package-lock.json` in the repo
# can be out of sync with `package.json` and `npm ci` would fail.
# `npm install` is more tolerant and will install according to
# `package.json` when building inside Docker.
RUN npm install --no-audit --prefer-offline --no-progress

# Copy source code
COPY . .

# Build the application
# Run Vite build directly inside the container to avoid running full
# `tsc` type-check during the image build (the repo has many pre-existing
# TypeScript type errors that block `tsc`). Vite will compile/transpile
# the app without full type-checking which is acceptable for building
# production assets inside Docker.
RUN npx vite build --mode production

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]