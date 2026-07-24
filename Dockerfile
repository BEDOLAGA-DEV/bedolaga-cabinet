# Stage 1: Build the React application
FROM oven/bun:1-alpine AS bun-bin

# Гибрид: bun только для установки пакетов (2.4x быстрее npm ci),
# сборка остаётся под node — вывод бит-в-бит совпадает с npm-сборкой
FROM node:20-alpine AS builder
RUN apk add --no-cache libgcc libstdc++
COPY --from=bun-bin /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Copy package files (bun.lock is generated from package-lock.json versions)
COPY package.json bun.lock ./

# Install dependencies (frozen lockfile = reproducible builds, like npm ci)
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=/api
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_APP_NAME=Cabinet
ARG VITE_APP_LOGO=V

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_LOGO=$VITE_APP_LOGO

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1



