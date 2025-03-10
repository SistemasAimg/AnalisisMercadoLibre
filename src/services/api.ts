import axios from 'axios';
import { getAccessToken, refreshAccessToken } from './auth';

const API_BASE_URL = 'https://api.mercadolibre.com';
const PROXY_BASE_URL = '/api/proxy';

// Crear una instancia de axios con configuración base
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para añadir el token de acceso a las peticiones
api.interceptors.request.use(async (config) => {
  try {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token añadido a la petición:', token.substring(0, 10) + '...');
    } else {
      console.warn('No se encontró token de acceso');
    }
  } catch (error) {
    console.error('Error al obtener el token:', error);
  }
  return config;
}, (error) => {
  console.error('Error en el interceptor de request:', error);
  return Promise.reject(error);
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('Error de autenticación detectado, intentando refrescar token...');
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Reintentar la petición original con el nuevo token
          const config = error.config;
          config.headers.Authorization = `Bearer ${newToken.access_token}`;
          return api(config);
        } else {
          console.error('No se pudo refrescar el token');
          // Redirigir al login si no se puede refrescar el token
          window.location.href = '/auth/login';
        }
      } catch (refreshError) {
        console.error('Error al refrescar el token:', refreshError);
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

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

export interface VisitData {
  date: string;
  total: number;
}

export interface MarketAnalysis {
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  totalSellers: number;
  totalListings: number;
  visitHistory: VisitData[];
  salesTrend: number;
  priceTrend: number;
  competitionLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  officialStores: number;
  officialStorePercentage: number;
  activeSellers: number;
  newSellers: number;
  salesDistribution: Array<{
    range: string;
    percentage: number;
  }>;
}

export const searchProducts = async (
  query: string,
  limit = 50,
  offset = 0
): Promise<SearchResponse> => {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString()
    });

    const response = await api.get(`${PROXY_BASE_URL}/search?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
    throw error;
  }
};

export const getProductDetails = async (productId: string): Promise<Product> => {
  try {
    const response = await api.get(`${PROXY_BASE_URL}/items/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener detalles del producto:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get(`${PROXY_BASE_URL}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};

export const getTrends = async (): Promise<Trend[]> => {
  try {
    const response = await api.get(`${PROXY_BASE_URL}/trends`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    return [];
  }
};

export const getSellerInfo = async (sellerId: number): Promise<SellerInfo> => {
  const response = await api.get(`/users/${sellerId}`);
  return response.data;
};

export const getItemVisits = async (itemId: string): Promise<VisitData[]> => {
  try {
    const response = await api.get(`${PROXY_BASE_URL}/items/${itemId}/visits`, {
      params: {
        last: 30,
        unit: 'day'
      }
    });
    return response.data.results || [];
  } catch (error) {
    console.error('Error al obtener historial de visitas:', error);
    return [];
  }
};

export const getMarketAnalysis = async (
  product: Product,
  dateRange: { start: Date; end: Date },
  officialStoresOnly: boolean = false
): Promise<MarketAnalysis> => {
  try {
    // Buscar productos similares
    const similarProducts = await searchProducts(product.title, 50);
    
    if (!similarProducts.results.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }

    // Filtrar productos por tiendas oficiales si es necesario
    let productsToAnalyze = similarProducts.results;
    if (officialStoresOnly) {
      productsToAnalyze = productsToAnalyze.filter(p => p.seller.id.toString().startsWith('999'));
    }

    // Obtener visitas del producto
    const visitHistory = await getItemVisits(product.id);

    // Calcular métricas reales
    const prices = productsToAnalyze.map(item => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Calcular tendencias de precios
    const priceTrend = ((product.price - averagePrice) / averagePrice) * 100;

    // Calcular tendencia de ventas basada en datos reales
    const totalSales = productsToAnalyze.reduce((sum, item) => sum + item.sold_quantity, 0);
    const avgSales = totalSales / productsToAnalyze.length;
    const salesTrend = ((product.sold_quantity - avgSales) / avgSales) * 100;

    // Contar vendedores únicos
    const uniqueSellers = new Set(productsToAnalyze.map(item => item.seller.id)).size;
    const officialStores = productsToAnalyze.filter(p => p.seller.id.toString().startsWith('999')).length;
    const officialStorePercentage = Math.round((officialStores / productsToAnalyze.length) * 100);

    // Determinar nivel de competencia basado en datos reales
    let competitionLevel: 'low' | 'medium' | 'high' = 'low';
    if (uniqueSellers > 50) competitionLevel = 'high';
    else if (uniqueSellers > 20) competitionLevel = 'medium';

    // Calcular distribución de ventas real
    const salesRanges = [
      { min: 0, max: 10, count: 0 },
      { min: 11, max: 50, count: 0 },
      { min: 51, max: 100, count: 0 },
      { min: 101, max: Infinity, count: 0 }
    ];

    productsToAnalyze.forEach(item => {
      const range = salesRanges.find(r => item.sold_quantity >= r.min && item.sold_quantity <= r.max);
      if (range) range.count++;
    });

    const salesDistribution = salesRanges.map((range, index) => ({
      range: index === salesRanges.length - 1 
        ? `${range.min}+ ventas`
        : `${range.min}-${range.max} ventas`,
      percentage: Math.round((range.count / productsToAnalyze.length) * 100)
    }));

    // Generar recomendaciones basadas en datos reales
    const recommendations = [];
    
    if (priceTrend > 10) {
      recommendations.push('Tu precio está por encima del promedio del mercado. Considera ajustarlo para mejorar la competitividad.');
    } else if (priceTrend < -10) {
      recommendations.push('Tu precio está por debajo del promedio. Podrías aumentarlo sin perder competitividad.');
    }

    if (officialStorePercentage > 70) {
      recommendations.push('Alta presencia de tiendas oficiales. Destaca tu valor agregado y servicio al cliente.');
    }

    if (competitionLevel === 'high') {
      recommendations.push('Mercado muy competitivo. Enfócate en diferenciación y servicio post-venta.');
    } else if (competitionLevel === 'low') {
      recommendations.push('Baja competencia. Oportunidad para establecer presencia dominante.');
    }

    if (visitHistory.length > 0) {
      const lastVisits = visitHistory[visitHistory.length - 1].total;
      const firstVisits = visitHistory[0].total;
      if (lastVisits > firstVisits) {
        recommendations.push('Las visitas están aumentando. Buen momento para optimizar la conversión.');
      } else if (lastVisits < firstVisits) {
        recommendations.push('Las visitas están disminuyendo. Considera mejorar la visibilidad del producto.');
      }
    }

    return {
      averagePrice,
      priceRange: { min: minPrice, max: maxPrice },
      totalSellers: uniqueSellers,
      totalListings: productsToAnalyze.length,
      visitHistory,
      salesTrend,
      priceTrend,
      competitionLevel,
      recommendations,
      officialStores,
      officialStorePercentage,
      activeSellers: uniqueSellers,
      newSellers: Math.floor(uniqueSellers * 0.15), // Estimado basado en vendedores activos
      salesDistribution
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};