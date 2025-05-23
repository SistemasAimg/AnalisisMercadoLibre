import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { BarChart3, Search, TrendingUp, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchBar from './components/SearchBar';
import ProductCard from './components/ProductCard';
import ProductDetail from './components/ProductDetail';
import MarketInsights from './components/MarketInsights';
import AuthButton from './components/AuthButton';
import { searchProducts, Product } from './services/api';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'insights'>('products');

  // Fetch products based on search query
  const { 
    data: searchResults, 
    isLoading: productsLoading,
    refetch: refetchProducts
  } = useQuery(
    ['products', searchQuery],
    () => {
      if (searchQuery) {
        return searchProducts(searchQuery);
      }
      return { results: [], paging: { total: 0, offset: 0, limit: 20 } };
    },
    {
      enabled: !!searchQuery,
    }
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedProduct(null);
    setActiveTab('products');
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleBackToResults = () => {
    setSelectedProduct(null);
  };

  // Asegurarse de que searchResults.results sea un array
  const searchResultsArray = searchResults?.results || [];
  const searchResultsPaging = searchResults?.paging || { total: 0, offset: 0, limit: 20 };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <BarChart3 size={32} className="mr-2" />
              <h1 className="text-2xl font-bold">MercadoAnalytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <SearchBar onSearch={handleSearch} />
              <Link 
                to="/webhooks" 
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors"
              >
                <Bell size={18} className="mr-2" />
                <span>Webhooks</span>
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!selectedProduct ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'products'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('products')}
                >
                  <div className="flex items-center">
                    <Search size={18} className="mr-2" />
                    Productos
                  </div>
                </button>
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'insights'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('insights')}
                >
                  <div className="flex items-center">
                    <TrendingUp size={18} className="mr-2" />
                    Análisis de Mercado
                  </div>
                </button>
              </div>
            </div>

            {activeTab === 'products' ? (
              <>
                {productsLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : searchResultsArray.length > 0 ? (
                  <div>
                    <p className="text-gray-600 mb-4">
                      {searchResultsPaging.total} resultados para {searchQuery}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {searchResultsArray.map((product) => (
                        <ProductCard 
                          key={product.id} 
                          product={product} 
                          onClick={handleProductClick} 
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <Search size={48} className="mx-auto text-gray-400 mb-4" />
                    <h2 className="text-xl font-medium text-gray-800 mb-2">
                      {searchQuery 
                        ? 'No se encontraron resultados' 
                        : 'Busca productos para analizar'}
                    </h2>
                    <p className="text-gray-600">
                      {searchQuery 
                        ? 'Intenta con otra búsqueda' 
                        : 'Utiliza la barra de búsqueda para encontrar productos'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <MarketInsights searchQuery={searchQuery} />
            )}
          </div>
        ) : (
          <ProductDetail product={selectedProduct} onBack={handleBackToResults} />
        )}
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center">
                <BarChart3 size={24} className="mr-2" />
                <h2 className="text-xl font-bold">MercadoAnalytics</h2>
              </div>
              <p className="text-gray-400 mt-2">
                Análisis de mercado para MercadoLibre Argentina
              </p>
            </div>
            <div className="text-gray-400 text-sm">
              © 2025 MercadoAnalytics. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;