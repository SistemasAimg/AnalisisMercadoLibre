# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copiar solo los archivos necesarios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && \
    npm cache clean --force

# Configurar healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Exponer puerto
EXPOSE 8080

# Comando de inicio con opciones optimizadas de Node
CMD ["node", "--optimize_for_size", "--max_old_space_size=460", "--gc_interval=100", "server.js"]