import axios from 'axios';
import { getAccessToken } from './auth';

// Create an axios instance for MercadoLibre API
const mercadoLibreApi = axios.create({
  baseURL: 'https://api.mercadolibre.com',
});

// Create an axios instance for our backend proxy
const proxyApi = axios.create({
  baseURL: '/api/proxy',
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

export interface Category {
  id: string;
  name: string;
}

export interface Trend {
  keyword: string;
}

export const searchProducts = async (
  query: string,
  limit = 50,
  offset = 0
): Promise<SearchResponse> => {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await mercadoLibreApi.get('/sites/MLA/search', {
      params: {
        q: query,
        limit,
        offset
      },
      headers
    });

    return {
      results: response.data.results,
      paging: response.data.paging
    };
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
    throw error;
  }
};

export const getProductDetails = async (productId: string): Promise<Product> => {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await mercadoLibreApi.get(`/items/${productId}`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error al obtener detalles del producto:', error);
    throw error;
  }
};

export const getItemVisits = async (itemId: string): Promise<VisitData[]> => {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await mercadoLibreApi.get(`/items/${itemId}/visits/time_window`, {
      params: {
        last: 30,
        unit: 'day'
      },
      headers
    });
    return response.data.results || [];
  } catch (error) {
    console.error('Error al obtener historial de visitas:', error);
    return [];
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await mercadoLibreApi.get('/sites/MLA/categories', { headers });
    return response.data;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};

export const getTrends = async (): Promise<Trend[]> => {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await mercadoLibreApi.get('/trends/MLA', { headers });
    return response.data;
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    throw error;
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