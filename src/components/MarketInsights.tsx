import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart3, DollarSign, TrendingUp, Users, AlertCircle, Store, 
  Filter, X, Activity, ShoppingCart, Search, Award, Target, Truck,
  Brain, TrendingDown, Zap, LineChart
} from 'lucide-react';
import { useQuery } from 'react-query';
import { getMarketAnalysis, searchProducts, Product, FilterOptions } from '../services/api';
import { isAuthenticated } from '../services/auth';
import { marketAnalyzer } from '../services/analysis';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const MarketInsights: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date() 
  });
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: undefined,
    maxPrice: undefined,
    condition: 'all',
    officialStoresOnly: false,
    minSales: undefined
  });

  const { data: searchResults, isLoading: isSearching } = useQuery(
    ['searchProducts', searchQuery, filters],
    () => searchProducts(searchQuery, filters),
    {
      enabled: !!searchQuery && isUserAuthenticated,
      onSuccess: (data) => {
        const garminProduct = data.results.find(p => p.seller.id === 225076335);
        if (garminProduct && !selectedProduct) {
          setSelectedProduct(garminProduct);
        } else if (data.results.length > 0 && !selectedProduct) {
          setSelectedProduct(data.results[0]);
        }
      }
    }
  );

  const { 
    data: analysis, 
    isLoading: isAnalyzing,
    error 
  } = useQuery(
    ['marketAnalysis', selectedProduct?.id, dateRange, filters],
    () => selectedProduct ? getMarketAnalysis(selectedProduct, dateRange, filters) : null,
    {
      enabled: !!selectedProduct && isUserAuthenticated
    }
  );

  // Análisis avanzado usando ML
  const [mlAnalysis, setMlAnalysis] = useState<{
    priceAnalysis: any;
    segments: any[];
    trends: any;
    keywords: any;
  } | null>(null);

  useEffect(() => {
    const performAdvancedAnalysis = async () => {
      if (searchResults?.results && analysis) {
        const products = searchResults.results;
        
        // Análisis de precios con ML
        const priceAnalysis = await marketAnalyzer.analyzePrices(products);
        
        // Segmentación de mercado
        const segments = marketAnalyzer.segmentMarket(products);
        
        // Análisis de tendencias
        const trends = marketAnalyzer.analyzeTrends(analysis.visitHistory);
        
        // Análisis de keywords
        const keywords = marketAnalyzer.analyzeKeywords(products);

        setMlAnalysis({
          priceAnalysis,
          segments,
          trends,
          keywords
        });
      }
    };

    performAdvancedAnalysis();
  }, [searchResults, analysis]);

  React.useEffect(() => {
    const authStatus = isAuthenticated();
    setIsUserAuthenticated(authStatus);
    setShowAuthAlert(!authStatus);
  }, []);

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return 'No disponible';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), "d 'de' MMMM", { locale: es });
  };

  if (!searchQuery) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">
            Análisis de mercado
          </h2>
        </div>
        
        <div className="text-center py-12">
          <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-800 mb-2">
            Realiza una búsqueda para ver análisis
          </h3>
          <p className="text-gray-600">
            Busca productos para obtener análisis detallados del mercado.
          </p>
        </div>
      </div>
    );
  }

  if (showAuthAlert) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">
            Análisis de mercado: {searchQuery}
          </h2>
        </div>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start">
            <AlertCircle size={24} className="text-yellow-500 mr-3 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-yellow-800">Autenticación requerida</h3>
              <p className="text-yellow-700 mt-1">
                Para acceder a análisis de mercado avanzados, necesitas iniciar sesión con tu cuenta de MercadoLibre.
              </p>
              <button 
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => window.location.href = '/auth'}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSearching || isAnalyzing) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2  className="text-xl font-bold text-gray-800">
            Análisis de mercado: {searchQuery}
          </h2>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !analysis || !mlAnalysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">
            Análisis de mercado: {searchQuery}
          </h2>
        </div>
        
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle size={24} className="text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error al obtener análisis</h3>
              <p className="text-red-700 mt-1">
                No pudimos obtener el análisis de mercado para esta búsqueda. Por favor, intenta con otra búsqueda o más tarde.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BarChart3 size={24} className="text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-800">
              Análisis de mercado: {searchQuery}
            </h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter size={18} className="mr-2" />
            Filtros
          </button>
        </div>

        {!analysis.isGarminProduct && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle size={24} className="text-yellow-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-yellow-800">Producto no disponible en Garmin Argentina</h3>
                <p className="text-yellow-700 mt-1">
                  Este producto no está disponible en la tienda oficial de Garmin Argentina.
                  Las métricas mostradas son informativas del mercado general.
                </p>
              </div>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Filtros de análisis</h3>
              <button
                onClick={() => {
                  setFilters({
                    minPrice: undefined,
                    maxPrice: undefined,
                    condition: 'all',
                    officialStoresOnly: false,
                    minSales: undefined
                  });
                }}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <X size={16} className="mr-1" />
                Resetear filtros
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rango de precios
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={filters.minPrice || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      minPrice: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Máx"
                    value={filters.maxPrice || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      maxPrice: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición
                </label>
                <select
                  value={filters.condition}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    condition: e.target.value as 'all' | 'new' | 'used'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="new">Nuevo</option>
                  <option value="used">Usado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ventas mínimas
                </label>
                <input
                  type="number"
                  placeholder="Mínimo de ventas"
                  value={filters.minSales || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minSales: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={filters.officialStoresOnly}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    officialStoresOnly: e.target.checked
                  }))}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-gray-700">Solo tiendas oficiales</span>
              </label>
            </div>
          </div>
        )}

        {/* Análisis de ML */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-blue-800 mb-4 flex items-center">
            <Brain size={20} className="text-blue-600 mr-2" />
            Análisis Predictivo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Predicción de Precios</h4>
              <p className="text-blue-600">
                Precio óptimo sugerido: {formatCurrency(mlAnalysis.priceAnalysis.predictedPrice)}
              </p>
              <p className="text-sm text-blue-500">
                Confianza: {(mlAnalysis.priceAnalysis.confidence * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Tendencia del Mercado</h4>
              <div className="flex items-center">
                {mlAnalysis.trends.trend === 'up' ? (
                  <TrendingUp size={20} className="text-green-500 mr-2" />
                ) : mlAnalysis.trends.trend === 'down' ? (
                  <TrendingDown size={20} className="text-red-500 mr-2" />
                ) : (
                  <LineChart size={20} className="text-blue-500 mr-2" />
                )}
                <span className="text-blue-600">
                  {mlAnalysis.trends.trend === 'up' ? 'En alza' :
                   mlAnalysis.trends.trend === 'down' ? 'En baja' : 'Estable'}
                  {' '}({mlAnalysis.trends.growthRate.toFixed(1)}%)
                </span>
              </div>
              {mlAnalysis.trends.seasonality && (
                <p className="text-sm text-blue-500 mt-1">
                  Se detectó patrón estacional
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <DollarSign size={24} className="text-blue-500" />
              <h3 className="ml-2 text-gray-700 font-medium">Precio promedio</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analysis.averagePrice)}</p>
            {analysis.isGarminProduct && (
              <p className={`text-sm ${analysis.priceTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.priceTrend >= 0 ? '+' : ''}{analysis.priceTrend.toFixed(1)}% vs. promedio del mercado
              </p>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Store size={24} className="text-green-500" />
              <h3 className="ml-2 text-gray-700 font-medium">Tiendas Oficiales</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analysis.officialStores}</p>
            <p className="text-sm text-gray-600">
              {analysis.officialStorePercentage.toFixed(1)}% del mercado
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Activity size={24} className="text-purple-500" />
              <h3 className="ml-2 text-gray-700 font-medium">Tasa de Conversión</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {analysis.performanceMetrics.conversionRate === null ? 
                'Sin datos' : 
                `${analysis.performanceMetrics.conversionRate.toFixed(1)}%`}
            </p>
            <p className="text-sm text-gray-600">
              Ventas / Visitas
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Target size={24} className="text-red-500" />
              <h3 className="ml-2 text-gray-700 font-medium">Sell-through Rate</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {analysis.performanceMetrics.sellThroughRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">
              Vendidos / Total disponible
            </p>
          </div>
        </div>

        {/* Segmentación de Mercado */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <Zap size={20} className="text-yellow-500 mr-2" />
            Segmentación de Mercado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mlAnalysis.segments.map((segment) => (
              <div key={segment.id} className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-medium text-gray-800 mb-2">{segment.name}</h4>
                <p className="text-gray-600">Precio promedio: {formatCurrency(segment.centerPrice)}</p>
                <p className="text-gray-600">Ventas promedio: {segment.averageSales.toFixed(0)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {segment.products.length} productos en este segmento
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <TrendingUp size={20} className="text-blue-500 mr-2" />
              Visitas Diarias
            </h3>
            <Line 
              data={{
                labels: analysis.visitHistory.map(item => formatDate(item.date)),
                datasets: [{
                  label: 'Visitas',
                  data: analysis.visitHistory.map(item => item.total),
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top'
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => `Visitas: ${context.raw}`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Número de visitas'
                    }
                  }
                }
              }}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Users size={20} className="text-green-500 mr-2" />
              Análisis de Competencia
            </h3>
            <div className="space-y-4">
              {analysis.competitorAnalysis.slice(0, 5).map((competitor, index) => (
                <div key={index} className="border-b border-gray-200 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{competitor.nickname}</p>
                      <p className="text-sm text-gray-600">
                        {competitor.totalListings} publicaciones
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-800">
                        {formatCurrency(competitor.averagePrice)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {competitor.marketShare.toFixed(1)}% share
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Truck size={14} className="mr-1" />
                      {competitor.shippingStrategy.freeShippingPercentage.toFixed(1)}% envío gratis
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <Award size={20} className="text-yellow-500 mr-2" />
            Oportunidad de Mercado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Factores de Oportunidad</h4>
              <ul className="space-y-2">
                {analysis.marketOpportunity.factors.map((factor, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Potencial de Ingresos</h4>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.marketOpportunity.potentialRevenue)}
              </p>
              <p className="text-sm text-gray-600">Estimación anual</p>
            </div>
          </div>
        </div>

        {/* Palabras Clave y SEO */}
        <div className="bg-gray-50 p-4 rounded-lg mt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <Search size={20} className="text-purple-500 mr-2" />
            Análisis de Palabras Clave
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Términos Relevantes</h4>
              <div className="flex flex-wrap gap-2">
                {mlAnalysis.keywords.relevantTerms.map((term: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Análisis de Sentimiento</h4>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  mlAnalysis.keywords.sentiment > 0 ? 'bg-green-500' :
                  mlAnalysis.keywords.sentiment < 0 ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}></div>
                <span className="text-gray-600">
                  {mlAnalysis.keywords.sentiment > 0 ? 'Positivo' :
                   mlAnalysis.keywords.sentiment < 0 ? 'Negativo' :
                   'Neutral'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {analysis.recommendations.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <h3 className="text-lg font-medium text-blue-800 mb-4">Recomendaciones</h3>
            <ul className="space-y-2">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start text-blue-700">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketInsights