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

// Tipos y estructuras
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

// Ajustamos la estructura de PriceHistory para incluir “sales”
export interface PriceHistory {
  date: string;
  price: number;
  sales: number; // ← ahora guardamos ventas
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
  priceHistory: PriceHistory[]; // ← ahora hay price + sales
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

// ---------------------------------------------------------------------------
// Ejemplo de funciones de proxy
// ---------------------------------------------------------------------------
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
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

export const getProductDetails = async (productId: string): Promise<Product> => {
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/items/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener detalles del producto:', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// getMarketAnalysis adaptado para:
// - Recibir query (string)
// - Recibir dateRange {start: Date, end: Date}
// - Recibir officialStoresOnly (boolean)
// - Retornar PriceHistory con .sales (simulado o real)
// ---------------------------------------------------------------------------
interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Obtiene un MarketAnalysis basado en un término de búsqueda (query),
 * un rango de fechas (dateRange) y la opción de filtrar tiendas oficiales.
 */
export const getMarketAnalysis = async (
  query: string,
  dateRange: DateRange,
  officialStoresOnly = false
): Promise<MarketAnalysis> => {
  try {
    // 1) Buscamos productos limitados
    const searchData = await searchProducts(query, 50, 0, officialStoresOnly);
    if (!searchData.results.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }

    // 2) Calculamos estadísticas de precios
    const prices = searchData.results.map((item) => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // 3) Analizar tiendas oficiales
    const officialStoresMap = new Map<number, {
      id: number;
      name: string;
      products: Product[];
      totalPrice: number;
    }>();
    let totalOfficialStoreProducts = 0;

    searchData.results.forEach((product) => {
      if (product.official_store_id) {
        totalOfficialStoreProducts++;
        if (!officialStoresMap.has(product.official_store_id)) {
          officialStoresMap.set(product.official_store_id, {
            id: product.official_store_id,
            name:
              product.official_store_name ||
              `Tienda Oficial ${product.official_store_id}`,
            products: [product],
            totalPrice: product.price,
          });
        } else {
          const store = officialStoresMap.get(product.official_store_id)!;
          store.products.push(product);
          store.totalPrice += product.price;
        }
      }
    });

    const officialStores = {
      total: officialStoresMap.size,
      stores: Array.from(officialStoresMap.values()).map((store) => ({
        id: store.id,
        name: store.name,
        productsCount: store.products.length,
        averagePrice: store.totalPrice / store.products.length,
      })),
      percentage: (officialStoresMap.size / searchData.results.length) * 100,
    };

    // 4) Obtener vendedores únicos
    const uniqueSellers = new Map<number, {
      id: number;
      nickname: string;
      salesCount: number;
      items: Product[];
      isOfficialStore: boolean;
    }>();
    for (const item of searchData.results) {
      if (!uniqueSellers.has(item.seller.id)) {
        uniqueSellers.set(item.seller.id, {
          id: item.seller.id,
          nickname: item.seller.nickname,
          salesCount: item.sold_quantity,
          items: [item],
          isOfficialStore: !!item.official_store_id,
        });
      } else {
        const seller = uniqueSellers.get(item.seller.id)!;
        seller.salesCount += item.sold_quantity;
        seller.items.push(item);
      }
    }

    // 5) Top vendedores
    const topSellers = Array.from(uniqueSellers.values())
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5)
      .map((seller) => ({
        id: seller.id,
        nickname: seller.nickname,
        salesCount: seller.salesCount,
        reputation: seller.items[0].seller.power_seller_status || 'N/A',
        isOfficialStore: seller.isOfficialStore,
      }));

    // 6) priceHistory simulado con .price y .sales
    //    Basado en dateRange (start..end). 
    //    Aquí hacemos 6 “periodos” mensuales, por ejemplo.
    const priceHistory: PriceHistory[] = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Tomamos la cantidad de meses aproximada
    // (podrías usar differenceInMonths de date-fns si lo prefieres).
    let current = new Date(startDate);
    while (current <= endDate) {
      // Generamos un “precio simulado” con variación ±10%
      const variation = Math.random() * 0.2 - 0.1; // -10%..+10%
      const simulatedPrice = averagePrice * (1 + variation);

      // Generamos “ventas” simuladas (puedes reemplazar con tu lógica real)
      const simulatedSales = Math.floor(Math.random() * 300);

      priceHistory.push({
        date: current.toISOString().split('T')[0],
        price: simulatedPrice,
        sales: simulatedSales,
      });

      // Avanzar 1 mes
      current.setMonth(current.getMonth() + 1);
    }

    // 7) Calcular “salesTrend” basado en la evolución de "ventas"
    //    Ej: comparamos la 1ra mitad vs. 2da mitad
    let salesTrend = 0;
    if (priceHistory.length >= 2) {
      const midpoint = Math.floor(priceHistory.length / 2);
      const firstPeriod = priceHistory.slice(0, midpoint);
      const secondPeriod = priceHistory.slice(midpoint);

      const avgFirst = firstPeriod.reduce((sum, h) => sum + h.sales, 0) / firstPeriod.length;
      const avgSecond = secondPeriod.reduce((sum, h) => sum + h.sales, 0) / secondPeriod.length;

      if (avgFirst !== 0) {
        salesTrend = ((avgSecond - avgFirst) / avgFirst) * 100;
      }
    }

    // 8) Determinar competencia
    let competitionLevel: 'low' | 'medium' | 'high' = 'low';
    if (uniqueSellers.size > 50) competitionLevel = 'high';
    else if (uniqueSellers.size > 20) competitionLevel = 'medium';

    // 9) Generar distribución de precios
    const priceRanges = [
      { min: minPrice, max: minPrice + (maxPrice - minPrice) * 0.33 },
      { min: minPrice + (maxPrice - minPrice) * 0.33, max: minPrice + (maxPrice - minPrice) * 0.66 },
      { min: minPrice + (maxPrice - minPrice) * 0.66, max: maxPrice },
    ];

    const priceDistribution = priceRanges.map((range) => {
      const count = prices.filter((p) => p >= range.min && p <= range.max).length;
      return {
        range: `${range.min.toFixed(0)} - ${range.max.toFixed(0)}`,
        count,
        percentage: (count / prices.length) * 100,
      };
    });

    // 10) Analizar condiciones (nuevo, usado, etc.)
    const conditions = new Map<string, number>();
    searchData.results.forEach((product) => {
      const count = conditions.get(product.condition) || 0;
      conditions.set(product.condition, count + 1);
    });
    const conditionBreakdown = Array.from(conditions.entries()).map(([condition, count]) => ({
      condition,
      count,
      percentage: (count / searchData.results.length) * 100,
    }));

    // 11) Generar recomendaciones
    const recommendations: string[] = [];

    // Tiendas oficiales
    if (officialStores.total > 0) {
      recommendations.push(
        `Hay ${officialStores.total} tiendas oficiales en este mercado. ` +
          `Representan el ${officialStores.percentage.toFixed(1)}% de los vendedores.`
      );

      if (officialStores.percentage > 50) {
        recommendations.push(
          'Alta presencia de tiendas oficiales. Considera establecer alianzas estratégicas.'
        );
      } else if (officialStores.percentage < 20) {
        recommendations.push(
          'Baja presencia de tiendas oficiales. Oportunidad para establecer presencia oficial.'
        );
      }
    }

    // Ventas
    if (salesTrend > 10) {
      recommendations.push(
        'Las ventas muestran una tendencia positiva. Es un buen momento para aumentar inventario.'
      );
    } else if (salesTrend < 0) {
      recommendations.push(
        'Las ventas están disminuyendo. Considera revisar tus precios o diversificar.'
      );
    }

    // Competencia
    if (competitionLevel === 'high') {
      recommendations.push(
        'Alta competencia detectada, enfócate en diferenciación y servicio al cliente.'
      );
    } else if (competitionLevel === 'low') {
      recommendations.push(
        'Baja competencia, oportunidad para establecer presencia dominante en el mercado.'
      );
    }

    // Devolver la estructura final
    return {
      averagePrice,
      priceRange: { min: minPrice, max: maxPrice },
      totalSellers: uniqueSellers.size,
      officialStores,
      totalListings: searchData.paging.total,
      priceHistory, // con price + sales
      salesTrend,
      competitionLevel,
      recommendations,
      topSellers,
      priceDistribution,
      conditionBreakdown,
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};
