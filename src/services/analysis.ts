import * as tf from '@tensorflow/tfjs';
import * as ss from 'simple-statistics';
import { Product, VisitData, CompetitorAnalysis } from './api';

// Interfaces para los modelos de análisis
export interface PriceAnalysisResult {
  predictedPrice: number;
  confidence: number;
  priceRange: {
    min: number;
    max: number;
  };
  elasticity: number;
}

export interface MarketSegment {
  id: number;
  name: string;
  products: Product[];
  centerPrice: number;
  averageSales: number;
}

export interface KeywordAnalysis {
  relevantTerms: string[];
  frequency: { [key: string]: number };
  sentiment: number;
}

// Clase principal para análisis de mercado
export class MarketAnalyzer {
  // Análisis de precios usando regresión lineal y TensorFlow
  async analyzePrices(products: Product[]): Promise<PriceAnalysisResult> {
    const prices = products.map(p => p.price);
    const sales = products.map(p => p.sold_quantity);

    // Calcular estadísticas básicas
    const meanPrice = ss.mean(prices);
    const stdPrice = ss.standardDeviation(prices);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Crear modelo de regresión para predecir precio óptimo
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 1, inputShape: [1] })
      ]
    });

    model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

    // Preparar datos para entrenamiento
    const xs = tf.tensor2d(sales, [sales.length, 1]);
    const ys = tf.tensor2d(prices, [prices.length, 1]);

    // Entrenar modelo
    await model.fit(xs, ys, { epochs: 100 });

    // Calcular predicción y elasticidad
    const predictedPrice = model.predict(tf.tensor2d([ss.mean(sales)], [1, 1])) as tf.Tensor;
    const elasticity = this.calculatePriceElasticity(prices, sales);

    return {
      predictedPrice: (await predictedPrice.data())[0],
      confidence: 0.95 - stdPrice / meanPrice, // Ajustar según variabilidad
      priceRange: {
        min: minPrice,
        max: maxPrice
      },
      elasticity
    };
  }

  // Segmentación de mercado usando algoritmo simple de clustering
  segmentMarket(products: Product[], k: number = 3): MarketSegment[] {
    // Implementación simple de k-means
    const features = products.map(p => ({
      price: p.price,
      sales: p.sold_quantity,
      stock: p.available_quantity
    }));

    // Normalizar datos
    const maxPrice = Math.max(...features.map(f => f.price));
    const maxSales = Math.max(...features.map(f => f.sales));
    const maxStock = Math.max(...features.map(f => f.stock));

    const normalizedFeatures = features.map(f => ({
      price: f.price / maxPrice,
      sales: f.sales / maxSales,
      stock: f.stock / maxStock
    }));

    // Inicializar centroides aleatoriamente
    let centroids = Array(k).fill(null).map(() => ({
      price: Math.random(),
      sales: Math.random(),
      stock: Math.random()
    }));

    // Asignar productos a clusters
    const assignments = normalizedFeatures.map(feature => {
      const distances = centroids.map((centroid, i) => ({
        index: i,
        distance: Math.sqrt(
          Math.pow(feature.price - centroid.price, 2) +
          Math.pow(feature.sales - centroid.sales, 2) +
          Math.pow(feature.stock - centroid.stock, 2)
        )
      }));
      return distances.reduce((min, curr) => 
        curr.distance < min.distance ? curr : min
      ).index;
    });

    // Crear segmentos
    const segments: MarketSegment[] = Array(k).fill(null).map((_, i) => ({
      id: i,
      name: this.getSegmentName(i),
      products: [],
      centerPrice: 0,
      averageSales: 0
    }));

    // Asignar productos a segmentos
    products.forEach((product, index) => {
      const segmentId = assignments[index];
      segments[segmentId].products.push(product);
    });

    // Calcular métricas por segmento
    segments.forEach(segment => {
      segment.centerPrice = ss.mean(segment.products.map(p => p.price));
      segment.averageSales = ss.mean(segment.products.map(p => p.sold_quantity));
    });

    return segments;
  }

  // Análisis de tendencias usando series temporales
  analyzeTrends(visitHistory: VisitData[]): {
    trend: 'up' | 'down' | 'stable';
    growthRate: number;
    seasonality: boolean;
  } {
    const visits = visitHistory.map(v => v.total);
    const dates = visitHistory.map(v => new Date(v.date).getTime());

    // Calcular tendencia usando regresión lineal simple
    const n = dates.length;
    const sumX = dates.reduce((a, b) => a + b, 0);
    const sumY = visits.reduce((a, b) => a + b, 0);
    const sumXY = dates.reduce((sum, x, i) => sum + x * visits[i], 0);
    const sumXX = dates.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const growthRate = (slope * n) / sumY * 100;

    // Detectar estacionalidad
    const seasonality = this.detectSeasonality(visits);

    return {
      trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
      growthRate,
      seasonality
    };
  }

  // Análisis de palabras clave simple
  analyzeKeywords(products: Product[]): KeywordAnalysis {
    const allText = products.map(p => p.title.toLowerCase()).join(' ');
    const words = allText.split(/\s+/);
    
    // Calcular frecuencia de términos
    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      if (word.length > 3) { // Ignorar palabras muy cortas
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    // Identificar términos más relevantes
    const relevantTerms = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);

    // Análisis de sentimiento simple
    const positiveWords = new Set(['nuevo', 'original', 'garantía', 'oferta', 'premium']);
    const negativeWords = new Set(['usado', 'roto', 'defecto', 'viejo', 'dañado']);
    
    let sentiment = 0;
    words.forEach(word => {
      if (positiveWords.has(word)) sentiment++;
      if (negativeWords.has(word)) sentiment--;
    });

    return {
      relevantTerms,
      frequency,
      sentiment: sentiment / words.length
    };
  }

  // Métodos auxiliares
  private calculatePriceElasticity(prices: number[], sales: number[]): number {
    const avgPrice = ss.mean(prices);
    const avgSales = ss.mean(sales);
    
    // Calcular cambio porcentual
    const priceChanges = prices.map((p, i) => 
      i > 0 ? (p - prices[i-1]) / prices[i-1] : 0
    ).slice(1);
    
    const salesChanges = sales.map((s, i) => 
      i > 0 ? (s - sales[i-1]) / sales[i-1] : 0
    ).slice(1);

    // Elasticidad promedio
    const elasticities = priceChanges.map((p, i) => 
      p !== 0 ? salesChanges[i] / p : 0
    );

    return ss.mean(elasticities.filter(e => !isNaN(e) && isFinite(e)));
  }

  private detectSeasonality(data: number[]): boolean {
    if (data.length < 4) return false;

    // Calcular autocorrelación simple
    const mean = ss.mean(data);
    const variance = ss.variance(data);
    
    const lag = Math.floor(data.length / 4);
    let autocorr = 0;
    
    for (let i = 0; i < data.length - lag; i++) {
      autocorr += (data[i] - mean) * (data[i + lag] - mean);
    }
    
    autocorr /= (data.length - lag) * variance;
    
    return Math.abs(autocorr) > 0.7;
  }

  private getSegmentName(id: number): string {
    const names = [
      'Premium',
      'Mid-Market',
      'Value'
    ];
    return names[id] || `Segment ${id + 1}`;
  }
}

// Exportar instancia singleton
export const marketAnalyzer = new MarketAnalyzer();