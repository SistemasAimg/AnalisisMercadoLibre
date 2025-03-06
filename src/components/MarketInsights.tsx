import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Store, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Filter,
  Calendar,
  Sliders
} from 'lucide-react';
import { useQuery } from 'react-query';
import { getMarketAnalysis, searchProducts, Product } from '../services/api';
import { isAuthenticated } from '../services/auth';

/* 
  Registro de componentes de Chart.js
*/
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/*
  Interfaz para manejar los productos de cada tienda (como antes).
*/
interface StoreProducts {
  [storeId: number]: {
    isExpanded: boolean;
    products: Product[];
    isLoading: boolean;
  };
}

/*
  Nueva interfaz de filtros y rangos de fecha para la búsqueda/análisis.
*/
interface AnalysisFilters {
  excludeKeywords: string[];    // Palabras clave a excluir
  onlyKeywords: string[];       // Palabras clave obligatorias
  dateRange?: {
    from: string; // Fecha de inicio
    to: string;   // Fecha de fin
  };
  brand?: string; // Por ejemplo, "Garmin" o "Tacx" o "Garmin Argentina"
}

const MarketInsights: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  /*
    Nuevos estados:
    - showFilters: para mostrar/ocultar panel de filtros
    - filters: objeto que contiene las condiciones de filtrado
  */
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AnalysisFilters>({
    excludeKeywords: [],
    onlyKeywords: [],
    dateRange: undefined,
    brand: 'Garmin'  // o "Garmin Argentina"
  });

  const [showOfficialStoresOnly, setShowOfficialStoresOnly] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [storeProducts, setStoreProducts] = useState<StoreProducts>({});

  /*
    Efecto para chequear autenticación
  */
  useEffect(() => {
    const authStatus = isAuthenticated();
    setIsUserAuthenticated(authStatus);
    setShowAuthAlert(!authStatus);
  }, []);

  /*
    Llamada principal de React Query para análisis de mercado
    - He modificado la función getMarketAnalysis para incluirle los filters 
      como segundo parámetro. (Necesitarás ajustar getMarketAnalysis en tu archivo api.ts 
      para que acepte y maneje el nuevo objeto filters).
    - showOfficialStoresOnly también se pasa para indicar si queremos filtrar 
      únicamente tiendas oficiales.
  */
  const { 
    data: analysis, 
    isLoading, 
    error 
  } = useQuery(
    ['marketAnalysis', searchQuery, showOfficialStoresOnly, filters],
    () => getMarketAnalysis(searchQuery, showOfficialStoresOnly, filters),
    {
      enabled: !!searchQuery && isUserAuthenticated,
      staleTime: 1000 * 60 * 15,
    }
  );

  /*
    Función para alternar productos de tienda oficial
  */
  const toggleStoreProducts = async (storeId: number) => {
    setStoreProducts(prev => ({
      ...prev,
      [storeId]: {
        isExpanded: !prev[storeId]?.isExpanded,
        products: prev[storeId]?.products || [],
        isLoading: !prev[storeId]?.products.length
      }
    }));

    /*
      Nota: si no hay productos cargados antes, se hace la búsqueda.
      Asegúrate de modificar searchProducts() para que respete filters o brand, si lo deseas.
    */
    if (!storeProducts[storeId]?.products.length) {
      try {
        const response = await searchProducts(searchQuery, 50, 0, true); 
        const storeProductsList = response.results.filter(
          product => product.official_store_id === storeId
        );

        setStoreProducts(prev => ({
          ...prev,
          [storeId]: {
            isExpanded: true,
            products: storeProductsList,
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

  /* 
    Data para el gráfico de precios en el tiempo
  */
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

  /* 
    Funciones auxiliares de formato, mismas que tenías antes
  */
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

  /*
    Panel de Filtros:
    - excludeKeywords
    - onlyKeywords
    - dateRange (from, to)
    - brand
  */
  const handleToggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleFilterChange = (field: keyof AnalysisFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /*
    HTML principal
  */
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

  /*
    HTML principal de resultados
  */
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Encabezado con botón de Filtros */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">
            Análisis de mercado: {searchQuery}
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showOfficialStoresOnly}
              onChange={(e) => setShowOfficialStoresOnly(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-700">
              Solo Oficiales
            </span>
          </label>

          {/* Botón para mostrar/ocultar el panel de filtros */}
          <button
            onClick={handleToggleFilters}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter size={18} className="mr-2" />
            Filtros
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center">
            <Sliders size={18} className="mr-2" /> Configurar filtros
          </h3>
          
          {/* Marca / Brand */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca principal</label>
            <input
              type="text"
              value={filters.brand || ''}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              placeholder="Ej: Garmin, Tacx, etc."
            />
          </div>
          
          {/* Exclude Keywords */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Excluir palabras clave</label>
            <textarea
              value={filters.excludeKeywords.join(', ')}
              onChange={(e) => handleFilterChange('excludeKeywords', e.target.value.split(',').map(s => s.trim()))}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full h-16 resize-none"
              placeholder="Ingresa palabras separadas por coma, ej: repuesto, fundas"
            />
          </div>

          {/* Only Keywords */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Incluir solo palabras clave</label>
            <textarea
              value={filters.onlyKeywords.join(', ')}
              onChange={(e) => handleFilterChange('onlyKeywords', e.target.value.split(',').map(s => s.trim()))}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full h-16 resize-none"
              placeholder="Ingresa palabras separadas por coma, ej: 'neo bike'"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Calendar size={16} className="mr-1" /> Desde
              </label>
              <input
                type="date"
                value={filters.dateRange?.from || ''}
                onChange={(e) => handleFilterChange('dateRange', { 
                  ...(filters.dateRange || {}), 
                  from: e.target.value 
                })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Calendar size={16} className="mr-1" /> Hasta
              </label>
              <input
                type="date"
                value={filters.dateRange?.to || ''}
                onChange={(e) => handleFilterChange('dateRange', { 
                  ...(filters.dateRange || {}), 
                  to: e.target.value 
                })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
              />
            </div>
          </div>

          {/* Instrucción breve */}
          <p className="text-sm text-gray-500">
            Estos filtros afectarán la próxima recarga del análisis. Si cambias algo, se hará una nueva consulta.
          </p>
        </div>
      )}

      {/* Sección de datos una vez que analysis está disponible */}
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
            <Store size={24} className="text-green-500" />
            <h3 className="ml-2 text-gray-700 font-medium">Tiendas Oficiales</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analysis.officialStores.total}</p>
          <p className="text-sm text-gray-600">
            {analysis.officialStores.percentage.toFixed(1)}% del mercado
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <Users size={24} className="text-purple-500" />
            <h3 className="ml-2 text-gray-700 font-medium">Total Vendedores</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analysis.totalSellers}</p>
          <p className="text-sm text-gray-600">
            Competencia: {analysis.competitionLevel === 'high' ? 'Alta' : 
                         analysis.competitionLevel === 'medium' ? 'Media' : 'Baja'}
          </p>
        </div>
      </div>

      {analysis.officialStores.total > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Tiendas Oficiales</h3>
          <div className="space-y-4">
            {analysis.officialStores.stores.map(store => (
              <div key={store.id} className="bg-white p-4 rounded-lg shadow-sm">
                <button 
                  onClick={() => toggleStoreProducts(store.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-medium text-gray-800">{store.name}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      <span>{store.productsCount} productos</span>
                      <span className="mx-2">•</span>
                      <span>Precio promedio: {formatPrice(store.averagePrice)}</span>
                    </div>
                  </div>
                  {storeProducts[store.id]?.isExpanded ? (
                    <ChevronUp size={20} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-500" />
                  )}
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

      {/* Gráfico de precios en el tiempo */}
      <div className="mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Tendencia de precios</h3>
          <Line options={options} data={priceData} />
        </div>
      </div>

      {/* Distribución de precios y top sellers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Distribución de precios</h3>
          <div className="space-y-4">
            {analysis.priceDistribution.map((range, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{range.range}</span>
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
              <div key={seller.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                <div>
                  <p className="font-medium text-gray-800">{seller.nickname}</p>
                  <p className="text-sm text-gray-600">Ventas: {seller.salesCount}</p>
                </div>
                {seller.isOfficialStore && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Tienda Oficial
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
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
