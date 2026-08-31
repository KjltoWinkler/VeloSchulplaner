# Production Dockerfile for Astra / Velo.Schulplaner Backend
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies (only production deps)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application files
COPY server.js ./
COPY public ./public

# Prepare persistent data volume
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Expose server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the Express server
CMD ["node", "server.js"]
