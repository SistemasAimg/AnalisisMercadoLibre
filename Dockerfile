# Build stage
FROM node:20-alpine AS builder

# Instalar dependencias necesarias
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto de los archivos
COPY . .

# Construir la aplicación
RUN npm run build

# Production stage
FROM node:20-alpine

# Instalar dependencias necesarias para producción
RUN apk add --no-cache curl

WORKDIR /app

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Copiar archivos necesarios desde el builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && \
    npm cache clean --force

# Configurar healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Exponer puerto
EXPOSE ${PORT}

# Configurar usuario no root
USER node

# Comando de inicio
CMD ["node", "--max_old_space_size=460", "server.js"]