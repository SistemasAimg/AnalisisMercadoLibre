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

// Nuevo endpoint para obtener visitas totales por producto
app.get('/api/proxy/product-visits', async (req, res) => {
  try {
    const { q, official_store_only } = req.query;
    const authHeader = req.headers.authorization;

    if (!q) {
      return res.status(400).json({ error: 'Se requiere un término de búsqueda' });
    }

    // Buscar todas las publicaciones del producto
    const searchResponse = await axios.get(
      `https://api.mercadolibre.com/sites/MLA/search`,
      {
        params: {
          q,
          limit: 50,
          ...(official_store_only === 'true' && { official_store: 'yes' })
        },
        headers: {
          ...(authHeader && { Authorization: authHeader })
        }
      }
    );

    // Obtener visitas para cada publicación
    const visitsPromises = searchResponse.data.results.map(product =>
      axios.get(`https://api.mercadolibre.com/items/${product.id}/visits/time_window`, {
        params: { last: 30, unit: 'day' },
        headers: {
          ...(authHeader && { Authorization: authHeader })
        }
      }).catch(error => {
        console.error(`Error al obtener visitas para ${product.id}:`, error);
        return { data: { results: [] } };
      })
    );

    const visitsResponses = await Promise.all(visitsPromises);

    // Combinar y sumar las visitas por fecha
    const combinedVisits = {};
    visitsResponses.forEach(response => {
      if (response.data.results) {
        response.data.results.forEach(visit => {
          if (!combinedVisits[visit.date]) {
            combinedVisits[visit.date] = 0;
          }
          combinedVisits[visit.date] += visit.total;
        });
      }
    });

    // Convertir a array y ordenar por fecha
    const results = Object.entries(combinedVisits)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ results });
  } catch (error) {
    console.error('Error al obtener visitas totales:', error);
    res.status(500).json({
      error: 'Error al obtener visitas totales',
      details: error.response?.data || error.message
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