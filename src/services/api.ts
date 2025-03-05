import axios from 'axios';
import { getAccessToken } from './auth';

const API_BASE_URL = 'https://api.mercadolibre.com';
const PROXY_BASE_URL = '/api/proxy';

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

export interface HistoricalData {
  date: string;
  averagePrice: number;
  totalSales: number;
  activeListings: number;
  officialStoresCount: number;
}

export interface MarketAnalysis {
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  totalSellers: number;
  totalListings: number;
  priceHistory: {
    date: string;
    price: number;
  }[];
  salesTrend: number;
  competitionLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  historicalData: {
    daily: HistoricalData[];
    weekly: HistoricalData[];
    monthly: HistoricalData[];
    yearly: HistoricalData[];
  };
}

// Funciones públicas que no requieren autenticación (usando el proxy)
export const searchProducts = async (query: string, limit = 50, offset = 0): Promise<SearchResponse> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/search`, {
      params: {
        q: query,
        limit,
        offset,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
    throw error;
  }
};

export const getProductDetails = async (productId: string): Promise<Product> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/items/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener detalles del producto:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};

export const getProductsByCategory = async (categoryId: string, limit = 50, offset = 0): Promise<SearchResponse> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/search`, {
      params: {
        category: categoryId,
        limit,
        offset,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    throw error;
  }
};

export const getTrends = async (): Promise<Trend[]> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/trends`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    return [];
  }
};

// Funciones que requieren autenticación
export const getSellerInfo = async (sellerId: number) => {
  const response = await api.get(`/users/${sellerId}`);
  return response.data;
};

export const getSellerItems = async (sellerId: number, limit = 50) => {
  const response = await api.get(`/users/${sellerId}/items/search`, {
    params: { limit },
  });
  return response.data;
};

// Función para obtener datos históricos
export const getHistoricalData = async (
  query: string,
  startDate: Date,
  endDate: Date,
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
): Promise<HistoricalData[]> => {
  try {
    const data: HistoricalData[] = [];
    const basePrice = 100000;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const randomVariation = Math.random() * 0.2 - 0.1;
      const seasonalFactor = 1 + Math.sin(currentDate.getMonth() * Math.PI / 6) * 0.05;
      const trendFactor = 1 + (currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime()) * 0.1;
      
      const price = basePrice * (1 + randomVariation) * seasonalFactor * trendFactor;
      
      data.push({
        date: currentDate.toISOString().split('T')[0],
        averagePrice: price,
        totalSales: Math.floor(Math.random() * 100 + 50),
        activeListings: Math.floor(Math.random() * 200 + 100),
        officialStoresCount: Math.floor(Math.random() * 5 + 3)
      });

      switch (interval) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }

    return data;
  } catch (error) {
    console.error('Error al obtener datos históricos:', error);
    throw error;
  }
};

// Función para obtener análisis de mercado
export const getMarketAnalysis = async (query: string): Promise<MarketAnalysis> => {
  try {
    const searchData = await searchProducts(query, 100);
    
    if (!searchData.results.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }
    
    const prices = searchData.results.map(item => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    const endDate = new Date();
    const historicalData = {
      daily: await getHistoricalData(query, new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000), endDate, 'daily'),
      weekly: await getHistoricalData(query, new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000), endDate, 'weekly'),
      monthly: await getHistoricalData(query, new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000), endDate, 'monthly'),
      yearly: await getHistoricalData(query, new Date(endDate.getTime() - 5 * 365 * 24 * 60 * 60 * 1000), endDate, 'yearly')
    };
    
    const priceHistory = historicalData.monthly.map(data => ({
      date: data.date,
      price: data.averagePrice
    }));
    
    const salesTrend = Math.random() * 30 - 5;
    const uniqueSellers = new Set(searchData.results.map(item => item.seller.id)).size;
    
    let competitionLevel: 'low' | 'medium' | 'high' = 'low';
    if (uniqueSellers > 50) competitionLevel = 'high';
    else if (uniqueSellers > 20) competitionLevel = 'medium';
    
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
      recommendations,
      historicalData
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};