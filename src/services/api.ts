import axios from 'axios';
import { getAccessToken } from './auth';
import { insertProductData, insertCompetitorData, insertVisitsData, insertTrendsData } from './supabase';

// ID de la tienda oficial de Garmin Argentina
const GARMIN_STORE_ID = 225076335;

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
  catalog_product_id?: string;
  seller: {
    id: number;
    nickname: string;
  };
  shipping: {
    free_shipping: boolean;
    logistic_type?: string;
    tags?: string[];
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
  source?: {
    company: string;
    total: number;
  }[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Trend {
  keyword: string;
  url: string;
  category_id?: string;
}

export interface CompetitorAnalysis {
  sellerId: number;
  nickname: string;
  totalListings: number;
  averagePrice: number;
  marketShare: number;
  shippingStrategy: {
    freeShippingPercentage: number;
    fullService: boolean;
    sameDay: boolean;
  };
  stockStrategy: {
    averageStock: number;
    restockFrequency?: number;
  };
  keywordStrategy: string[];
  reputation?: {
    level: string;
    rating: number;
  };
}

export interface PriceAnalysis {
  current: number;
  historical: {
    date: string;
    price: number;
    change: number;
  }[];
  trend: 'up' | 'down' | 'stable';
  priceToWin?: number;
  competitiveAdvantages?: string[];
}

export interface PerformanceMetrics {
  conversionRate: number | null;
  sellThroughRate: number;
  questionRate: number | null;
  healthScore: number;
  visibility: number;
}

export interface MarketAnalysis {
  averagePrice: number;
  medianPrice: number;
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
  garminProducts: Product[];
  isGarminProduct: boolean;
  
  priceAnalysis: PriceAnalysis;
  competitorAnalysis: CompetitorAnalysis[];
  performanceMetrics: PerformanceMetrics;
  keywordAnalysis: {
    topKeywords: string[];
    keywordScore: number;
    suggestedKeywords: string[];
    trendingKeywords?: string[];
  };
  marketOpportunity: {
    score: number;
    factors: string[];
    potentialRevenue: number | null;
  };
}

// Obtener todos los productos de un vendedor
const getSellerProducts = async (sellerId: number): Promise<Product[]> => {
  try {
    // Primero obtener los IDs de los productos
    const response = await api.get(`/users/${sellerId}/items/search`, {
      params: {
        search_type: 'scan',
        limit: 100
      }
    });

    // Validar la respuesta
    if (!response.data || !Array.isArray(response.data.results)) {
      console.error('Respuesta inválida al buscar productos del vendedor:', response.data);
      return [];
    }

    const itemIds = response.data.results;
    if (itemIds.length === 0) return [];

    // Obtener detalles de productos en lotes de 20
    const products: Product[] = [];
    for (let i = 0; i < itemIds.length; i += 20) {
      try {
        const batch = itemIds.slice(i, i + 20);
        const itemsResponse = await api.get('/items', {
          params: {
            ids: batch.join(',')
          }
        });

        // Validar la respuesta de los detalles
        if (Array.isArray(itemsResponse.data)) {
          const validProducts = itemsResponse.data
            .filter(item => item && item.body)
            .map(item => item.body);
          products.push(...validProducts);
        }
      } catch (error) {
        console.error(`Error al obtener detalles del lote ${i}:`, error);
      }
    }

    return products;
  } catch (error) {
    console.error('Error al obtener productos del vendedor:', error);
    return [];
  }
};

// Obtener visitas de un producto
export const getProductVisits = async (productId: string): Promise<VisitData[]> => {
  try {
    const response = await api.get(`/items/${productId}/visits/time_window`, {
      params: {
        last: 30,
        unit: 'day'
      }
    });

    // Validar la respuesta
    if (!response.data || !Array.isArray(response.data.results)) {
      console.error('Respuesta inválida al obtener visitas:', response.data);
      return [];
    }

    return response.data.results.map((visit: any) => ({
      date: visit.date,
      total: typeof visit.total === 'number' ? visit.total : 0,
      source: Array.isArray(visit.visits_detail) ? visit.visits_detail.map((detail: any) => ({
        company: detail.company || 'unknown',
        total: typeof detail.total === 'number' ? detail.total : 0
      })) : undefined
    }));
  } catch (error) {
    console.error('Error al obtener visitas del producto:', error);
    return [];
  }
};

// Obtener tendencias de búsqueda
const getTrendingSearches = async (categoryId?: string): Promise<Trend[]> => {
  try {
    const endpoint = categoryId ? 
      `/trends/MLA-${categoryId}` : 
      '/trends/MLA';
    
    const response = await api.get(endpoint);
    return response.data || [];
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    return [];
  }
};

// Obtener precio competitivo
const getPriceToWin = async (productId: string): Promise<{
  price: number;
  advantages: string[];
} | null> => {
  try {
    const response = await api.get(`/items/${productId}/price_to_win`);
    return {
      price: response.data.price,
      advantages: response.data.competitive_advantages || []
    };
  } catch (error) {
    console.error('Error al obtener precio competitivo:', error);
    return null;
  }
};

// Calcular mediana de precios
const calculateMedianPrice = (prices: number[]): number => {
  const sorted = [...prices].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
};

// Analizar keywords
const analyzeKeywords = (products: Product[]): string[] => {
  const keywords = new Map<string, number>();
  
  products.forEach(product => {
    const words = product.title
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 3);
    
    words.forEach(word => {
      keywords.set(word, (keywords.get(word) || 0) + 1);
    });
  });
  
  return Array.from(keywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);
};

// Calcular health score
const calculateHealthScore = (product: Product, marketAverage: number): number => {
  let score = 100;
  
  // Penalización por precio muy alejado del promedio
  const priceDiff = Math.abs(product.price - marketAverage) / marketAverage;
  if (priceDiff > 0.3) score -= 20;
  
  // Penalización por stock bajo
  if (product.available_quantity < 5) score -= 15;
  
  // Bonificación por envío gratis
  if (product.shipping.free_shipping) score += 10;
  
  // Bonificación por Mercado Envíos Full
  if (product.shipping.logistic_type === 'fulfillment') score += 15;
  
  // Ajuste por antigüedad de la publicación
  const listingAge = Date.now() - new Date(product.date_created).getTime();
  if (listingAge > 180 * 24 * 60 * 60 * 1000) score -= 10; // Más de 6 meses
  
  return Math.max(0, Math.min(100, score));
};

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

    // Validar la respuesta
    if (!response.data || !Array.isArray(response.data.results)) {
      console.error('Respuesta inválida en búsqueda:', response.data);
      return {
        results: [],
        paging: { total: 0, offset: 0, limit }
      };
    }

    // Filtrar resultados por ventas mínimas si es necesario
    let results = response.data.results;
    if (filters?.minSales && filters.minSales > 0) {
      results = results.filter(product => 
        typeof product.sold_quantity === 'number' && 
        product.sold_quantity >= filters.minSales!
      );
    }

    // Guardar datos en Supabase
    for (const product of results) {
      try {
        await insertProductData(product);
      } catch (error) {
        console.error('Error al guardar producto en Supabase:', error);
      }
    }

    return {
      results,
      paging: response.data.paging || { total: results.length, offset, limit }
    };
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
    return {
      results: [],
      paging: { total: 0, offset: 0, limit }
    };
  }
};

