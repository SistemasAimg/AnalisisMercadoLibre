import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cors from 'cors';
import httpProxy from 'http-proxy';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verificar variables de entorno requeridas
const requiredEnvVars = ['ML_CLIENT_ID', 'ML_CLIENT_SECRET', 'ML_REDIRECT_URI'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`⚠️ Variable de entorno ${varName} no está definida`);
  } else {
    console.log(`✅ Variable de entorno ${varName} está definida`);
  }
});

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Log para depuración
console.log('🚀 Iniciando servidor...');
console.log('📂 Directorio actual:', __dirname);
console.log('🌍 Ambiente:', process.env.NODE_ENV);
console.log('🔌 Puerto:', PORT);
console.log('🏠 Host:', HOST);

// Verificar existencia del directorio dist
const distPath = path.join(__dirname, 'dist');
try {
  if (fs.existsSync(distPath)) {
    console.log('✅ Directorio dist encontrado:', distPath);
    const files = fs.readdirSync(distPath);
    console.log('📁 Archivos en dist:', files);
  } else {
    console.warn('⚠️ Directorio dist no encontrado');
  }
} catch (error) {
  console.error('❌ Error al verificar directorio dist:', error);
}

// Configuración del proxy
const proxy = httpProxy.createProxyServer({
  target: 'https://api.mercadolibre.com',
  changeOrigin: true,
  secure: true,
  onProxyReq: (proxyReq, req, res) => {
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    console.log('🔄 Proxy request headers:', proxyReq.getHeaders());
  },
  onError: (err, req, res) => {
    console.error('❌ Error en proxy:', err);
    res.status(500).json({ error: 'Error en el proxy', details: err.message });
  }
});

// Middleware para manejar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Ruta del proxy
app.use('/api/proxy', (req, res) => {
  console.log('🔄 Proxy request:', req.method, req.url);
  proxy.web(req, res, {
    target: 'https://api.mercadolibre.com',
    changeOrigin: true,
    secure: true
  });
});

// Servir archivos estáticos primero
app.use(express.static(distPath));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check solicitado');
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    distExists: fs.existsSync(distPath)
  });
});

// Endpoint para intercambio de código por token
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Código de autorización requerido' });
    }

    console.log('🔑 Intentando obtener token con código:', code);
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      code,
      redirect_uri: process.env.ML_REDIRECT_URI
    });

    console.log('✅ Token obtenido exitosamente');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error al obtener token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener token',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para refrescar token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    console.log('🔄 Intentando refrescar token');
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      refresh_token
    });

    console.log('✅ Token refrescado exitosamente');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error al refrescar token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al refrescar token',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para webhooks de MercadoLibre
app.post('/api/webhooks/mercadolibre', (req, res) => {
  console.log('🔄 Webhook recibido:', req.body);
  return res.status(200).json({ status: 'ok' });
});

// Todas las demás rutas sirven el index.html
app.get('*', (req, res) => {
  console.log('🌐 Serving index.html for route:', req.url);
  res.sendFile(path.join(distPath, 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    details: err.message
  });
});

// Proceso de inicio del servidor
const startServer = () => {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`✅ Servidor ejecutándose en http://${HOST}:${PORT}`);
      console.log('📂 Directorio de archivos estáticos:', distPath);
      resolve(server);
    });

    server.on('error', (error) => {
      console.error('❌ Error al iniciar servidor:', error);
      reject(error);
    });
  });
};

// Iniciar servidor con manejo de errores
try {
  await startServer();
} catch (error) {
  console.error('❌ Error fatal al iniciar servidor:', error);
  process.exit(1);
}