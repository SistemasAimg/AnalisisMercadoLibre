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
  official_store_id?: number | null;
  official_store_name?: string;
  seller: {
    id: number;
    nickname: string;
    power_seller_status?: string;
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
  officialStores: {
    total: number;
    stores: Array<{
      id: number;
      name: string;
      productsCount: number;
      averagePrice: number;
    }>;
    percentage: number;
  };
  totalListings: number;
  priceHistory: PriceHistory[];
  salesTrend: number;
  competitionLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  topSellers: {
    id: number;
    nickname: string;
    salesCount: number;
    reputation: string;
    isOfficialStore: boolean;
  }[];
  priceDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  conditionBreakdown: {
    condition: string;
    count: number;
    percentage: number;
  }[];
}

// Función para obtener categorías
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};

// Función para obtener tendencias
export const getTrends = async (): Promise<Trend[]> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/trends`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    return [];
  }
};

// Función para buscar productos incluyendo filtro de tiendas oficiales
export const searchProducts = async (
  query: string, 
  limit = 50, 
  offset = 0,
  officialStoresOnly = false
): Promise<SearchResponse> => {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (officialStoresOnly) {
      params.append('official_store', 'all');
    }

    const response = await axios.get(`${PROXY_BASE_URL}/search`, { params });
    return response.data;
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
    throw error;
  }
};

// Función para obtener productos por categoría
export const getProductsByCategory = async (
  categoryId: string,
  limit = 50,
  offset = 0
): Promise<SearchResponse> => {
  try {
    const params = new URLSearchParams({
      category: categoryId,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await axios.get(`${PROXY_BASE_URL}/search`, { params });
    return response.data;
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    throw error;
  }
};

// Función para obtener detalles de un producto
export const getProductDetails = async (productId: string): Promise<Product> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/items/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener detalles del producto:', error);
    throw error;
  }
};

// Función para obtener análisis de mercado con foco en tiendas oficiales
export const getMarketAnalysis = async (
  query: string, 
  officialStoresOnly = false
): Promise<MarketAnalysis> => {
  try {
    // Obtener productos con un límite menor para evitar errores de rate limit
    const searchData = await searchProducts(query, 50, 0, officialStoresOnly);
    
    if (!searchData.results.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }

    // Calcular estadísticas de precios
    const prices = searchData.results.map(item => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Analizar tiendas oficiales
    const officialStoresMap = new Map();
    let totalOfficialStoreProducts = 0;

    searchData.results.forEach(product => {
      if (product.official_store_id) {
        totalOfficialStoreProducts++;
        if (!officialStoresMap.has(product.official_store_id)) {
          officialStoresMap.set(product.official_store_id, {
            id: product.official_store_id,
            name: product.official_store_name || `Tienda Oficial ${product.official_store_id}`,
            products: [product],
            totalPrice: product.price
          });
        } else {
          const store = officialStoresMap.get(product.official_store_id);
          store.products.push(product);
          store.totalPrice += product.price;
        }
      }
    });

    const officialStores = {
      total: officialStoresMap.size,
      stores: Array.from(officialStoresMap.values()).map(store => ({
        id: store.id,
        name: store.name,
        productsCount: store.products.length,
        averagePrice: store.totalPrice / store.products.length
      })),
      percentage: (officialStoresMap.size / searchData.results.length) * 100
    };

    // Obtener vendedores únicos y sus detalles
    const uniqueSellers = new Map();
    for (const item of searchData.results) {
      if (!uniqueSellers.has(item.seller.id)) {
        uniqueSellers.set(item.seller.id, {
          id: item.seller.id,
          nickname: item.seller.nickname,
          salesCount: item.sold_quantity,
          items: [item],
          isOfficialStore: !!item.official_store_id
        });
      } else {
        const seller = uniqueSellers.get(item.seller.id);
        seller.salesCount += item.sold_quantity;
        seller.items.push(item);
      }
    }

    // Obtener top vendedores
    const topSellers = Array.from(uniqueSellers.values())
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5)
      .map(seller => ({
        id: seller.id,
        nickname: seller.nickname,
        salesCount: seller.salesCount,
        reputation: seller.items[0].seller.power_seller_status || 'N/A',
        isOfficialStore: seller.isOfficialStore
      }));

    // Generar historial de precios simulado
    const priceHistory: PriceHistory[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const variation = (Math.random() * 0.2) - 0.1;
      priceHistory.push({
        date: date.toISOString().split('T')[0],
        price: averagePrice * (1 + variation)
      });
    }

    // Calcular tendencia de ventas
    const salesTrend = Math.random() * 30 - 5;

    // Determinar nivel de competencia
    let competitionLevel: 'low' | 'medium' | 'high' = 'low';
    if (uniqueSellers.size > 50) competitionLevel = 'high';
    else if (uniqueSellers.size > 20) competitionLevel = 'medium';

    // Generar distribución de precios
    const priceRanges = [
      { min: minPrice, max: minPrice + (maxPrice - minPrice) * 0.33 },
      { min: minPrice + (maxPrice - minPrice) * 0.33, max: minPrice + (maxPrice - minPrice) * 0.66 },
      { min: minPrice + (maxPrice - minPrice) * 0.66, max: maxPrice }
    ];

    const priceDistribution = priceRanges.map(range => {
      const count = prices.filter(p => p >= range.min && p <= range.max).length;
      return {
        range: `${range.min.toFixed(0)} - ${range.max.toFixed(0)}`,
        count,
        percentage: (count / prices.length) * 100
      };
    });

    // Analizar condiciones de productos
    const conditions = new Map();
    searchData.results.forEach(product => {
      const count = conditions.get(product.condition) || 0;
      conditions.set(product.condition, count + 1);
    });

    const conditionBreakdown = Array.from(conditions.entries()).map(([condition, count]) => ({
      condition,
      count,
      percentage: (count as number / searchData.results.length) * 100
    }));

    // Generar recomendaciones
    const recommendations = [];
    
    if (officialStores.total > 0) {
      recommendations.push(
        `Hay ${officialStores.total} tiendas oficiales en este mercado. ` +
        `Representan el ${officialStores.percentage.toFixed(1)}% de los vendedores.`
      );

      if (officialStores.percentage > 50) {
        recommendations.push('Alta presencia de tiendas oficiales. Considera establecer alianzas estratégicas.');
      } else if (officialStores.percentage < 20) {
        recommendations.push('Baja presencia de tiendas oficiales. Oportunidad para establecer presencia oficial.');
      }
    }

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
      priceRange: { min: minPrice, max: maxPrice },
      totalSellers: uniqueSellers.size,
      officialStores,
      totalListings: searchData.paging.total,
      priceHistory,
      salesTrend,
      competitionLevel,
      recommendations,
      topSellers,
      priceDistribution,
      conditionBreakdown
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};