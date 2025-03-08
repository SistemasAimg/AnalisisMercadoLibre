import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { BarChart3, DollarSign, TrendingUp, Users, AlertCircle, Store, ChevronDown, ChevronUp, ExternalLink, LineChart, BarChart } from 'lucide-react';
import { useQuery } from 'react-query';
import { getMarketAnalysis, searchProducts, Product } from '../services/api';
import { isAuthenticated } from '../services/auth';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface StoreProducts {
  [storeId: number]: {
    isExpanded: boolean;
    products: Product[];
    isLoading: boolean;
  };
}

const MarketInsights: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [showOfficialStoresOnly, setShowOfficialStoresOnly] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [storeProducts, setStoreProducts] = useState<StoreProducts>({});
  
  useEffect(() => {
    const authStatus = isAuthenticated();
    setIsUserAuthenticated(authStatus);
    setShowAuthAlert(!authStatus);
  }, []);
  
  const { 
    data: analysis, 
    isLoading, 
    error 
  } = useQuery(
    ['marketAnalysis', searchQuery, showOfficialStoresOnly],
    () => getMarketAnalysis(searchQuery, showOfficialStoresOnly),
    {
      enabled: !!searchQuery && isUserAuthenticated,
      staleTime: 1000 * 60 * 15,
    }
  );

  const toggleStoreProducts = async (storeId: number) => {
    setStoreProducts(prev => ({
      ...prev,
      [storeId]: {
        isExpanded: !prev[storeId]?.isExpanded,
        products: prev[storeId]?.products || [],
        isLoading: !prev[storeId]?.products.length
      }
    }));

    if (!storeProducts[storeId]?.products.length) {
      try {
        const response = await searchProducts(searchQuery, 50, 0, true);
        const storeProducts = response.results.filter(
          product => product.official_store_id === storeId
        );

        setStoreProducts(prev => ({
          ...prev,
          [storeId]: {
            isExpanded: true,
            products: storeProducts,
            isLoading: false
          }
        }));
      } catch (error) {
        console.error('Error al obtener productos de la tienda:', error);
        setStoreProducts(prev => ({
          ...prev,
          [storeId]: {
            isExpanded: false,
            products: [],
            isLoading: false
          }
        }));
      }
    }
  };

  const priceData = {
    labels: analysis?.priceHistory.map(item => item.date) || [],
    datasets: [
      {
        label: 'Precio promedio',
        data: analysis?.priceHistory.map(item => item.price) || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const getTrendClass = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString();
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
            Busca productos o selecciona una categoría para obtener análisis detallados del mercado.
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
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">
            Análisis de mercado: {searchQuery}
          </h2>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">
            Análisis de mercado: {searchQuery}
          </h2>
        </div>
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showOfficialStoresOnly}
              onChange={(e) => setShowOfficialStoresOnly(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-700">
              Solo Tiendas Oficiales
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <DollarSign size={24} className="text-blue-500" />
            <h3 className="ml-2 text-gray-700 font-medium">Precio promedio</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(analysis.averagePrice)}</p>
          <p className={`text-sm ${getTrendClass(analysis.salesTrend)}`}>
            {formatPercent(analysis.salesTrend)} vs. mes anterior
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <LineChart size={24} className="text-green-500" />
            <h3 className="ml-2 text-gray-700 font-medium">Conversión</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {analysis.marketMetrics.conversionRate.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-600">
            {analysis.marketMetrics.totalSales} ventas de {analysis.marketMetrics.totalViews} vistas
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Users size={24} className="text-purple-500" />
            <h3 className="ml-2 text-gray-700 font-medium">Vendedores</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analysis.totalSellers}</p>
          <p className="text-sm text-gray-600">
            Competencia: {analysis.competitionLevel === 'high' ? 'Alta' : 
                         analysis.competitionLevel === 'medium' ? 'Media' : 'Baja'}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Tendencias históricas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Precios y Ventas</h4>
            <Line 
              data={{
                labels: analysis.priceHistory.map(h => formatDate(h.date)),
                datasets: [
                  {
                    label: 'Precio promedio',
                    data: analysis.priceHistory.map(h => h.price),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y1',
                  },
                  {
                    label: 'Unidades vendidas',
                    data: analysis.priceHistory.map(h => h.soldQuantity),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    yAxisID: 'y2',
                  }
                ]
              }}
              options={{
                responsive: true,
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                scales: {
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                      display: true,
                      text: 'Precio ($)'
                    }
                  },
                  y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: 'Unidades'
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                }
              }}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Visitas diarias</h4>
            <Bar 
              data={{
                labels: analysis.marketMetrics.visits.map(v => formatDate(v.date)),
                datasets: [{
                  label: 'Visitas',
                  data: analysis.marketMetrics.visits.map(v => v.total),
                  backgroundColor: 'rgba(99, 102, 241, 0.5)',
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {analysis.officialStores.total > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Tiendas Oficiales</h3>
          <div className="space-y-4">
            {analysis.officialStores.stores.map(store => (
              <div key={store.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800">{store.name}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      <span>{store.productsCount} productos</span>
                      <span className="mx-2">•</span>
                      <span>Precio promedio: {formatPrice(store.averagePrice)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Métricas de la tienda</p>
                    <div className="text-sm text-gray-600">
                      <p>Ventas últimos 60 días: {store.metrics.sales}</p>
                      <p>Calificación: {store.metrics.rating.toFixed(1)}/5</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => toggleStoreProducts(store.id)}
                  className="w-full flex items-center justify-between mt-4"
                >
                  <div>
                    {storeProducts[store.id]?.isExpanded ? (
                      <ChevronUp size={20} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-500" />
                    )}
                  </div>
                </button>

                {storeProducts[store.id]?.isExpanded && (
                  <div className="mt-4 border-t pt-4">
                    {storeProducts[store.id]?.isLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : storeProducts[store.id]?.products.length > 0 ? (
                      <div className="space-y-4">
                        {storeProducts[store.id].products.map(product => (
                          <div key={product.id} className="flex items-start space-x-4 p-2 hover:bg-gray-50 rounded-lg">
                            <img 
                              src={product.thumbnail.replace('http://', 'https://')}
                              alt={product.title}
                              className="w-20 h-20 object-contain rounded"
                            />
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-800">{product.title}</h5>
                              <p className="text-lg font-bold text-gray-900 mt-1">
                                {formatPrice(product.price)}
                              </p>
                              <div className="flex items-center mt-2">
                                <span className="text-sm text-gray-600 mr-4">
                                  Stock: {product.available_quantity}
                                </span>
                                <span className="text-sm text-gray-600">
                                  Vendidos: {product.sold_quantity}
                                </span>
                              </div>
                            </div>
                            <a 
                              href={product.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink size={18} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-600 py-4">
                        No se encontraron productos para esta tienda
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Distribución de precios</h3>
          <div className="space-y-4">
            {analysis.priceDistribution.map((range, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formatPrice(Number(range.range.split(' - ')[0]))} - {formatPrice(Number(range.range.split(' - ')[1]))}</span>
                  <span>{range.count} productos</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${range.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Top Vendedores</h3>
          <div className="space-y-3">
            {analysis.topSellers.map((seller) => (
              <div key={seller.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{seller.nickname}</p>
                    <p className="text-sm text-gray-600">
                      Ventas: {seller.salesCount} | Reputación: {seller.reputation.level_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Transacciones completadas: {seller.reputation.transactions.completed}
                    </p>
                    <div className="flex items-center justify-end mt-1">
                      <span className="text-green-600 text-xs">
                        {seller.reputation.transactions.ratings.positive}% positivas
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Recomendaciones</h3>
        <ul className="space-y-2 text-gray-700">
          {analysis.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
              {recommendation}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MarketInsights;