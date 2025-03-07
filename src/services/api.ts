import axios from 'axios';
import { getAccessToken } from './auth';

const PROXY_BASE_URL = '/api/proxy';

const api = axios.create({
  baseURL: PROXY_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Interceptor para agregar el token de autorización
api.interceptors.request.use(async (config) => {
  try {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error al obtener token:', error);
    return Promise.reject(error);
  }
});

export default api;

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
    power_seller_status?: string;
  };
  seller_address?: {
    state?: {
      name: string;
    };
  };
  official_store_id?: number;
  official_store_name?: string;
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
  itemsCount?: number;
  averagePrice?: number;
}

export interface PriceHistory {
  date: string;
  price: number;
}

export interface MarketAnalysis {
  // Métricas básicas (reales)
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  totalSellers: number;
  totalListings: number;
  
  // Métricas de tiendas oficiales (reales)
  officialStores: {
    total: number;
    stores: Array<{
      id: number;
      name: string;
      productsCount: number;
      averagePrice: number;
      reputation: string;
      level: string;
    }>;
    percentage: number;
  };

  // Historial de precios (real)
  priceHistory: Array<{
    date: string;
    price: number;
    currency_id: string;
  }>;

  // Métricas de visitas (real)
  visits: {
    total: number;
    daily: number;
    weekly: number;
    monthly: number;
  };

  // Análisis de vendedores (real)
  topSellers: Array<{
    id: number;
    nickname: string;
    salesCount: number;
    reputation: string;
    level: string;
    isOfficialStore: boolean;
    location: {
      city: string;
      state: string;
    };
    registrationDate: string;
    sellerReputation: {
      level_id: string;
      power_seller_status: string;
      transactions: {
        completed: number;
        canceled: number;
        period: string;
        ratings: {
          positive: number;
          negative: number;
          neutral: number;
        };
      };
    };
  }>;

  // Distribución de precios (real)
  priceDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;

  // Condiciones de productos (real)
  conditionBreakdown: Array<{
    condition: string;
    count: number;
    percentage: number;
  }>;

  // Métricas de mercado (real)
  marketMetrics: {
    totalVisits: number;
    averageVisitsPerProduct: number;
    topCategories: Array<{
      id: string;
      name: string;
      itemsCount: number;
      averagePrice: number;
    }>;
    topProvinces: Array<{
      id: string;
      name: string;
      itemsCount: number;
      averagePrice: number;
    }>;
  };

  // Tendencias (real)
  trends: Array<{
    keyword: string;
    url: string;
    itemsCount?: number;
    averagePrice?: number;
  }>;
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
    // Obtener resultados de búsqueda
    const searchResults = await searchProducts(query, 50, 0, officialStoresOnly);
    
    if (!searchResults.results.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }

    // Obtener tendencias
    const trends = await getTrends();

    // Obtener información de vendedores únicos
    const uniqueSellers = new Set(searchResults.results.map(item => item.seller.id));
    const sellersInfo = await Promise.all(
      Array.from(uniqueSellers).map(id => getUserInfo(id.toString()))
    );

    // Obtener visitas y precios para los primeros 10 productos
    const topProducts = searchResults.results.slice(0, 10);
    const [visits, priceHistory] = await Promise.all([
      Promise.all(topProducts.map(item => getItemVisits(item.id))),
      Promise.all(topProducts.map(item => getItemPriceHistory(item.id)))
    ]);

    // Calcular métricas
    const prices = searchResults.results.map(item => item.price);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Calcular distribución de precios
    const priceRanges = [
      { min: 0, max: averagePrice * 0.5, label: '0-50%' },
      { min: averagePrice * 0.5, max: averagePrice, label: '50-100%' },
      { min: averagePrice, max: averagePrice * 1.5, label: '100-150%' },
      { min: averagePrice * 1.5, max: Infinity, label: '150%+' }
    ];

    const priceDistribution = priceRanges.map(range => ({
      range: range.label,
      count: prices.filter(p => p >= range.min && p < range.max).length,
      percentage: (prices.filter(p => p >= range.min && p < range.max).length / prices.length) * 100
    }));

    // Calcular métricas de visitas
    const totalVisits = visits.reduce((sum, visit) => sum + visit.total, 0);
    const averageVisitsPerProduct = totalVisits / visits.length;

    // Calcular métricas por provincia
    const provinces = new Map<string, { count: number; totalPrice: number }>();
    searchResults.results.forEach(item => {
      const province = item.seller_address?.state?.name || 'Sin ubicación';
      const current = provinces.get(province) || { count: 0, totalPrice: 0 };
      provinces.set(province, {
        count: current.count + 1,
        totalPrice: current.totalPrice + item.price
      });
    });

    const topProvinces = Array.from(provinces.entries())
      .map(([name, data]) => ({
        id: name,
        name,
        itemsCount: data.count,
        averagePrice: data.totalPrice / data.count
      }))
      .sort((a, b) => b.itemsCount - a.itemsCount)
      .slice(0, 5);

    // Calcular métricas de tiendas oficiales
    const officialStores = searchResults.results.filter(item => item.official_store_id);
    const officialStoresInfo = await Promise.all(
      officialStores.map(item => getUserInfo(item.seller.id.toString()))
    );

    return {
      averagePrice,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      totalSellers: uniqueSellers.size,
      totalListings: searchResults.paging.total,
      officialStores: {
        total: officialStores.length,
        stores: officialStoresInfo.map(store => ({
          id: store.id,
          name: store.nickname,
          productsCount: searchResults.results.filter(item => item.seller.id === store.id).length,
          averagePrice: searchResults.results
            .filter(item => item.seller.id === store.id)
            .reduce((sum, item) => sum + item.price, 0) / 
            searchResults.results.filter(item => item.seller.id === store.id).length,
          reputation: store.seller_reputation.level_id,
          level: store.seller_reputation.power_seller_status
        })),
        percentage: (officialStores.length / searchResults.results.length) * 100
      },
      priceHistory: priceHistory.flat(),
      visits: {
        total: totalVisits,
        daily: visits.reduce((sum, visit) => sum + visit.daily, 0),
        weekly: visits.reduce((sum, visit) => sum + visit.weekly, 0),
        monthly: visits.reduce((sum, visit) => sum + visit.monthly, 0)
      },
      topSellers: sellersInfo.map(seller => ({
        id: seller.id,
        nickname: seller.nickname,
        salesCount: seller.seller_reputation.transactions.completed,
        reputation: seller.seller_reputation.level_id,
        level: seller.seller_reputation.power_seller_status,
        isOfficialStore: seller.user_type === 'brand',
        location: seller.address,
        registrationDate: seller.registration_date,
        sellerReputation: seller.seller_reputation
      })),
      priceDistribution,
      conditionBreakdown: Object.entries(
        searchResults.results.reduce((acc, item) => {
          acc[item.condition] = (acc[item.condition] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([condition, count]) => ({
        condition,
        count,
        percentage: (count / searchResults.results.length) * 100
      })),
      marketMetrics: {
        totalVisits,
        averageVisitsPerProduct,
        topCategories: [], // Se puede implementar con domain_discovery
        topProvinces
      },
      trends
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};

// Obtener historial de precios de un producto
export const getItemPriceHistory = async (itemId: string): Promise<Array<{
  date: string;
  price: number;
  currency_id: string;
}>> => {
  const response = await api.get(`${PROXY_BASE_URL}/items/${itemId}/price_history`);
  return response.data;
};

// Obtener visitas de un producto
export const getItemVisits = async (itemId: string): Promise<{
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
}> => {
  const response = await api.get(`${PROXY_BASE_URL}/items/${itemId}/visits`);
  return response.data;
};

// Obtener información detallada de un vendedor
export const getUserInfo = async (userId: string): Promise<{
  id: number;
  nickname: string;
  registration_date: string;
  country_id: string;
  address: {
    city: string;
    state: string;
  };
  user_type: string;
  tags: string[];
  logo: string | null;
  points: number;
  site_id: string;
  permalink: string;
  seller_reputation: {
    level_id: string;
    power_seller_status: string;
    transactions: {
      completed: number;
      canceled: number;
      period: string;
      ratings: {
        positive: number;
        negative: number;
        neutral: number;
      };
    };
  };
}> => {
  const response = await api.get(`${PROXY_BASE_URL}/users/${userId}`);
  return response.data;
};

// Búsqueda avanzada con filtros
export const advancedSearch = async (params: {
  q: string;
  sort?: string;
  official_store?: string;
  state?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  results: Product[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}> => {
  const response = await api.get(`${PROXY_BASE_URL}/search/advanced`, { params });
  return response.data;
};

// Obtener categorías por término de búsqueda
export const getCategoriesByQuery = async (query: string): Promise<Array<{
  domain_id: string;
  domain_name: string;
  category_id: string;
  category_name: string;
}>> => {
  const response = await api.get(`${PROXY_BASE_URL}/domain_discovery`, {
    params: { q: query }
  });
  return response.data;
}; 