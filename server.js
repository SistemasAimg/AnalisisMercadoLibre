import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // Para usar las variables de entorno .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Ajusta a tu país, por defecto MLA (Argentina)
const SITE_ID = process.env.SITE_ID || 'MLA';

// Opcional: si necesitas un token de aplicación/usuario para endpoints que lo requieran
// Si no es necesario, puedes omitirlo
const ML_TOKEN = process.env.MELI_TOKEN || '';

// Middleware para parsear JSON y habilitar CORS si fuera preciso
app.use(express.json());
app.use(cors());

// Log para depuración
console.log(`Iniciando servidor en ${HOST}:${PORT}`);

// ======================== AUTENTICACIÓN OAUTH ========================
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

// ======================== ENDPOINTS "PROXY" INICIALES ========================

// Proxy para la API de MercadoLibre – Tendencias
app.get('/api/proxy/trends', async (req, res) => {
  try {
    console.log('Solicitando tendencias a MercadoLibre');
    const response = await axios.get(`https://api.mercadolibre.com/trends/${SITE_ID}`);
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
    const response = await axios.get(`https://api.mercadolibre.com/sites/${SITE_ID}/categories`);
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener categorías:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Error al obtener categorías',
      details: error.response?.data || error.message
    });
  }
});

// Proxy para búsqueda de productos (puedes seguir usando q y category)
app.get('/api/proxy/search', async (req, res) => {
  try {
    const { q, category, limit = 50, offset = 0 } = req.query;

    // Validar parámetros
    if (!q && !category) {
      return res.status(400).json({
        error: 'Se requiere un término de búsqueda (q) o una categoría'
      });
    }

    // Construir URL base
    const baseUrl = `https://api.mercadolibre.com/sites/${SITE_ID}/search`;

    // Construir parámetros
    const params = new URLSearchParams();
    if (q) params.append('q', String(q));
    if (category) params.append('category', String(category));

    // Asegurarse de que limit y offset sean números válidos
    const limitNum = Math.min(50, Math.max(1, parseInt(limit.toString()) || 50));
    const offsetNum = Math.max(0, parseInt(offset.toString()) || 0);

    params.append('limit', limitNum.toString());
    params.append('offset', offsetNum.toString());

    // Realizar la búsqueda
    const response = await axios.get(`${baseUrl}?${params.toString()}`);

    // Procesar y enviar respuesta
    // Se devuelven los items y paginación cruda (como antes)
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

// Endpoint para webhooks de MercadoLibre (si lo usas)
app.post('/api/webhooks/mercadolibre', (req, res) => {
  console.log('Webhook recibido:', req.body);
  return res.status(200).json({ status: 'ok' });
});

// ======================== NUEVO ENDPOINT PARA OBTENER DATOS DE VISITAS ========================
// Ejemplo: GET /api/items/:id/visits?start=YYYY-MM-DD&end=YYYY-MM-DD
app.get('/api/items/:id/visits', async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Faltan parámetros ?start= &end=' });
    }

    // Calcular rango de días
    const startDate = new Date(String(start));
    const endDate = new Date(String(end));
    let diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) diffDays = 1;
    if (diffDays > 150) diffDays = 150; // Límite de la API de MercadoLibre

    // Endpoint oficial: GET /items/{itemId}/visits/time_window
    const url = `https://api.mercadolibre.com/items/${id}/visits/time_window?last=${diffDays}&unit=day&ending=${end}&site_id=${SITE_ID}`;

    const response = await axios.get(url, {
      headers: {
        // Si tu app requiere token, inclúyelo aquí:
        Authorization: ML_TOKEN ? `Bearer ${ML_TOKEN}` : undefined
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener visitas del producto:', error.message);
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Error al obtener visitas del producto',
        details: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Error al obtener visitas del producto',
        message: error.message
      });
    }
  }
});

// ======================== PRODUCCIÓN: Servir archivos estáticos ========================
app.use(express.static(path.join(__dirname, 'dist')));

// Redirección al index.html para las rutas del lado del cliente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutándose en http://${HOST}:${PORT}`);
});
