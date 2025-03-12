import axios from 'axios';
import { getAccessToken } from './auth';

// Single axios instance para todas las llamadas a la API mediante proxy
const api = axios.create({
  baseURL: '/api/proxy'
});

// ID de la tienda oficial de Garmin Argentina
const GARMIN_STORE_ID = 225076335;

// Interceptor para agregar token de autenticación
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

export interface CompetitorAnalysis {
  sellerId: number;
  nickname: string;
  totalListings: number;
  averagePrice: number;
  marketShare: number;
  shippingStrategy: {
    freeShippingPercentage: number;
    averageShippingTime?: number;
  };
  stockStrategy: {
    averageStock: number;
    restockFrequency?: number;
  };
  keywordStrategy: string[];
}

export interface PriceAnalysis {
  current: number;
  historical: {
    date: string;
    price: number;
    change: number;
  }[];
  trend: 'up' | 'down' | 'stable';
  seasonality?: {
    highSeasonMonths: number[];
    lowSeasonMonths: number[];
  };
  priceElasticity?: number;
}

export interface PerformanceMetrics {
  conversionRate: number;
  sellThroughRate: number;
  questionRate: number;
  healthScore: number;
  visibility: number;
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
  garminProducts: Product[];
  isGarminProduct: boolean;

  // Nuevo campo para la mediana
  medianPrice: number;
  
  // Nuevos campos de análisis avanzado
  priceAnalysis: PriceAnalysis;
  competitorAnalysis: CompetitorAnalysis[];
  performanceMetrics: PerformanceMetrics;
  keywordAnalysis: {
    topKeywords: string[];
    keywordScore: number;
    suggestedKeywords: string[];
  };
  marketOpportunity: {
    score: number;
    factors: string[];
    potentialRevenue: number;
  };
}

