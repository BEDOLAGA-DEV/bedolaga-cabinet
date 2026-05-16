# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=/api
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_APP_NAME=Cabinet
ARG VITE_APP_LOGO=V
ARG VITE_MOBILE_DEEPLINK_SCHEME=app
ARG MOBILE_DEEPLINK_PATHS=/verify-email*,/reset-password*
ARG MOBILE_IOS_APP_IDS
ARG MOBILE_ANDROID_PACKAGE_NAME
ARG MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_MOBILE_DEEPLINK_SCHEME=$VITE_MOBILE_DEEPLINK_SCHEME
ENV MOBILE_DEEPLINK_PATHS=$MOBILE_DEEPLINK_PATHS
ENV MOBILE_IOS_APP_IDS=$MOBILE_IOS_APP_IDS
ENV MOBILE_ANDROID_PACKAGE_NAME=$MOBILE_ANDROID_PACKAGE_NAME
ENV MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS=$MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS

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
