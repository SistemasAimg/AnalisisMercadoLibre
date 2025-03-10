# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build && \
    ls -la dist/

# Etapa de producción
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias necesarias para el servidor
COPY package*.json ./

# Instalar TODAS las dependencias en producción
RUN npm ci && \
    npm ls express cors http-proxy axios && \
    echo "Verificando instalación de dependencias..."

# Copiar archivos construidos y del servidor
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/server.js ./

# Verificar archivos copiados
RUN ls -la && \
    ls -la dist/ && \
    echo "Node version: $(node -v)" && \
    echo "NPM version: $(npm -v)"

# Crear directorio de logs y establecer permisos
RUN mkdir -p /app/logs && \
    chown -R node:node /app && \
    chmod -R 755 /app/dist

# Cambiar al usuario no root
USER node

# Exponer puerto
EXPOSE 8080

# Variables de entorno
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Comando para iniciar el servidor con mejor manejo de errores
CMD ["node", "--trace-warnings", "--unhandled-rejections=strict", "server.js"]