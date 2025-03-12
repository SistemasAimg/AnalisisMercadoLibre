import axios from 'axios';
import { getAccessToken } from './auth';

// Single axios instance for all API calls through our proxy
const api = axios.create({
  baseURL: '/api/proxy'
});

// Add auth token when available
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export interface FilterOptions {
  minPrice?: number;
  maxPrice?: number;
  condition?: 'all' | 'new' | 'used';
  officialStoresOnly?: boolean;
  minSales?: number;
}

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
  date_created: string;
  last_updated: string;
  seller: {
    id: number;
    nickname: string;
  };
  shipping: {
    free_shipping: boolean;
  };
  official_store_id?: number | null;
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

export interface Category {
  id: string;
  name: string;
}

export interface Trend {
  keyword: string;
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
  filters?: FilterOptions,
  limit = 50,
  offset = 0
): Promise<SearchResponse> => {
  try {
    const response = await api.get('/search', {
      params: {
        q: query,
        limit,
        offset,
        min_price: filters?.minPrice,
        max_price: filters?.maxPrice,
        condition: filters?.condition !== 'all' ? filters?.condition : undefined,
        official_store_only: filters?.officialStoresOnly
      }
    });
    
    // Aplicar filtro de ventas mínimas en el cliente
    if (filters?.minSales && filters.minSales > 0) {
      response.data.results = response.data.results.filter(
        product => product.sold_quantity >= filters.minSales!
      );
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
    throw error;
  }
};

export const getProductVisits = async (
  productName: string,
  officialStoresOnly: boolean = false
): Promise<VisitData[]> => {
  try {
    const response = await api.get('/product-visits', {
      params: {
        q: productName,
        official_store_only: officialStoresOnly
      }
    });
    return response.data.results || [];
  } catch (error) {
    console.error('Error al obtener visitas del producto:', error);
    return [];
  }
};

export const getMarketAnalysis = async (
  product: Product,
  dateRange: { start: Date; end: Date },
  filters?: FilterOptions
): Promise<MarketAnalysis> => {
  try {
    // Buscar productos similares con filtros
    const similarProducts = await searchProducts(product.title, filters);
    
    if (!similarProducts.results.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }

    // Obtener visitas totales del producto
    const visitHistory = await getProductVisits(
      product.title,
      filters?.officialStoresOnly
    );

    // Calcular métricas reales
    const prices = similarProducts.results.map(item => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Calcular tendencias de precios
    const priceTrend = ((product.price - averagePrice) / averagePrice) * 100;

    // Calcular tendencia de ventas basada en datos reales
    const totalSales = similarProducts.results.reduce((sum, item) => sum + item.sold_quantity, 0);
    const avgSales = totalSales / similarProducts.results.length;
    const salesTrend = ((product.sold_quantity - avgSales) / avgSales) * 100;

    // Contar vendedores únicos y tiendas oficiales
    const uniqueSellers = new Set(similarProducts.results.map(item => item.seller.id)).size;
    const officialStores = similarProducts.results.filter(p => p.official_store_id != null).length;
    const officialStorePercentage = Math.round((officialStores / similarProducts.results.length) * 100);

    // Determinar nivel de competencia
    let competitionLevel: 'low' | 'medium' | 'high' = 'low';
    if (uniqueSellers > 50) competitionLevel = 'high';
    else if (uniqueSellers > 20) competitionLevel = 'medium';

    // Calcular distribución de ventas
    const salesRanges = [
      { min: 0, max: 10, count: 0 },
      { min: 11, max: 50, count: 0 },
      { min: 51, max: 100, count: 0 },
      { min: 101, max: Infinity, count: 0 }
    ];

    similarProducts.results.forEach(item => {
      const range = salesRanges.find(r => item.sold_quantity >= r.min && item.sold_quantity <= r.max);
      if (range) range.count++;
    });

    const salesDistribution = salesRanges.map((range, index) => ({
      range: index === salesRanges.length - 1 
        ? `${range.min}+ ventas`
        : `${range.min}-${range.max} ventas`,
      percentage: Math.round((range.count / similarProducts.results.length) * 100)
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
      totalListings: similarProducts.results.length,
      visitHistory,
      salesTrend,
      priceTrend,
      competitionLevel,
      recommendations,
      officialStores,
      officialStorePercentage,
      activeSellers: uniqueSellers,
      newSellers: Math.floor(uniqueSellers * 0.15),
      salesDistribution
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};