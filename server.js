import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Log para depuración
console.log(`Iniciando servidor en ${HOST}:${PORT}`);

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
    const authHeader = req.headers.authorization;
    console.log('Solicitando tendencias a MercadoLibre');
    const response = await axios.get('https://api.mercadolibre.com/trends/MLA', {
      headers: {
        ...(authHeader && { Authorization: authHeader })
      }
    });
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
    const authHeader = req.headers.authorization;
    const response = await axios.get('https://api.mercadolibre.com/sites/MLA/categories', {
      headers: {
        ...(authHeader && { Authorization: authHeader })
      }
    });
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
    
    if (!q && !category) {
      return res.status(400).json({ 
        error: 'Se requiere un término de búsqueda (q) o una categoría' 
      });
    }

    const baseUrl = 'https://api.mercadolibre.com/sites/MLA/search';
    const params = new URLSearchParams();
    
    if (q) params.append('q', q.toString());
    if (category) params.append('category', category.toString());
    
    const limitNum = Math.min(50, Math.max(1, parseInt(limit.toString()) || 50));
    const offsetNum = Math.max(0, parseInt(offset.toString()) || 0);
    
    params.append('limit', limitNum.toString());
    params.append('offset', offsetNum.toString());

    // Forward the Authorization header if present
    const authHeader = req.headers.authorization;

    const response = await axios.get(`${baseUrl}?${params.toString()}`, {
      headers: {
        ...(authHeader && { Authorization: authHeader })
      }
    });

    res.json({
      results: response.data.results,
      paging: {
        total: response.data.paging.total,
        offset: response.data.paging.offset,
        limit: response.data.paging.limit
      }
    });
  } catch (error) {
    console.error('Error en búsqueda de productos:', error.message);
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Error en búsqueda de productos',
        details: error.response.data
      });
    } else {
      res.status(500).json({ 
        error: 'Error en búsqueda de productos',
        message: error.message 
      });
    }
  }
});

// Proxy para detalles de producto
app.get('/api/proxy/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const response = await axios.get(`https://api.mercadolibre.com/items/${id}`, {
      headers: {
        ...(authHeader && { Authorization: authHeader })
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener detalles del producto:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener detalles del producto',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint para obtener visitas de productos
app.get('/api/proxy/items/:id/visits', async (req, res) => {
  try {
    const { id } = req.params;
    const { last = 30, unit = 'day' } = req.query;
    const authHeader = req.headers.authorization;

    const response = await axios.get(`https://api.mercadolibre.com/items/${id}/visits/time_window`, {
      params: {
        last,
        unit
      },
      headers: {
        ...(authHeader && { Authorization: authHeader })
      }
    });

    // Transformar la respuesta al formato esperado
    const results = response.data.results || [];
    const formattedResults = results.map(item => ({
      date: item.date,
      total: item.total
    }));

    res.json({ results: formattedResults });
  } catch (error) {
    console.error('Error al obtener visitas:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener visitas',
      details: error.response?.data || error.message
    });
  }
});

// Endpoints para webhooks de MercadoLibre
app.post('/api/webhooks', (req, res) => {
  // Redirigir al endpoint correcto
  res.redirect(307, '/api/webhooks/mercadolibre');
});

app.post('/api/webhooks/', (req, res) => {
  // Redirigir al endpoint correcto
  res.redirect(307, '/api/webhooks/mercadolibre');
});

app.post('/api/webhooks/mercadolibre', (req, res) => {
  try {
    console.log('Webhook recibido:', req.body);

    // Validar la estructura del webhook
    const { topic, resource, user_id, application_id } = req.body;
    
    if (!topic || !resource || !user_id || !application_id) {
      return res.status(400).json({ 
        error: 'Formato de webhook inválido',
        message: 'Se requieren los campos: topic, resource, user_id, application_id' 
      });
    }

    // Procesar según el tipo de notificación
    switch (topic) {
      case 'items':
        console.log('Procesando notificación de items:', resource);
        break;
      case 'questions':
        console.log('Procesando notificación de preguntas:', resource);
        break;
      default:
        console.log('Tipo de notificación no manejado:', topic);
    }

    // Responder con éxito
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error al procesar webhook:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// Todas las demás rutas sirven el index.html para el enrutamiento del lado del cliente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutándose en http://${HOST}:${PORT}`);
});