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
}

const MarketInsights: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);

  // Query para tendencias
  const { data: trends, isLoading: trendsLoading } = useQuery<Trend[]>(
    'trends',
    async () => {
      const response = await axios.get('/api/proxy/trends');
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 60, // 1 hora
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

  // Query para búsqueda de productos
  const { data: searchResults, isLoading: searchLoading } = useQuery<{ results: Product[], paging: { total: number } }>(
    ['search', searchTerm, selectedCategory],
    async () => {
      if (!searchTerm && !selectedCategory) return { results: [], paging: { total: 0 } };
      
      const response = await axios.get('/api/proxy/search', {
        params: {
          q: searchTerm,
          category: selectedCategory,
          limit: 50
        }
      });
      return response.data;
    },
    {
      enabled: !!searchTerm || !!selectedCategory,
      staleTime: 1000 * 60 * 5, // 5 minutos
    }
  );

  // Analizar datos del mercado
  useEffect(() => {
    if (searchResults?.results) {
      const products = searchResults.results;
      const prices = products.map(p => p.price);
      
      const analysis: MarketAnalysis = {
        averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        totalItems: products.length,
        totalSellers: new Set(products.map(p => p.seller_id)).size,
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices)
        },
        conditionDistribution: {
          new: products.filter(p => p.condition === 'new').length,
          used: products.filter(p => p.condition === 'used').length
        }
      };
      
      setAnalysis(analysis);
    }
  }, [searchResults]);

  // Datos para el gráfico de precios
  const priceChartData = {
    labels: searchResults?.results.map(p => p.title.substring(0, 20) + '...') || [],
    datasets: [
      {
        label: 'Precios',
        data: searchResults?.results.map(p => p.price) || [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  // Datos para el gráfico de condición
  const conditionChartData = {
    labels: ['Nuevo', 'Usado'],
    datasets: [
      {
        data: analysis ? [analysis.conditionDistribution.new, analysis.conditionDistribution.used] : [0, 0],
        backgroundColor: ['rgb(75, 192, 192)', 'rgb(255, 99, 132)']
      }
    ]
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Análisis de Mercado</h1>

      {/* Búsqueda y Filtros */}
      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Tendencias */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <TrendingUp className="mr-2" size={24} />
          Tendencias
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trends?.map(trend => (
            <a
              key={trend.keyword}
              href={trend.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-gray-800">{trend.keyword}</h3>
            </a>
          ))}
        </div>
      </div>

      {/* Análisis de Mercado */}
      {analysis && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Análisis de Mercado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="flex items-center mb-2">
                <DollarSign className="mr-2 text-green-500" size={24} />
                <h3 className="font-medium text-gray-800">Precio Promedio</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${analysis.averagePrice.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="flex items-center mb-2">
                <Package className="mr-2 text-blue-500" size={24} />
                <h3 className="font-medium text-gray-800">Total de Productos</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.totalItems}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="flex items-center mb-2">
                <ShoppingCart className="mr-2 text-purple-500" size={24} />
                <h3 className="font-medium text-gray-800">Vendedores</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.totalSellers}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <div className="flex items-center mb-2">
                <Star className="mr-2 text-yellow-500" size={24} />
                <h3 className="font-medium text-gray-800">Rango de Precios</h3>
              </div>
              <p className="text-sm text-gray-600">
                Min: ${analysis.priceRange.min.toLocaleString()}
                <br />
                Max: ${analysis.priceRange.max.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribución de Precios</h2>
          <Line data={priceChartData} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribución por Condición</h2>
          <Bar data={conditionChartData} />
        </div>
      </div>

      {/* Lista de Productos */}
      {searchResults?.results && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Productos Encontrados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.results.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-lg shadow">
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="w-full h-48 object-contain mb-4"
                />
                <h3 className="font-medium text-gray-800 mb-2">{product.title}</h3>
                <p className="text-xl font-bold text-gray-900 mb-2">
                  ${product.price.toLocaleString()}
                </p>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Stock: {product.available_quantity}</span>
                  <span>Vendidos: {product.sold_quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketInsights; 