export const getMarketAnalysis = async (
  product: Product,
  dateRange: { start: Date; end: Date },
  filters?: FilterOptions
): Promise<MarketAnalysis> => {
  try {
    // Obtener productos similares
    const allProducts = await searchProducts(product.title);
    const filteredProducts = filters ? 
      await searchProducts(product.title, filters) : 
      allProducts;

    if (!allProducts.results.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }

    // Obtener productos de Garmin
    const garminProducts = await getSellerProducts(GARMIN_STORE_ID);
    const isGarminProduct = product.seller.id === GARMIN_STORE_ID;

    // Obtener productos de tiendas oficiales
    const officialStoreProducts = allProducts.results.filter(p => p.official_store_id !== null);
    const officialStores = new Set(officialStoreProducts.map(p => p.official_store_id)).size;

    // Obtener visitas del producto
    const visitHistory = await getProductVisits(product.id);
    const totalVisits = visitHistory.reduce((sum, visit) => sum + visit.total, 0);

    // Obtener tendencias de búsqueda
    const trends = await getTrendingSearches(product.catalog_product_id?.split('-')[1]);

    // Obtener precio competitivo si es producto Garmin
    const priceToWin = isGarminProduct ? 
      await getPriceToWin(product.id) : 
      null;

    // Calcular métricas de rendimiento
    const sellThroughRate = (product.sold_quantity / (product.sold_quantity + product.available_quantity)) * 100;
    
    // La tasa de conversión será null si no tenemos datos de visitas
    const conversionRate = totalVisits > 0 ? 
      (product.sold_quantity / totalVisits) * 100 : 
      null;

    // Calcular promedios y mediana de precios
    const prices = filteredProducts.results.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const medianPrice = calculateMedianPrice(prices);

    // Calcular tendencia de precios respecto a Garmin
    const priceTrend = isGarminProduct && garminProducts.length > 0 ?
      ((garminProducts[0].price - averagePrice) / averagePrice) * 100 :
      0;

    // Análisis de competidores
    const competitors = new Map<number, Product[]>();
    allProducts.results.forEach(p => {
      if (!competitors.has(p.seller.id)) {
        competitors.set(p.seller.id, []);
      }
      competitors.get(p.seller.id)?.push(p);
    });

    const competitorAnalysis = await Promise.all(
      Array.from(competitors.entries())
        .map(async ([sellerId, products]) => {
          const totalListings = products.length;
          const sellerAvgPrice = products.reduce((sum, p) => sum + p.price, 0) / totalListings;
          const freeShippingCount = products.filter(p => p.shipping.free_shipping).length;
          const fullServiceCount = products.filter(p => p.shipping.logistic_type === 'fulfillment').length;
          const sameDayCount = products.filter(p => p.shipping.tags?.includes('same_day')).length;
          
          return {
            sellerId,
            nickname: products[0].seller.nickname,
            totalListings,
            averagePrice: sellerAvgPrice,
            marketShare: (totalListings / allProducts.results.length) * 100,
            shippingStrategy: {
              freeShippingPercentage: (freeShippingCount / totalListings) * 100,
              fullService: fullServiceCount > 0,
              sameDay: sameDayCount > 0
            },
            stockStrategy: {
              averageStock: products.reduce((sum, p) => sum + p.available_quantity, 0) / totalListings
            },
            keywordStrategy: analyzeKeywords(products)
          };
        })
    );

    // Ordenar competidores por participación de mercado
    competitorAnalysis.sort((a, b) => b.marketShare - a.marketShare);

    // Análisis de palabras clave
    const topKeywords = analyzeKeywords(allProducts.results);
    const keywordScore = isGarminProduct ? 
      topKeywords.filter(k => product.title.toLowerCase().includes(k)).length * 10 : 0;

    // Calcular potencial de ingresos
    let potentialRevenue = null;
    if (totalVisits > 0 && conversionRate !== null) {
      const avgMonthlyVisits = totalVisits / (visitHistory.length || 30);
      potentialRevenue = avgMonthlyVisits * (conversionRate / 100) * product.price * 12; // Anualizado
    }

    // Generar recomendaciones basadas en los datos reales
    const recommendations = [];
    
    if (isGarminProduct) {
      if (priceToWin) {
        if (product.price > priceToWin.price) {
          recommendations.push(`Para mejorar competitividad, considera ajustar el precio a ${priceToWin.price}`);
          priceToWin.advantages.forEach(advantage => {
            recommendations.push(`Ventaja competitiva: ${advantage}`);
          });
        }
      }

      if (priceTrend > 10) {
        recommendations.push('El precio está por encima del promedio del mercado. Considera ajustarlo para mejorar la competitividad.');
      } else if (priceTrend < -10) {
        recommendations.push('El precio está por debajo del promedio del mercado. Podrías aumentarlo sin perder competitividad.');
      }

      const topCompetitor = competitorAnalysis[0];
      if (topCompetitor && topCompetitor.sellerId !== GARMIN_STORE_ID) {
        if (topCompetitor.shippingStrategy.fullService && !product.shipping.logistic_type?.includes('fulfillment')) {
          recommendations.push('Considera activar Mercado Envíos Full para competir con el líder del mercado.');
        }
        if (topCompetitor.shippingStrategy.sameDay && !product.shipping.tags?.includes('same_day')) {
          recommendations.push('El líder ofrece envío en el día. Evalúa esta opción para mejorar competitividad.');
        }
      }

      if (conversionRate !== null) {
        if (conversionRate < 2) {
          recommendations.push('La tasa de conversión es baja. Considera mejorar la descripción y fotos del producto.');
        }
      }

      if (sellThroughRate < 20) {
        recommendations.push('El ratio de ventas es bajo. Evalúa ajustar el precio o la estrategia de marketing.');
      }

      // Recomendaciones basadas en tendencias
      if (trends.length > 0) {
        const relevantTrends = trends.filter(trend => 
          product.title.toLowerCase().includes(trend.keyword.toLowerCase())
        );
        if (relevantTrends.length > 0) {
          recommendations.push('Hay búsquedas en tendencia relacionadas con este producto. Considera destacarlo.');
        }
      }
    } else {
      recommendations.push('Este producto no está disponible en la tienda oficial de Garmin Argentina.');
    }

    const healthScore = calculateHealthScore(product, averagePrice);

    return {
      averagePrice,
      medianPrice,
      priceRange: { min: minPrice, max: maxPrice },
      totalSellers: competitors.size,
      totalListings: filteredProducts.results.length,
      visitHistory,
      salesTrend: 0, // No tenemos acceso a datos históricos de ventas
      priceTrend,
      competitionLevel: competitors.size > 50 ? 'high' : competitors.size > 20 ? 'medium' : 'low',
      recommendations,
      officialStores,
      officialStorePercentage: (officialStores / competitors.size) * 100,
      activeSellers: competitors.size,
      newSellers: Math.floor(competitors.size * 0.15),
      salesDistribution: [],
      garminProducts,
      isGarminProduct,
      
      priceAnalysis: {
        current: product.price,
        historical: visitHistory.map(v => ({
          date: v.date,
          price: product.price,
          change: 0
        })),
        trend: priceTrend > 0 ? 'up' : priceTrend < 0 ? 'down' : 'stable',
        priceToWin: priceToWin?.price,
        competitiveAdvantages: priceToWin?.advantages
      },
      competitorAnalysis,
      performanceMetrics: {
        conversionRate,
        sellThroughRate,
        questionRate: null, // No tenemos acceso a datos de preguntas
        healthScore,
        visibility: keywordScore
      },
      keywordAnalysis: {
        topKeywords,
        keywordScore,
        suggestedKeywords: topKeywords.filter(k => !product.title.toLowerCase().includes(k)),
        trendingKeywords: trends.map(t => t.keyword)
      },
      marketOpportunity: {
        score: Math.min(100, Math.max(0, 
          (sellThroughRate * 0.3) + 
          ((conversionRate || 0) * 10) +
          (competitors.size < 20 ? 30 : competitors.size < 50 ? 20 : 10)
        )),
        factors: [
          `Sell-through Rate: ${sellThroughRate.toFixed(1)}%`,
          conversionRate ? `Tasa de conversión: ${conversionRate.toFixed(1)}%` : 'Sin datos de conversión',
          `Nivel de competencia: ${competitors.size} vendedores`
        ],
        potentialRevenue
      }
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};