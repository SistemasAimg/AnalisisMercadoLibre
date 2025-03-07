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

// Modificar la instancia de axios para el proxy
const proxyApi = axios.create({
  baseURL: PROXY_BASE_URL,
});

// Añadir interceptor para el token en las peticiones al proxy
proxyApi.interceptors.request.use(async (config) => {
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
    const response = await proxyApi.get('/categories');
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

// Función para obtener múltiples páginas de resultados
async function fetchMultiplePages(query: string, totalNeeded: number, officialStoresOnly = false): Promise<Product[]> {
  const limit = 50; // Límite máximo permitido por la API
  const totalPages = Math.ceil(totalNeeded / limit);
  const results: Product[] = [];
  
  const requests = Array.from({ length: totalPages }, (_, i) => {
    return searchProducts(query, limit, i * limit, officialStoresOnly)
      .then(response => results.push(...response.results))
      .catch(error => {
        console.error(`Error en página ${i + 1}:`, error);
        return []; // Retornar array vacío en caso de error
      });
  });

  await Promise.all(requests);
  return results.slice(0, totalNeeded);
}

// Función para buscar productos incluyendo filtro de tiendas oficiales
export const searchProducts = async (
  query: string,
  limit = 50,
  offset = 0,
  officialStoresOnly = false
): Promise<SearchResponse> => {
  try {
    // Asegurarse de que el límite no exceda 50
    const safeLimit = Math.min(50, limit);
    
    const params = new URLSearchParams({
      q: query,
      limit: safeLimit.toString(),
      offset: offset.toString(),
    });

    if (officialStoresOnly) {
      params.append('official_store', 'all');
    }

    const response = await proxyApi.get('/search', { params });
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

// Hacer públicas las interfaces necesarias
export interface ItemVisits {
  date: string;
  total: number;
}

export interface ItemStats {
  visits: ItemVisits[];
  sales: number;
  views: number;
  lastUpdated: string;
}

export interface ItemHistory {
  price: number;
  date: string;
  soldQuantity: number;
  availableQuantity: number;
}

// Exportar las funciones que necesitamos
export async function getItemStats(itemId: string): Promise<ItemStats> {
  try {
    const [visitsResponse, statsResponse] = await Promise.all([
      proxyApi.get(`/items/${itemId}/visits/time_window?last=30&unit=day`),
      proxyApi.get(`/items/${itemId}/stats`)
    ]);

    return {
      visits: visitsResponse.data,
      sales: statsResponse.data.sold_quantity,
      views: statsResponse.data.visits,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error al obtener estadísticas del item ${itemId}:`, error);
    throw error;
  }
}

export async function getItemHistory(itemId: string): Promise<ItemHistory[]> {
  try {
    const response = await proxyApi.get(`/items/${itemId}/history`);
    return response.data.map((record: any) => ({
      price: record.price,
      date: record.date,
      soldQuantity: record.sold_quantity,
      availableQuantity: record.available_quantity
    }));
  } catch (error) {
    console.error(`Error al obtener historial del item ${itemId}:`, error);
    throw error;
  }
}

// Función para obtener detalles del vendedor
async function getSellerDetails(sellerId: number): Promise<SellerReputation> {
  try {
    const response = await proxyApi.get(`/users/${sellerId}`);
    return response.data.seller_reputation;
  } catch (error) {
    console.error(`Error al obtener detalles del vendedor ${sellerId}:`, error);
    throw error;
  }
}

// Función mejorada para obtener análisis de mercado
export const getMarketAnalysis = async (
  query: string,
  officialStoresOnly = false
): Promise<MarketAnalysis> => {
  try {
    // Primero obtener la primera página para ver el total disponible
    const initialSearch = await searchProducts(query, 50, 0, officialStoresOnly);
    
    // Determinar cuántos productos necesitamos (máximo 100)
    const totalNeeded = Math.min(100, initialSearch.paging.total);
    
    // Si necesitamos más de 50, hacer peticiones adicionales
    let allProducts: Product[];
    if (totalNeeded > 50) {
      allProducts = await fetchMultiplePages(query, totalNeeded, officialStoresOnly);
    } else {
      allProducts = initialSearch.results;
    }

    if (!allProducts.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }

    // Obtener datos detallados de los primeros 20 productos
    const topProducts = allProducts.slice(0, 20);
    
    // Obtener estadísticas e historiales en paralelo
    const productDetailsPromises = topProducts.map(async (product) => {
      const [stats, history, sellerDetails] = await Promise.all([
        getItemStats(product.id),
        getItemHistory(product.id),
        getSellerDetails(product.seller.id)
      ]);
      
      return {
        product,
        stats,
        history,
        sellerDetails
      };
    });

    const productDetails = await Promise.all(productDetailsPromises);

    // Calcular estadísticas de precios actuales
    const prices = allProducts.map(item => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Analizar tiendas oficiales con datos reales
    const officialStoresMap = new Map();
    let totalOfficialStoreProducts = 0;

    for (const product of allProducts) {
      if (product.official_store_id) {
        totalOfficialStoreProducts++;
        if (!officialStoresMap.has(product.official_store_id)) {
          // Obtener detalles de la tienda oficial
          const storeResponse = await proxyApi.get(`/stores/${product.official_store_id}`);
          
          officialStoresMap.set(product.official_store_id, {
            id: product.official_store_id,
            name: storeResponse.data.name,
            products: [product],
            totalPrice: product.price,
            metrics: storeResponse.data.metrics
          });
        } else {
          const store = officialStoresMap.get(product.official_store_id);
          store.products.push(product);
          store.totalPrice += product.price;
        }
      }
    }

    // Calcular tendencias reales basadas en historiales
    const allHistories = productDetails.flatMap(detail => detail.history);
    const sortedHistories = allHistories.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calcular tendencia de ventas real
    const salesTrend = calculateSalesTrend(sortedHistories);

    // Calcular nivel de competencia basado en datos reales
    const competitionLevel = calculateCompetitionLevel(
      allProducts,
      productDetails.map(detail => detail.sellerDetails)
    );

    // Generar distribución de precios real
    const priceDistribution = calculatePriceDistribution(prices);

    // Generar recomendaciones basadas en datos reales
    const recommendations = generateRecommendations(
      allProducts,
      productDetails,
      salesTrend,
      competitionLevel
    );

    return {
      averagePrice,
      priceRange: { min: minPrice, max: maxPrice },
      totalSellers: new Set(allProducts.map(item => item.seller.id)).size,
      officialStores: {
        total: officialStoresMap.size,
        stores: Array.from(officialStoresMap.values()).map(store => ({
          id: store.id,
          name: store.name,
          productsCount: store.products.length,
          averagePrice: store.totalPrice / store.products.length,
          metrics: store.metrics
        })),
        percentage: (officialStoresMap.size / allProducts.length) * 100
      },
      totalListings: initialSearch.paging.total,
      priceHistory: sortedHistories,
      salesTrend,
      competitionLevel,
      recommendations,
      topSellers: generateTopSellers(productDetails),
      priceDistribution,
      marketMetrics: {
        totalViews: productDetails.reduce((sum, detail) => sum + detail.stats.views, 0),
        averageViews: productDetails.reduce((sum, detail) => sum + detail.stats.views, 0) / productDetails.length,
        totalSales: productDetails.reduce((sum, detail) => sum + detail.stats.sales, 0),
        conversionRate: calculateConversionRate(productDetails)
      }
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};

// Funciones auxiliares para cálculos

function calculateSalesTrend(histories: ItemHistory[]): number {
  const monthlyData = groupHistoriesByMonth(histories);
  const months = Object.keys(monthlyData).sort();
  
  if (months.length < 2) return 0;
  
  const lastMonth = monthlyData[months[months.length - 1]];
  const previousMonth = monthlyData[months[months.length - 2]];
  
  return ((lastMonth.sales - previousMonth.sales) / previousMonth.sales) * 100;
}

function calculateCompetitionLevel(
  products: Product[],
  sellerReputations: SellerReputation[]
): 'low' | 'medium' | 'high' {
  const totalSellers = new Set(products.map(p => p.seller.id)).size;
  const powerSellers = sellerReputations.filter(r => 
    r.power_seller_status === 'platinum' || r.power_seller_status === 'gold'
  ).length;
  
  const powerSellerRatio = powerSellers / totalSellers;
  
  if (powerSellerRatio > 0.5) return 'high';
  if (powerSellerRatio > 0.2) return 'medium';
  return 'low';
}

function calculatePriceDistribution(prices: number[]): {
  range: string;
  count: number;
  percentage: number;
}[] {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const segments = 5;
  const segmentSize = range / segments;
  
  const distribution = Array(segments).fill(0).map((_, i) => ({
    range: `${(min + (i * segmentSize)).toFixed(0)} - ${(min + ((i + 1) * segmentSize)).toFixed(0)}`,
    count: 0,
    percentage: 0
  }));
  
  prices.forEach(price => {
    const index = Math.min(
      Math.floor((price - min) / segmentSize),
      segments - 1
    );
    distribution[index].count++;
  });
  
  distribution.forEach(d => {
    d.percentage = (d.count / prices.length) * 100;
  });
  
  return distribution;
}

function calculateConversionRate(productDetails: any[]): number {
  const totalViews = productDetails.reduce((sum, detail) => sum + detail.stats.views, 0);
  const totalSales = productDetails.reduce((sum, detail) => sum + detail.stats.sales, 0);
  
  return totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
}

function generateTopSellers(productDetails: any[]): any[] {
  const sellerStats = new Map();
  
  productDetails.forEach(detail => {
    const { seller } = detail.product;
    const stats = sellerStats.get(seller.id) || {
      id: seller.id,
      nickname: seller.nickname,
      salesCount: 0,
      reputation: detail.sellerDetails,
      isOfficialStore: !!detail.product.official_store_id
    };
    
    stats.salesCount += detail.stats.sales;
    sellerStats.set(seller.id, stats);
  });
  
  return Array.from(sellerStats.values())
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);
}

function generateRecommendations(
  products: Product[],
  productDetails: any[],
  salesTrend: number,
  competitionLevel: string
): string[] {
  const recommendations: string[] = [];
  
  // Análisis de precios
  const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
  const profitableProducts = productDetails.filter(d => 
    d.stats.sales > 0 && d.product.price > avgPrice
  );
  
  if (profitableProducts.length > 0) {
    recommendations.push(
      `${profitableProducts.length} productos con precio superior al promedio muestran ventas activas.`
    );
  }

  // Análisis de conversión
  const conversionRate = calculateConversionRate(productDetails);
  if (conversionRate < 2) {
    recommendations.push(
      'La tasa de conversión es baja. Considera mejorar las descripciones y fotos de los productos.'
    );
  }

  // Análisis de competencia
  if (competitionLevel === 'high') {
    recommendations.push(
      'Alta presencia de vendedores establecidos. Enfócate en diferenciación y servicio al cliente.'
    );
  }

  // Análisis de tendencia
  if (salesTrend > 10) {
    recommendations.push(
      'El mercado muestra un crecimiento significativo. Considera aumentar el inventario.'
    );
  } else if (salesTrend < -10) {
    recommendations.push(
      'Las ventas están disminuyendo. Evalúa ajustar precios o diversificar el catálogo.'
    );
  }

  return recommendations;
}