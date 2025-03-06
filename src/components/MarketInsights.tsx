import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
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
  ExternalLink
} from 'lucide-react';

import { isAuthenticated } from '../services/auth';
import { 
  getMarketAnalysis, 
  searchProducts, 
  Product 
} from '../services/api'; 
import ProductSelector from '../components/ProductSelector';    // Ajusta la ruta
import DateRangePicker from '../components/DateRangePicker';    // Ajusta la ruta

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * Para expansion de productos en cada tienda oficial
 */
interface StoreProducts {
  [storeId: number]: {
    isExpanded: boolean;
    products: Product[];
    isLoading: boolean;
  };
}

/**
 * Definimos el state para el rango de fechas
 */
interface DateRange {
  start: Date;
  end: Date;
}

const MarketInsights: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  // Estado de si se filtra "solo tiendas oficiales"
  const [showOfficialStoresOnly, setShowOfficialStoresOnly] = useState(false);

  // Autenticación
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);

  // Control de expansión por tienda oficial
  const [storeProducts, setStoreProducts] = useState<StoreProducts>({});

  // Producto seleccionado manualmente
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Rango de fechas
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Por ejemplo, últimos 6 meses
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    return { start, end };
  });

  // 1) Comprobar autenticación al montar
  useEffect(() => {
    const authStatus = isAuthenticated();
    setIsUserAuthenticated(authStatus);
    setShowAuthAlert(!authStatus);
  }, []);

  // 2) Buscar productos (para el ProductSelector) basados en searchQuery
  //    para que el usuario escoja el que realmente quiere analizar.
  const {
    data: searchData,
    isLoading: isSearching
  } = useQuery(
    ['searchProducts', searchQuery],
    () => searchProducts(searchQuery),
    {
      enabled: !!searchQuery && isUserAuthenticated,
      staleTime: 60_000
    }
  );

  // 3) Llamar a getMarketAnalysis con el producto elegido + rango de fechas
  const {
    data: analysis,
    isLoading: isAnalyzing,
    error
  } = useQuery(
    ['marketAnalysis', selectedProduct?.id, dateRange, showOfficialStoresOnly],
    () =>
      selectedProduct
        ? getMarketAnalysis(selectedProduct, dateRange, showOfficialStoresOnly)
        : null,
    {
      enabled: !!selectedProduct && isUserAuthenticated,
      staleTime: 1000 * 60 * 15
    }
  );

  const isLoadingData = isSearching || isAnalyzing;

  /**
   * Manejo del toggle "solo tiendas oficiales"
   */
  const handleOfficialStoresToggle = (checked: boolean) => {
    setShowOfficialStoresOnly(checked);
  };

  /**
   * Al expandir/cerrar una tienda oficial
   */
  const toggleStoreProducts = async (storeId: number) => {
    setStoreProducts((prev) => ({
      ...prev,
      [storeId]: {
        isExpanded: !prev[storeId]?.isExpanded,
        products: prev[storeId]?.products || [],
        isLoading: !prev[storeId]?.products.length
      }
    }));

    // Solo buscar si no hay productos en cache
    if (!storeProducts[storeId]?.products.length) {
      try {
        // Nota: esto llama con 'searchQuery', pero
        // en realidad quizá querrías filtrar la misma categoría
        // o algo distinto. Ajusta a tu necesidad.
        const response = await searchProducts(searchQuery, 50, 0, true);
        const prods = response.results.filter((p) => p.official_store_id === storeId);

        setStoreProducts((prev) => ({
          ...prev,
          [storeId]: {
            isExpanded: true,
            products: prods,
            isLoading: false
          }
        }));
      } catch (error) {
        console.error('Error al obtener productos de la tienda:', error);
        setStoreProducts((prev) => ({
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

  /**
   * Preparar datos para el gráfico
   * Se asume analysis.priceHistory = { date, price, sales }
   */
  const chartData = {
    labels: analysis?.priceHistory.map((item) => item.date) || [],
    datasets: [
      {
        label: 'Precio (ARS)',
        data: analysis?.priceHistory.map((item) => item.price) || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)'
      },
      {
        label: 'Ventas (unidades)',
        data: analysis?.priceHistory.map((item) => item.sales) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const
      }
    },
    scales: {
      // Ejemplo: dual axis, etc. Ajusta a tu gusto.
      y: {
        beginAtZero: false
      }
    }
  };

  // Format helpers
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);

  const getTrendClass = (value: number) => (value >= 0 ? 'text-green-600' : 'text-red-600');

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // 1) Si no hay searchQuery, pedir que busque.
  if (!searchQuery) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">Análisis de mercado</h2>
        </div>
        <div className="text-center py-12">
          <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-800 mb-2">
            Realiza una búsqueda para ver análisis
          </h3>
          <p className="text-gray-600">
            Utiliza la barra de búsqueda para seleccionar un producto y ver su análisis.
          </p>
        </div>
      </div>
    );
  }

  // 2) Si el usuario no está logueado
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
                Debes iniciar sesión con tu cuenta de MercadoLibre para ver los detalles.
              </p>
              <button
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => (window.location.href = '/auth')}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3) Cargando
  if (isLoadingData) {
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

  // 4) Seleccionar producto de la lista si no hay un selectedProduct
  if (!selectedProduct) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex items-center mb-4">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">
            Seleccionar producto para Análisis
          </h2>
        </div>
        {/* date range picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rango de fechas</label>
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onChange={([start, end]) => {
              if (start && end) {
                setDateRange({ start, end });
              }
            }}
          />
        </div>
        {/* Listado de productos en searchData */}
        {searchData?.results?.length ? (
          <ProductSelector
            products={searchData.results}
            selectedProduct={null}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        ) : (
          <p className="text-gray-700">
            No hay resultados para <strong>{searchQuery}</strong> o no has iniciado sesión.
          </p>
        )}
      </div>
    );
  }

  // 5) Si hay un selectedProduct, ya podemos mostrar la UI final
  //    con la date range, y el analysis devuelto por getMarketAnalysis
  if (error || !analysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <BarChart3 size={24} className="text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">
            Análisis de mercado: {selectedProduct.title}
          </h2>
        </div>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle size={24} className="text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error al obtener análisis</h3>
              <p className="text-red-700 mt-1">
                Ocurrió un problema analizando el producto seleccionado.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6) “Vista de Análisis”: 
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Encabezado con date range y toggle tiendas oficiales */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center">
            <BarChart3 size={24} className="text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-800">
              Análisis de mercado: {selectedProduct.title}
            </h2>
          </div>
          <p className="text-sm text-gray-600 ml-8 mt-1">
            ID: {selectedProduct.id}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Botón para cambiar el rango de fechas */}
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onChange={([start, end]) => {
              if (start && end) {
                setDateRange({ start, end });
              }
            }}
          />
          {/* Toggle solo tiendas oficiales */}
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showOfficialStoresOnly}
              onChange={(e) => handleOfficialStoresToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none 
               peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer 
               peer-checked:after:translate-x-full
               rtl:peer-checked:after:-translate-x-full 
               peer-checked:after:border-white after:content-[''] after:absolute 
               after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300
               after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
               peer-checked:bg-blue-600"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              Solo Oficiales
            </span>
          </label>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <DollarSign size={24} className="text-blue-500" />
            <h3 className="ml-2 text-gray-700 font-medium">Precio promedio</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(analysis.averagePrice)}</p>
          <p className={`text-sm ${getTrendClass(analysis.salesTrend)}`}>
            {formatPercent(analysis.salesTrend)} vs. periodo anterior
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
            Competencia:{' '}
            {analysis.competitionLevel === 'high'
              ? 'Alta'
              : analysis.competitionLevel === 'medium'
              ? 'Media'
              : 'Baja'}
          </p>
        </div>
      </div>

      {/* Tiendas oficiales expandibles */}
      {analysis.officialStores.total > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Tiendas Oficiales</h3>
          <div className="space-y-4">
            {analysis.officialStores.stores.map((store) => (
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
                      <span>Promedio: {formatPrice(store.averagePrice)}</span>
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
                        {storeProducts[store.id].products.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-start space-x-4 p-2 hover:bg-gray-50 rounded-lg"
                          >
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
                              <div className="flex items-center mt-2 text-sm text-gray-600">
                                <span className="mr-4">Stock: {product.available_quantity}</span>
                                <span>Vendidos: {product.sold_quantity}</span>
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

      {/* Gráfico (precio vs. ventas) */}
      <div className="mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Evolución de precio y ventas
          </h3>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Sección de “Distribución de precios” y “Top vendedores” */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Distribución de precios */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Distribución de precios</h3>
          <div className="space-y-4">
            {analysis.priceDistribution.map((range, idx) => (
              <div key={idx} className="space-y-1">
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
        {/* Top vendedores */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Top Vendedores</h3>
          <div className="space-y-3">
            {analysis.topSellers.map((seller) => (
              <div
                key={seller.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm"
              >
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
          {analysis.recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2"></span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MarketInsights;
