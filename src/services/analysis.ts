import * as tf from '@tensorflow/tfjs';
import { KMeans } from 'ml-kmeans';
import { Matrix } from 'ml-matrix';
import { SimpleLinearRegression } from 'ml-regression';
import * as natural from 'natural';
import * as ss from 'simple-statistics';
import regression from 'regression';
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
  private tokenizer: natural.WordTokenizer;
  private sentiment: natural.SentimentAnalyzer;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.sentiment = new natural.SentimentAnalyzer('Spanish', natural.PorterStemmer, 'afinn');
  }

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

  // Segmentación de mercado usando K-means
  segmentMarket(products: Product[], k: number = 3): MarketSegment[] {
    // Preparar datos para clustering
    const features = products.map(p => [
      p.price,
      p.sold_quantity,
      p.available_quantity
    ]);

    const matrix = new Matrix(features);

    // Ejecutar K-means
    const kmeans = new KMeans(k);
    const result = kmeans.predict(matrix);

    // Organizar resultados por segmento
    const segments: MarketSegment[] = Array(k).fill(null).map((_, i) => ({
      id: i,
      name: this.getSegmentName(i),
      products: [],
      centerPrice: 0,
      averageSales: 0
    }));

    // Asignar productos a segmentos
    products.forEach((product, index) => {
      const segmentId = result[index];
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

    // Calcular tendencia usando regresión lineal
    const data = dates.map((date, i) => [date, visits[i]]);
    const result = regression.linear(data);
    const slope = result.equation[0];

    // Detectar estacionalidad
    const seasonality = this.detectSeasonality(visits);

    return {
      trend: slope > 0.05 ? 'up' : slope < -0.05 ? 'down' : 'stable',
      growthRate: slope * 100,
      seasonality
    };
  }

  // Análisis de competencia usando múltiples métricas
  analyzeCompetition(competitors: CompetitorAnalysis[]): {
    topCompetitors: CompetitorAnalysis[];
    marketConcentration: number;
    competitivePressure: 'high' | 'medium' | 'low';
  } {
    // Ordenar competidores por participación de mercado
    const sortedCompetitors = [...competitors].sort((a, b) => b.marketShare - a.marketShare);

    // Calcular índice HHI de concentración de mercado
    const hhi = competitors.reduce((sum, comp) => sum + Math.pow(comp.marketShare, 2), 0);

    // Determinar presión competitiva
    const competitivePressure = hhi > 2500 ? 'low' : hhi > 1500 ? 'medium' : 'high';

    return {
      topCompetitors: sortedCompetitors.slice(0, 5),
      marketConcentration: hhi,
      competitivePressure
    };
  }

  // Análisis de palabras clave y sentimiento
  analyzeKeywords(products: Product[]): KeywordAnalysis {
    const allText = products.map(p => p.title).join(' ');
    const tokens = this.tokenizer.tokenize(allText.toLowerCase());
    
    // Calcular frecuencia de términos
    const frequency: { [key: string]: number } = {};
    tokens.forEach(token => {
      frequency[token] = (frequency[token] || 0) + 1;
    });

    // Identificar términos más relevantes
    const relevantTerms = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);

    // Análisis de sentimiento
    const sentimentScore = this.sentiment.getSentiment(tokens);

    return {
      relevantTerms,
      frequency,
      sentiment: sentimentScore
    };
  }

  // Métodos auxiliares
  private calculatePriceElasticity(prices: number[], sales: number[]): number {
    const avgPrice = ss.mean(prices);
    const avgSales = ss.mean(sales);
    const regression = new SimpleLinearRegression(prices, sales);
    return (regression.slope * avgPrice) / avgSales;
  }

  private detectSeasonality(data: number[]): boolean {
    // Implementación simple de detección de estacionalidad
    // usando autocorrelación
    const lag = Math.floor(data.length / 4);
    const correlation = ss.sampleCorrelation(
      data.slice(0, -lag),
      data.slice(lag)
    );
    return Math.abs(correlation) > 0.7;
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