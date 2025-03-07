import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Search, TrendingUp, Package, Star, DollarSign, ShoppingCart } from 'lucide-react';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Tipos
interface Product {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  thumbnail: string;
  condition: string;
  permalink: string;
  seller_id: number;
}

interface Trend {
  keyword: string;
  url: string;
}

interface Category {
  id: string;
  name: string;
}

interface MarketAnalysis {
  averagePrice: number;
  totalItems: number;
  totalSellers: number;
  priceRange: {
    min: number;
    max: number;
  };
  conditionDistribution: {
    new: number;
    used: number;
  };
  priceHistory: { date: string; price: number }[];
  visits: { daily: number; weekly: number; monthly: number; total: number };
  priceDistribution: { range: string; percentage: number }[];
  topSellers: { id: string; nickname: string; salesCount: number; reputation: number; level: number }[];
  officialStores: { total: number; percentage: number; stores: { id: string; name: string; productsCount: number; averagePrice: number }[] };
  marketMetrics: { topProvinces: { id: string; name: string; itemsCount: number; averagePrice: number }[] };
  trends: { keyword: string; itemsCount: number; averagePrice: number }[];
}

const MarketInsights: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query para análisis de mercado
  const { data: marketAnalysis, isLoading: analysisLoading } = useQuery<MarketAnalysis>(
    ['marketAnalysis', searchTerm, selectedCategory],
    async () => {
      if (!searchTerm && !selectedCategory) return null;
      setIsLoading(true);
      setError(null);
      try {
        const analysis = await getMarketAnalysis(searchTerm || selectedCategory);
        setAnalysis(analysis);
        return analysis;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al obtener análisis de mercado');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    {
      enabled: !!searchTerm || !!selectedCategory,
      staleTime: 1000 * 60 * 5, // 5 minutos
    }
  );

  // Query para categorías
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>(
    'categories',
    async () => {
      const response = await axios.get('/api/proxy/categories');
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 60 * 24, // 24 horas
    }
  );

  // Gráfico de precios
  const priceChartData = {
    labels: marketAnalysis?.priceHistory.map(item => new Date(item.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Historial de Precios',
        data: marketAnalysis?.priceHistory.map(item => item.price) || [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  // Gráfico de visitas
  const visitsChartData = {
    labels: ['Diarias', 'Semanales', 'Mensuales'],
    datasets: [
      {
        label: 'Visitas',
        data: marketAnalysis ? [
          marketAnalysis.visits.daily,
          marketAnalysis.visits.weekly,
          marketAnalysis.visits.monthly
        ] : [],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      }
    ]
  };

  // Gráfico de distribución de precios
  const priceDistributionData = {
    labels: marketAnalysis?.priceDistribution.map(item => item.range) || [],
    datasets: [
      {
        label: 'Distribución de Precios',
        data: marketAnalysis?.priceDistribution.map(item => item.percentage) || [],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      }
    ]
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Análisis de Mercado</h1>
      
      {/* Búsqueda y Filtros */}
      <div className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Todas las categorías</option>
            {categories?.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      )}

      {marketAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Métricas Principales */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Métricas Principales</h2>
            <div className="space-y-2">
              <p>Precio Promedio: ${marketAnalysis.averagePrice.toFixed(2)}</p>
              <p>Rango de Precios: ${marketAnalysis.priceRange.min.toFixed(2)} - ${marketAnalysis.priceRange.max.toFixed(2)}</p>
              <p>Total de Vendedores: {marketAnalysis.totalSellers}</p>
              <p>Total de Listados: {marketAnalysis.totalListings}</p>
            </div>
          </div>

          {/* Visitas */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Visitas</h2>
            <div className="h-64">
              <Bar data={visitsChartData} options={{ maintainAspectRatio: false }} />
            </div>
            <div className="mt-4 space-y-2">
              <p>Total de Visitas: {marketAnalysis.visits.total}</p>
              <p>Promedio por Producto: {marketAnalysis.visits.daily}</p>
            </div>
          </div>

          {/* Historial de Precios */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Historial de Precios</h2>
            <div className="h-64">
              <Line data={priceChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Distribución de Precios */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Distribución de Precios</h2>
            <div className="h-64">
              <Bar data={priceDistributionData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Top Vendedores */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Top Vendedores</h2>
            <div className="space-y-4">
              {marketAnalysis.topSellers.slice(0, 5).map(seller => (
                <div key={seller.id} className="border-b pb-2">
                  <p className="font-semibold">{seller.nickname}</p>
                  <p>Ventas: {seller.salesCount}</p>
                  <p>Reputación: {seller.reputation}</p>
                  <p>Nivel: {seller.level}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tiendas Oficiales */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Tiendas Oficiales</h2>
            <div className="space-y-4">
              <p>Total: {marketAnalysis.officialStores.total}</p>
              <p>Porcentaje: {marketAnalysis.officialStores.percentage.toFixed(1)}%</p>
              {marketAnalysis.officialStores.stores.slice(0, 3).map(store => (
                <div key={store.id} className="border-b pb-2">
                  <p className="font-semibold">{store.name}</p>
                  <p>Productos: {store.productsCount}</p>
                  <p>Precio Promedio: ${store.averagePrice.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Provincias */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Top Provincias</h2>
            <div className="space-y-4">
              {marketAnalysis.marketMetrics.topProvinces.map(province => (
                <div key={province.id} className="border-b pb-2">
                  <p className="font-semibold">{province.name}</p>
                  <p>Productos: {province.itemsCount}</p>
                  <p>Precio Promedio: ${province.averagePrice.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tendencias */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Tendencias</h2>
            <div className="space-y-4">
              {marketAnalysis.trends.slice(0, 5).map(trend => (
                <div key={trend.keyword} className="border-b pb-2">
                  <p className="font-semibold">{trend.keyword}</p>
                  <p>Productos: {trend.itemsCount}</p>
                  <p>Precio Promedio: ${trend.averagePrice.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketInsights; 