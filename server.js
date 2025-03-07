import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import winston from 'winston';

// Configuración de dotenv
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración del logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Validar variables de entorno requeridas
const requiredEnvVars = [
  'VITE_ML_CLIENT_ID',
  'VITE_ML_CLIENT_SECRET',
  'VITE_ML_REDIRECT_URI'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error(`Faltan variables de entorno requeridas: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Configuración de trust proxy para rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Middleware para parsear JSON
app.use(express.json());

// Log para depuración
logger.info(`Iniciando servidor en ${HOST}:${PORT}`);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint para intercambio de código por token
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Código de autorización requerido' });
    }

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.VITE_ML_CLIENT_ID,
      client_secret: process.env.VITE_ML_CLIENT_SECRET,
      code,
      redirect_uri: process.env.VITE_ML_REDIRECT_URI
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Error al obtener token:', error.response?.data || error.message);
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

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: process.env.VITE_ML_CLIENT_ID,
      client_secret: process.env.VITE_ML_CLIENT_SECRET,
      refresh_token
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Error al refrescar token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al refrescar token',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para la API de MercadoLibre
app.get('/api/proxy/trends', async (req, res) => {
  try {
    logger.info('Solicitando tendencias a MercadoLibre');
    const response = await axios.get('https://api.mercadolibre.com/trends/MLA');
    logger.info('Respuesta recibida de MercadoLibre');
    res.json(response.data);
  } catch (error) {
    logger.error('Error al obtener tendencias:', error.message);
    if (error.response) {
      logger.error('Detalles del error:', error.response.status, error.response.data);
      res.status(error.response.status).json({
        error: 'Error al obtener tendencias',
        details: error.response.data
      });
    } else {
      res.status(500).json({ error: 'Error al obtener tendencias' });
    }
  }
});

// Proxy para categorías
app.get('/api/proxy/categories', async (req, res) => {
  try {
    const response = await axios.get('https://api.mercadolibre.com/sites/MLA/categories');
    res.json(response.data);
  } catch (error) {
    logger.error('Error al obtener categorías:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener categorías',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para búsqueda de productos
app.get('/api/proxy/search', async (req, res) => {
  try {
    const { q, limit = 50, offset = 0 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    }

    const response = await axios.get('https://api.mercadolibre.com/sites/MLA/search', {
      params: {
        q,
        limit,
        offset
      },
      headers: {
        'Authorization': `Bearer ${req.headers.authorization}`
      }
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Error en búsqueda de productos:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error en búsqueda de productos',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para detalles de producto
app.get('/api/proxy/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`https://api.mercadolibre.com/items/${id}`);
    res.json(response.data);
  } catch (error) {
    logger.error('Error al obtener detalles del producto:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener detalles del producto',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para webhooks de MercadoLibre
app.post('/api/webhooks/mercadolibre', (req, res) => {
  logger.info('Webhook recibido:', req.body);
  return res.status(200).json({ status: 'ok' });
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// Todas las demás rutas sirven el index.html para el enrutamiento del lado del cliente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar el servidor
app.listen(PORT, HOST, () => {
  logger.info(`Servidor ejecutándose en http://${HOST}:${PORT}`);
});