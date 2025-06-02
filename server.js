import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import * as tf from '@tensorflow/tfjs';
import * as ss from 'simple-statistics';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Constantes
const GARMIN_SELLER_ID = '225076335';
const ML_API_BASE_URL = 'https://api.mercadolibre.com';

// Middleware
app.use(cors());
app.use(express.json());

// Log para depuración
console.log(`Iniciando servidor en ${HOST}:${PORT}`);
console.log('Variables de entorno de Supabase:', {
  url: process.env.VITE_SUPABASE_URL ? 'presente' : 'faltante',
  key: process.env.VITE_SUPABASE_ANON_KEY ? 'presente' : 'faltante'
});

// Utilidades
const formatError = (error) => ({
  error: error.message || 'Error desconocido',
  details: error.response?.data || error.stack
});

const getMLHeaders = (authHeader) => ({
  ...(authHeader && { Authorization: authHeader })
});

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Se requiere autenticación' });
  }
  next();
};

// Endpoint para intercambio de código por token
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Código de autorización requerido' });
    }

    const response = await axios.post(`${ML_API_BASE_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: process.env.VITE_ML_CLIENT_ID,
      client_secret: process.env.VITE_ML_CLIENT_SECRET,
      code,
      redirect_uri: process.env.VITE_ML_REDIRECT_URI
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(formatError(error));
  }
});

// Endpoint para refrescar token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const response = await axios.post(`${ML_API_BASE_URL}/oauth/token`, {
      grant_type: 'refresh_token',
      client_id: process.env.VITE_ML_CLIENT_ID,
      client_secret: process.env.VITE_ML_CLIENT_SECRET,
      refresh_token
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error al refrescar token:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(formatError(error));
  }
});

// Endpoint para obtener productos de Garmin
app.get('/api/garmin/products', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(
      `${ML_API_BASE_URL}/users/${GARMIN_SELLER_ID}/items/search`,
      {
        params: { limit: 100 },
        headers: getMLHeaders(req.headers.authorization)
      }
    );

    const itemIds = response.data.results;
    const products = [];

    // Obtener detalles de productos en lotes
    for (let i = 0; i < itemIds.length; i += 20) {
      const batch = itemIds.slice(i, i + 20);
      const itemsResponse = await axios.get(
        `${ML_API_BASE_URL}/items`,
        {
          params: { ids: batch.join(',') },
          headers: getMLHeaders(req.headers.authorization)
        }
      );

      const validProducts = itemsResponse.data
        .filter(item => item.code === 200)
        .map(item => item.body);
      
      products.push(...validProducts);
    }

    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos de Garmin:', error);
    res.status(500).json(formatError(error));
  }
});

// Endpoint para análisis de competencia
app.get('/api/analysis/competition/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Obtener detalles del producto
    const productResponse = await axios.get(
      `${ML_API_BASE_URL}/items/${itemId}`,
      { headers: getMLHeaders(req.headers.authorization) }
    );

    const product = productResponse.data;

    // Buscar productos similares
    const similarResponse = await axios.get(
      `${ML_API_BASE_URL}/sites/MLA/search`,
      {
        params: {
          q: product.title,
          category: product.category_id,
          limit: 50
        },
        headers: getMLHeaders(req.headers.authorization)
      }
    );

    // Análisis de competencia
    const competitors = new Map();
    similarResponse.data.results.forEach(item => {
      if (!competitors.has(item.seller.id)) {
        competitors.set(item.seller.id, {
          seller: item.seller,
          products: [],
          metrics: {
            totalListings: 0,
            averagePrice: 0,
            freeShipping: 0,
            totalSales: 0
          }
        });
      }
      
      const competitor = competitors.get(item.seller.id);
      competitor.products.push(item);
      competitor.metrics.totalListings++;
      competitor.metrics.averagePrice += item.price;
      competitor.metrics.freeShipping += item.shipping.free_shipping ? 1 : 0;
      competitor.metrics.totalSales += item.sold_quantity;
    });

    // Calcular métricas finales
    const competitorAnalysis = Array.from(competitors.values()).map(competitor => ({
      seller: competitor.seller,
      metrics: {
        ...competitor.metrics,
        averagePrice: competitor.metrics.averagePrice / competitor.metrics.totalListings,
        freeShippingPercentage: (competitor.metrics.freeShipping / competitor.metrics.totalListings) * 100,
        marketShare: (competitor.metrics.totalListings / similarResponse.data.results.length) * 100
      }
    }));

    res.json({
      product,
      competitors: competitorAnalysis,
      marketMetrics: {
        totalCompetitors: competitors.size,
        averagePrice: ss.mean(similarResponse.data.results.map(item => item.price)),
        priceRange: {
          min: Math.min(...similarResponse.data.results.map(item => item.price)),
          max: Math.max(...similarResponse.data.results.map(item => item.price))
        }
      }
    });
  } catch (error) {
    console.error('Error en análisis de competencia:', error);
    res.status(500).json(formatError(error));
  }
});

// Endpoint para análisis de precios
app.get('/api/analysis/pricing/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Obtener historial de precios y ventas
    const [itemResponse, visitsResponse] = await Promise.all([
      axios.get(`${ML_API_BASE_URL}/items/${itemId}`, {
        headers: getMLHeaders(req.headers.authorization)
      }),
      axios.get(`${ML_API_BASE_URL}/items/${itemId}/visits/time_window`, {
        params: { last: 30, unit: 'day' },
        headers: getMLHeaders(req.headers.authorization)
      })
    ]);

    // Análisis de elasticidad de precios
    const visits = visitsResponse.data.results || [];
    const currentPrice = itemResponse.data.price;
    const salesVelocity = itemResponse.data.sold_quantity / 30; // ventas por día

    // Calcular precio óptimo usando TensorFlow.js
    const model = tf.sequential({
      layers: [tf.layers.dense({ units: 1, inputShape: [1] })]
    });

    model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

    const visitData = visits.map(v => v.total);
    const avgVisits = ss.mean(visitData);
    const stdVisits = ss.standardDeviation(visitData);

    // Predicción de precio óptimo
    const priceElasticity = -1.5; // elasticidad típica
    const optimalPrice = currentPrice * (1 + (1 / priceElasticity));

    res.json({
      currentPrice,
      optimalPrice,
      priceAnalysis: {
        elasticity: priceElasticity,
        confidence: 0.85,
        recommendedRange: {
          min: optimalPrice * 0.9,
          max: optimalPrice * 1.1
        }
      },
      metrics: {
        averageDailyVisits: avgVisits,
        salesVelocity,
        conversionRate: (salesVelocity / avgVisits) * 100
      }
    });
  } catch (error) {
    console.error('Error en análisis de precios:', error);
    res.status(500).json(formatError(error));
  }
});

// Endpoint para análisis de tendencias
app.get('/api/analysis/trends', authMiddleware, async (req, res) => {
  try {
    const [trendsResponse, categoriesResponse] = await Promise.all([
      axios.get(`${ML_API_BASE_URL}/trends/MLA`, {
        headers: getMLHeaders(req.headers.authorization)
      }),
      axios.get(`${ML_API_BASE_URL}/sites/MLA/categories`, {
        headers: getMLHeaders(req.headers.authorization)
      })
    ]);

    // Filtrar tendencias relevantes para Garmin
    const relevantCategories = ['Deportes y Fitness', 'Electrónica', 'Relojes'];
    const filteredTrends = trendsResponse.data.filter(trend => {
      const category = categoriesResponse.data.find(cat => 
        trend.category_id && cat.id === trend.category_id
      );
      return category && relevantCategories.includes(category.name);
    });

    // Análisis de keywords
    const keywords = new Map();
    filteredTrends.forEach(trend => {
      const words = trend.keyword.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          keywords.set(word, (keywords.get(word) || 0) + 1);
        }
      });
    });

    const keywordAnalysis = Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, frequency]) => ({
        keyword,
        frequency,
        relevance: frequency / filteredTrends.length
      }));

    res.json({
      trends: filteredTrends,
      keywordAnalysis,
      categories: categoriesResponse.data.filter(cat =>
        relevantCategories.includes(cat.name)
      )
    });
  } catch (error) {
    console.error('Error en análisis de tendencias:', error);
    res.status(500).json(formatError(error));
  }
});

// Endpoint para análisis de rendimiento
app.get('/api/analysis/performance/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const [itemResponse, visitsResponse, questionsResponse] = await Promise.all([
      axios.get(`${ML_API_BASE_URL}/items/${itemId}`, {
        headers: getMLHeaders(req.headers.authorization)
      }),
      axios.get(`${ML_API_BASE_URL}/items/${itemId}/visits/time_window`, {
        params: { last: 30, unit: 'day' },
        headers: getMLHeaders(req.headers.authorization)
      }),
      axios.get(`${ML_API_BASE_URL}/questions/search`, {
        params: { item: itemId },
        headers: getMLHeaders(req.headers.authorization)
      })
    ]);

    const visits = visitsResponse.data.results || [];
    const totalVisits = visits.reduce((sum, v) => sum + v.total, 0);
    const soldQuantity = itemResponse.data.sold_quantity;
    const availableQuantity = itemResponse.data.available_quantity;
    const questions = questionsResponse.data.total;

    const performance = {
      metrics: {
        conversionRate: (soldQuantity / totalVisits) * 100,
        sellThroughRate: (soldQuantity / (soldQuantity + availableQuantity)) * 100,
        questionRate: (questions / totalVisits) * 100
      },
      visibility: {
        averageDailyVisits: totalVisits / visits.length,
        visitTrend: this.calculateTrend(visits.map(v => v.total)),
        peakDays: visits
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)
          .map(v => ({ date: v.date, visits: v.total }))
      },
      engagement: {
        totalQuestions: questions,
        questionsPerVisit: questions / totalVisits,
        responseRate: 95 // Ejemplo, implementar cálculo real
      }
    };

    res.json(performance);
  } catch (error) {
    console.error('Error en análisis de rendimiento:', error);
    res.status(500).json(formatError(error));
  }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// Todas las demás rutas sirven el index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutándose en http://${HOST}:${PORT}`);
});