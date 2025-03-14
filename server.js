import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

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
console.log('Variables de entorno de Supabase:', {
  url: process.env.VITE_SUPABASE_URL ? 'presente' : 'faltante',
  key: process.env.VITE_SUPABASE_ANON_KEY ? 'presente' : 'faltante'
});

// Configurar rutas de la API antes de servir archivos estáticos
app.use('/api', (req, res, next) => {
  // Asegurarse de que las rutas de la API no sirvan el index.html
  if (req.path.startsWith('/proxy') || req.path.startsWith('/auth')) {
    next();
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
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

// Proxy para búsqueda de productos
app.get('/api/proxy/search', async (req, res) => {
  try {
    const { 
      q, 
      category,
      limit = 50, 
      offset = 0,
      min_price,
      max_price,
      condition,
      official_store_only
    } = req.query;
    
    if (!q && !category) {
      return res.status(400).json({ 
        error: 'Se requiere un término de búsqueda (q) o una categoría' 
      });
    }

    const baseUrl = 'https://api.mercadolibre.com/sites/MLA/search';
    const params = new URLSearchParams();
    
    if (q) params.append('q', q.toString());
    if (category) params.append('category', category.toString());
    if (min_price) params.append('price_min', min_price.toString());
    if (max_price) params.append('price_max', max_price.toString());
    if (condition && condition !== 'all') params.append('condition', condition);
    if (official_store_only === 'true') params.append('official_store', 'yes');
    
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

    // Obtener detalles adicionales para cada producto
    const productsWithDetails = await Promise.all(
      response.data.results.map(async (product) => {
        try {
          const detailsResponse = await axios.get(`https://api.mercadolibre.com/items/${product.id}`, {
            headers: {
              ...(authHeader && { Authorization: authHeader })
            }
          });
          return {
            ...product,
            date_created: detailsResponse.data.date_created,
            last_updated: detailsResponse.data.last_updated
          };
        } catch (error) {
          console.error(`Error al obtener detalles para ${product.id}:`, error);
          return product;
        }
      })
    );

    res.json({
      results: productsWithDetails,
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

// Proxy para obtener productos de un vendedor
app.get('/api/proxy/users/:userId/items/search', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const authHeader = req.headers.authorization;
    
    const response = await axios.get(
      `https://api.mercadolibre.com/users/${userId}/items/search`,
      {
        params: {
          limit,
          offset
        },
        headers: {
          ...(authHeader && { Authorization: authHeader })
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener productos del vendedor:', error);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener productos del vendedor',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para obtener detalles de items
app.get('/api/proxy/items', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: 'Se requiere el parámetro ids' });
    }
    
    const authHeader = req.headers.authorization;
    
    const response = await axios.get(
      `https://api.mercadolibre.com/items`,
      {
        params: { ids },
        headers: {
          ...(authHeader && { Authorization: authHeader })
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener detalles de items:', error);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener detalles de items',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para obtener visitas
app.get('/api/proxy/items/:itemId/visits/time_window', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { last = 30, unit = 'day' } = req.query;
    
    const authHeader = req.headers.authorization;
    
    const response = await axios.get(
      `https://api.mercadolibre.com/items/${itemId}/visits/time_window`,
      {
        params: { last, unit },
        headers: {
          ...(authHeader && { Authorization: authHeader })
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener visitas:', error);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener visitas',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para obtener tendencias
app.get('/api/proxy/trends/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const authHeader = req.headers.authorization;
    
    const response = await axios.get(
      `https://api.mercadolibre.com/trends/${siteId}`,
      {
        headers: {
          ...(authHeader && { Authorization: authHeader })
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener tendencias',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para obtener precio competitivo
app.get('/api/proxy/items/:itemId/price_to_win', async (req, res) => {
  try {
    const { itemId } = req.params;
    const authHeader = req.headers.authorization;
    
    // Obtener datos del producto
    const itemResponse = await axios.get(
      `https://api.mercadolibre.com/items/${itemId}`,
      {
        headers: {
          ...(authHeader && { Authorization: authHeader })
        }
      }
    );

    // Obtener productos similares
    const similarResponse = await axios.get(
      `https://api.mercadolibre.com/sites/MLA/search`,
      {
        params: {
          q: itemResponse.data.title,
          category: itemResponse.data.category_id,
          limit: 50
        },
        headers: {
          ...(authHeader && { Authorization: authHeader })
        }
      }
    );

    // Calcular precio competitivo
    const prices = similarResponse.data.results
      .map(item => item.price)
      .filter(price => !isNaN(price) && price > 0);

    if (prices.length === 0) {
      return res.json({
        price: itemResponse.data.price,
        competitive_advantages: ['No hay suficientes datos para calcular un precio competitivo']
      });
    }

    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const competitivePrice = averagePrice * 0.95; // 5% por debajo del promedio

    const advantages = [];
    if (competitivePrice < itemResponse.data.price) {
      advantages.push('Reducir el precio mejoraría la competitividad');
    } else {
      advantages.push('El precio actual es competitivo');
    }

    if (itemResponse.data.shipping.free_shipping) {
      advantages.push('El envío gratis es una ventaja competitiva');
    }

    res.json({
      price: competitivePrice,
      competitive_advantages: advantages
    });
  } catch (error) {
    console.error('Error al obtener precio competitivo:', error);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener precio competitivo',
      details: error.response?.data || error.message
    });
  }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// Todas las demás rutas sirven el index.html para el enrutamiento del lado del cliente
app.get('*', (req, res) => {
  // No servir index.html para rutas de la API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutándose en http://${HOST}:${PORT}`);
});