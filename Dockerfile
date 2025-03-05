# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets and server files
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

# Start the server
CMD ["node", "server.js"]