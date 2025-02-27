import axios from 'axios';
import { getAccessToken } from './auth';

const API_BASE_URL = 'https://api.mercadolibre.com';

// Crear una instancia de axios con configuración base
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para añadir el token de acceso a las peticiones
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export interface Product {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  thumbnail: string;
  condition: string;
  permalink: string;
  seller: {
    id: number;
    nickname: string;
  };
  shipping: {
    free_shipping: boolean;
  };
}

export interface SearchResponse {
  results: Product[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

export interface Category {
  id: string;
  name: string;
}

export interface Trend {
  keyword: string;
  url: string;
}

export interface SellerInfo {
  id: number;
  nickname: string;
  registration_date: string;
  seller_reputation: {
    level_id: string;
    power_seller_status: string;
    transactions: {
      canceled: number;
      completed: number;
      total: number;
    };
    metrics: {
      sales: {
        period: string;
        completed: number;
      };
      claims: {
        rate: number;
        value: number;
      };
      delayed_handling_time: {
        rate: number;
        value: number;
      };
      cancellations: {
        rate: number;
        value: number;
      };
    };
  };
}

export interface SalesHistory {
  date: string;
  sales: number;
}

export interface PriceHistory {
  date: string;
  price: number;
}

export interface MarketAnalysis {
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  totalSellers: number;
  totalListings: number;
  priceHistory: PriceHistory[];
  salesTrend: number; // porcentaje de crecimiento
  competitionLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// Funciones públicas que no requieren autenticación
export const searchProducts = async (query: string, limit = 20, offset = 0): Promise<SearchResponse> => {
  const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
    params: {
      q: query,
      limit,
      offset,
    },
  });
  return response.data;
};

export const getProductDetails = async (productId: string): Promise<Product> => {
  const response = await axios.get(`${API_BASE_URL}/items/${productId}`);
  return response.data;
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await axios.get(`${API_BASE_URL}/sites/MLA/categories`);
  return response.data;
};

export const getProductsByCategory = async (categoryId: string, limit = 20, offset = 0): Promise<SearchResponse> => {
  const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
    params: {
      category: categoryId,
      limit,
      offset,
    },
  });
  return response.data;
};

export const getTrends = async (): Promise<Trend[]> => {
  const response = await axios.get(`${API_BASE_URL}/trends/MLA`);
  return response.data;
};

// Funciones que requieren autenticación
export const getSellerInfo = async (sellerId: number): Promise<SellerInfo> => {
  const response = await api.get(`/users/${sellerId}`);
  return response.data;
};

export const getSellerItems = async (sellerId: number, limit = 50): Promise<SearchResponse> => {
  const response = await api.get(`/users/${sellerId}/items/search`, {
    params: {
      limit,
    },
  });
  return response.data;
};

// Función para obtener análisis de mercado (simulada)
export const getMarketAnalysis = async (query: string): Promise<MarketAnalysis> => {
  // En una aplicación real, esta función haría múltiples llamadas a la API
  // y procesaría los datos para generar un análisis completo
  
  // Por ahora, simulamos datos para demostración
  const searchData = await searchProducts(query, 100);
  
  if (!searchData.results.length) {
    throw new Error('No hay suficientes datos para realizar un análisis');
  }
  
  const prices = searchData.results.map(item => item.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  
  // Generar historial de precios simulado (últimos 6 meses)
  const priceHistory: PriceHistory[] = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    
    // Variación aleatoria del precio promedio
    const variation = (Math.random() * 0.2) - 0.1; // -10% a +10%
    priceHistory.push({
      date: date.toISOString().split('T')[0],
      price: averagePrice * (1 + variation)
    });
  }
  
  // Calcular tendencia de ventas (crecimiento porcentual)
  const salesTrend = Math.random() * 30 - 5; // -5% a +25%
  
  // Determinar nivel de competencia basado en número de vendedores
  const uniqueSellers = new Set(searchData.results.map(item => item.seller.id)).size;
  let competitionLevel: 'low' | 'medium' | 'high' = 'low';
  if (uniqueSellers > 50) competitionLevel = 'high';
  else if (uniqueSellers > 20) competitionLevel = 'medium';
  
  // Generar recomendaciones basadas en el análisis
  const recommendations = [];
  if (salesTrend > 10) {
    recommendations.push('El mercado está en crecimiento, es un buen momento para invertir en inventario.');
  } else if (salesTrend < 0) {
    recommendations.push('Las ventas están disminuyendo, considera reducir precios o diversificar.');
  }
  
  if (competitionLevel === 'high') {
    recommendations.push('Alta competencia detectada, enfócate en diferenciación y servicio al cliente.');
  } else if (competitionLevel === 'low') {
    recommendations.push('Baja competencia, oportunidad para establecer presencia dominante en el mercado.');
  }
  
  return {
    averagePrice,
    priceRange: {
      min: minPrice,
      max: maxPrice
    },
    totalSellers: uniqueSellers,
    totalListings: searchData.paging.total,
    priceHistory,
    salesTrend,
    competitionLevel,
    recommendations
  };
};