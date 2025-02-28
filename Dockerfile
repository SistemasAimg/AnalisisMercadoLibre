# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Declarar argumentos de build para las variables de entorno que necesita Vite
ARG VITE_ML_CLIENT_ID
ARG VITE_ML_CLIENT_SECRET
ARG VITE_ML_REDIRECT_URI

# Exportar las variables para que Vite las pueda usar
ENV VITE_ML_CLIENT_ID=${VITE_ML_CLIENT_ID}
ENV VITE_ML_CLIENT_SECRET=${VITE_ML_CLIENT_SECRET}
ENV VITE_ML_REDIRECT_URI=${VITE_ML_REDIRECT_URI}

# Copiar archivos package y instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código fuente
COPY . .

# Build de la aplicación (Vite usará las variables de entorno definidas)
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copiar package files e instalar dependencias de producción
COPY package*.json ./
RUN npm ci --production

# Copiar los assets construidos y archivos del servidor
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

# Exponer puerto
EXPOSE 8080

# Configurar variables de entorno para el runtime
ENV PORT=8080
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

# Iniciar el servidor
CMD ["node", "server.js"]
