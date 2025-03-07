import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware para parsear JSON
app.use(express.json());

// Log para depuración
console.log(`Iniciando servidor en ${HOST}:${PORT}`);

// Middleware para verificar token en las peticiones al proxy
app.use('/api/proxy', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Error en búsqueda de productos',
      details: {
        code: 'unauthorized',
        message: 'authorization value not present'
      }
    });
  }

  try {
    // Pasar el token a las peticiones a MercadoLibre
    req.mlToken = authHeader.split(' ')[1];
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    res.status(401).json({
      error: 'Error de autenticación',
      details: error.message
    });
  }
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
    console.error('Error al obtener token:', error.response?.data || error.message);
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
    console.error('Error al refrescar token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al refrescar token',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para la API de MercadoLibre
app.get('/api/proxy/trends', async (req, res) => {
  try {
    console.log('Solicitando tendencias a MercadoLibre');
    const response = await axios.get('https://api.mercadolibre.com/trends/MLA');
    console.log('Respuesta recibida de MercadoLibre');
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener tendencias:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.status, error.response.data);
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
    console.error('Error al obtener categorías:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener categorías',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para búsqueda de productos
app.get('/api/proxy/search', async (req, res) => {
  try {
    const { q, category, limit = 50, offset = 0 } = req.query;
    
    // Validar parámetros
    if (!q && !category) {
      return res.status(400).json({ 
        error: 'Se requiere un término de búsqueda (q) o una categoría' 
      });
    }

    // Asegurarse de que el límite no exceda 50
    const safeLimit = Math.min(50, parseInt(limit.toString()));
    
    // Construir URL y parámetros
    const baseUrl = 'https://api.mercadolibre.com/sites/MLA/search';
    const params = new URLSearchParams({
      ...req.query,
      limit: safeLimit.toString(),
      offset: offset.toString()
    });

    // Realizar la petición a MercadoLibre con el token
    const response = await axios.get(`${baseUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${req.mlToken}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
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
    console.error('Error al obtener detalles del producto:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener detalles del producto',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para obtener visitas de un item
app.get('/api/proxy/items/:itemId/visits', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { date_from, date_to } = req.query;
    
    const response = await axios.get(
      `https://api.mercadolibre.com/items/${itemId}/visits/time_window`,
      {
        params: {
          last: 30,
          unit: 'day'
        },
        headers: {
          Authorization: `Bearer ${req.mlToken}`
        }
      }
    );

    // Transformar la respuesta al formato esperado
    const results = response.data.results.map((entry: any) => ({
      date: entry.date,
      total: entry.total
    }));

    res.json({ results });
  } catch (error) {
    console.error('Error al obtener visitas:', error);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener visitas',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para obtener información de un item
app.get('/api/proxy/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const response = await axios.get(
      `https://api.mercadolibre.com/items/${itemId}`,
      {
        headers: {
          Authorization: `Bearer ${req.mlToken}`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener información del item:', error);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener información del item',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para webhooks de MercadoLibre
app.post('/api/webhooks/mercadolibre', (req, res) => {
  console.log('Webhook recibido:', req.body);
  return res.status(200).json({ status: 'ok' });
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// Todas las demás rutas sirven el index.html para el enrutamiento del lado del cliente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Manejo de señales de terminación
const gracefulShutdown = () => {
  console.log('Iniciando apagado graceful...');
  server.close(() => {
    console.log('Servidor cerrado.');
    process.exit(0);
  });

  // Si el servidor no se cierra en 10 segundos, forzar cierre
  setTimeout(() => {
    console.error('No se pudo cerrar el servidor, forzando salida');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Iniciar servidor con manejo de errores
const server = app.listen(process.env.PORT || 8080, () => {
  console.log(`Servidor iniciado en puerto ${process.env.PORT || 8080}`);
});

// Configurar timeouts del servidor
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;