// ---------------------------------------------------------
// Función auxiliar para calcular mediana de una lista
// ---------------------------------------------------------
function getMedian(numbers: number[]): number {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

// ---------------------------------------------------------
// searchProducts
// ---------------------------------------------------------
export const searchProducts = async (
  query: string,
  filters?: FilterOptions,
  limit = 50,
  offset = 0
): Promise<SearchResponse> => {
  try {
    // Endpoint de búsqueda genérica (usando proxy)
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
    
    // Filtro adicional de ventas mínimas
    if (filters?.minSales && filters.minSales > 0) {
      response.data.results = response.data.results.filter(
        (product: Product) => product.sold_quantity >= filters.minSales!
      );
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en búsqueda de productos:', error);
    throw error;
  }
};

// ---------------------------------------------------------
// Ejemplo de obtención de visitas de un producto o palabra
// ---------------------------------------------------------
export const getProductVisits = async (
  productName: string,
  officialStoresOnly: boolean = false
): Promise<VisitData[]> => {
  try {
    // Aquí podrías usar un endpoint oficial de visitas de ML
    // o uno interno '/product-visits'. Ajusta según tu proxy.
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

// ---------------------------------------------------------
// Análisis básico de palabras clave
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// Cálculo sencillo de elasticidad precio
// ---------------------------------------------------------
const calculatePriceElasticity = (
  priceChanges: number[],
  salesChanges: number[]
): number => {
  if (priceChanges.length < 2 || salesChanges.length < 2) return 0;

  const avgPriceChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const avgSalesChange = salesChanges.reduce((a, b) => a + b, 0) / salesChanges.length;
  
  return avgPriceChange !== 0 ? (avgSalesChange / avgPriceChange) : 0;
};

// ---------------------------------------------------------
// Cálculo de healthScore
// ---------------------------------------------------------
const calculateHealthScore = (product: Product, marketAverage: number): number => {
  let score = 100;
  
  // Penalización por precio muy alejado del promedio
  const priceDiff = Math.abs(product.price - marketAverage) / marketAverage;
  if (priceDiff > 0.3) score -= 20;
  
  // Penalización por stock bajo
  if (product.available_quantity < 5) score -= 15;
  
  // Bonificación por envío gratis
  if (product.shipping.free_shipping) score += 10;
  
  // Ajuste por antigüedad de la publicación
  const listingAge = Date.now() - new Date(product.date_created).getTime();
  if (listingAge > 180 * 24 * 60 * 60 * 1000) {
    // Más de 6 meses
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
};

// ---------------------------------------------------------
// getMarketAnalysis
// ---------------------------------------------------------
export const getMarketAnalysis = async (
  product: Product,
  dateRange: { start: Date; end: Date },
  filters?: FilterOptions
): Promise<MarketAnalysis> => {
  try {
    // 1. Buscar productos (todos y filtrados)
    const allProducts = await searchProducts(product.title);
    const filteredProducts = filters ? await searchProducts(product.title, filters) : allProducts;
    
    if (!allProducts.results.length) {
      throw new Error('No hay suficientes datos para realizar un análisis');
    }

    // Identificar si es producto Garmin
    const garminProducts = allProducts.results.filter(
      p => p.seller.id === GARMIN_STORE_ID
    );
    const isGarminProduct = product.seller.id === GARMIN_STORE_ID;

    // 2. Obtener historia de visitas
    const visitHistory = await getProductVisits(
      product.title,
      filters?.officialStoresOnly
    );

    // 3. Cálculo de precios
    const prices = filteredProducts.results.map(item => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const medianPrice = getMedian(prices);

    // Comparar precio Garmin con el promedio
    let garminPrice = 0;
    let priceTrend = 0;
    if (garminProducts.length > 0) {
      garminPrice = garminProducts[0].price;
      priceTrend = ((garminPrice - averagePrice) / averagePrice) * 100;
    }

    // 4. Cálculo de ventas y tendencias
    const totalSales = filteredProducts.results.reduce((sum, item) => sum + item.sold_quantity, 0);
    const avgSales = totalSales / filteredProducts.results.length;
    const salesTrend = ((product.sold_quantity - avgSales) / avgSales) * 100;

    // 5. Análisis de competidores
    const competitors = new Map<number, Product[]>();
    allProducts.results.forEach(p => {
      if (!competitors.has(p.seller.id)) {
        competitors.set(p.seller.id, []);
      }
      competitors.get(p.seller.id)?.push(p);
    });

    const competitorAnalysis: CompetitorAnalysis[] = Array.from(competitors.entries())
      .map(([sellerId, products]) => {
        const totalListings = products.length;
        const sellerAvgPrice = products.reduce((sum, p) => sum + p.price, 0) / totalListings;
        const freeShippingCount = products.filter(p => p.shipping.free_shipping).length;
        
        return {
          sellerId,
          nickname: products[0].seller.nickname,
          totalListings,
          averagePrice: sellerAvgPrice,
          marketShare: (totalListings / allProducts.results.length) * 100,
          shippingStrategy: {
            freeShippingPercentage: (freeShippingCount / totalListings) * 100
          },
          stockStrategy: {
            averageStock: products.reduce((sum, p) => sum + p.available_quantity, 0) / totalListings
          },
          keywordStrategy: analyzeKeywords(products)
        };
      })
      .sort((a, b) => b.marketShare - a.marketShare)
      .slice(0, 10);

    // 6. Análisis de palabras clave
    const topKeywords = analyzeKeywords(allProducts.results);
    const keywordScore = isGarminProduct 
      ? topKeywords.filter(k => product.title.toLowerCase().includes(k)).length * 10 
      : 0;

    // 7. Métricas de rendimiento
    const estimatedViews = visitHistory.reduce((sum, v) => sum + v.total, 0);
    const conversionRate = estimatedViews > 0 ? (product.sold_quantity / estimatedViews) * 100 : 0;
    const healthScore = calculateHealthScore(product, averagePrice);

    const uniqueSellers = new Set(allProducts.results.map(item => item.seller.id)).size;
    // Tiendas oficiales (en este ejemplo, interpretado como la de Garmin, pero podría adaptarse si hubiera más)
    const uniqueOfficialStores = new Set(
      allProducts.results
        .filter(p => p.seller.id === GARMIN_STORE_ID)
        .map(p => p.seller.id)
    ).size;
    const officialStorePercentage = Math.round((uniqueOfficialStores / uniqueSellers) * 100);

    // Nivel de competencia
    let competitionLevel: 'low' | 'medium' | 'high' = 'low';
    if (uniqueSellers > 50) competitionLevel = 'high';
    else if (uniqueSellers > 20) competitionLevel = 'medium';

    // Distribución de ventas
    const salesRanges = [
      { min: 0, max: 10, count: 0 },
      { min: 11, max: 50, count: 0 },
      { min: 51, max: 100, count: 0 },
      { min: 101, max: Infinity, count: 0 }
    ];
    filteredProducts.results.forEach(item => {
      const range = salesRanges.find(r => item.sold_quantity >= r.min && item.sold_quantity <= r.max);
      if (range) range.count++;
    });
    const salesDistribution = salesRanges.map((range, index) => ({
      range: index === salesRanges.length - 1 
        ? `${range.min}+ ventas`
        : `${range.min}-${range.max} ventas`,
      percentage: Math.round((range.count / filteredProducts.results.length) * 100)
    }));

    // 8. Recomendaciones
    const recommendations = [];
    if (isGarminProduct && garminPrice > 0) {
      if (priceTrend > 10) {
        recommendations.push(`El precio de Garmin (${formatPrice(garminPrice)}) está por encima del promedio del mercado (${formatPrice(averagePrice)}). Considera ajustarlo para mejorar la competitividad.`);
      } else if (priceTrend < -10) {
        recommendations.push(`El precio de Garmin (${formatPrice(garminPrice)}) está por debajo del promedio del mercado (${formatPrice(averagePrice)}). Podrías aumentarlo sin perder competitividad.`);
      }

      if (officialStorePercentage > 70) {
        recommendations.push('Alta presencia de tiendas oficiales. Destaca el respaldo y garantía oficial de Garmin.');
      }

      if (competitionLevel === 'high') {
        recommendations.push('Mercado muy competitivo. Enfatiza las ventajas de comprar directamente con Garmin.');
      } else if (competitionLevel === 'low') {
        recommendations.push('Baja competencia. Oportunidad para establecer precios más competitivos.');
      }

      if (visitHistory.length > 0) {
        const lastVisits = visitHistory[visitHistory.length - 1].total;
        const firstVisits = visitHistory[0].total;
        if (lastVisits > firstVisits) {
          recommendations.push('Las visitas están aumentando. Buen momento para destacar características exclusivas.');
        } else if (lastVisits < firstVisits) {
          recommendations.push('Las visitas están disminuyendo. Considera realizar promociones o mejorar la visibilidad.');
        }
      }

      if (keywordScore < 50) {
        recommendations.push('Optimiza el título con palabras clave más relevantes del mercado.');
      }

      if (conversionRate < 2) {
        recommendations.push('La tasa de conversión es baja. Considera mejorar la calidad de las imágenes y descripción.');
      }

      if (healthScore < 70) {
        recommendations.push('El health score del producto es bajo. Revisa el precio y el stock disponible.');
      }
    } else {
      recommendations.push('Este producto no está disponible en la tienda oficial de Garmin Argentina.');
    }

    // 9. Oportunidad de mercado
    const marketOpportunity = {
      score: Math.min(100, Math.max(0, 
        (healthScore * 0.3) + 
        (conversionRate * 10) + 
        (keywordScore * 0.3) +
        (competitionLevel === 'low' ? 30 : competitionLevel === 'medium' ? 20 : 10)
      )),
      factors: [
        `Health Score: ${healthScore.toFixed(1)}`,
        `Tasa de conversión: ${conversionRate.toFixed(1)}%`,
        `Optimización de keywords: ${keywordScore}%`,
        `Nivel de competencia: ${competitionLevel}`
      ],
      potentialRevenue: averagePrice * avgSales * 12 // Estimación anual
    };

    // 10. Construir respuesta final
    return {
      averagePrice,
      medianPrice,  // Nuevo campo con la mediana
      priceRange: { min: minPrice, max: maxPrice },
      totalSellers: uniqueSellers,
      totalListings: filteredProducts.results.length,
      visitHistory,
      salesTrend,
      priceTrend,
      competitionLevel,
      recommendations,
      officialStores: uniqueOfficialStores,
      officialStorePercentage,
      activeSellers: uniqueSellers,
      newSellers: Math.floor(uniqueSellers * 0.15),
      salesDistribution,
      garminProducts,
      isGarminProduct,

      // Análisis avanzado
      priceAnalysis: {
        current: product.price,
        // Ajustamos la simulación del histórico: incrementamos o disminuimos un poco el precio en cada punto
        historical: visitHistory.map((v, i) => {
          const percentChange = (i - (visitHistory.length - 1)) * 0.015; // ejemplo
          const changedPrice = product.price * (1 + percentChange);
          return {
            date: v.date,
            price: parseFloat(changedPrice.toFixed(2)),
            change: i === 0 ? 0 : parseFloat((percentChange * 100).toFixed(2))
          };
        }),
        trend: priceTrend > 0 ? 'up' : priceTrend < 0 ? 'down' : 'stable',
        priceElasticity: calculatePriceElasticity(
          [0, priceTrend],
          [0, salesTrend]
        )
      },
      competitorAnalysis,
      performanceMetrics: {
        conversionRate,
        sellThroughRate: (product.sold_quantity / (product.sold_quantity + product.available_quantity)) * 100,
        questionRate: Math.random() * 100, // Simulado - requiere datos reales
        healthScore,
        visibility: keywordScore
      },
      keywordAnalysis: {
        topKeywords,
        keywordScore,
        suggestedKeywords: topKeywords.filter(k => !product.title.toLowerCase().includes(k))
      },
      marketOpportunity
    };
  } catch (error) {
    console.error('Error al realizar análisis de mercado:', error);
    throw error;
  }
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(price);
}
