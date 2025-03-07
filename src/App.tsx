/*******************************************************
 * APP.TSX - Versión completa adaptada
 * Flujo: Categoría → Producto → Rango de Fechas → Análisis
 *******************************************************/

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Bell } from 'lucide-react';

// Importa tus componentes (ajusta las rutas según tu estructura real)
import SearchBar from './components/SearchBar';
import AuthButton from './components/AuthButton';
import CategoryList from './components/CategoryList';
import ProductSelector from './components/ProductSelector';
import DateRangePicker from './components/DateRangePicker';
import MarketInsights from './components/MarketInsights';

// (Opcional) Si tu CategoryList y ProductSelector 
// hacen peticiones, podrías importar react-query, etc.
// import { useQuery } from 'react-query';
// import { getCategories } from './services/api'; 
// ...

/**
 * Definición de App
 */
function App() {
  /*******************************************************
   * ESTADOS PRINCIPALES
   *******************************************************/
  // (1) Categoría elegida
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // (2) Producto elegido (ID del producto)
  //    Podrías usar un objeto completo si tu ProductSelector retorna
  //    el objeto entero, pero aquí asumes que retorna un string ID.
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // (3) Rango de fechas: start y end en formato string (YYYY-MM-DD)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  /*******************************************************
   * MANEJADORES DE EVENTOS
   *******************************************************/

  /**
   * Cuando el usuario selecciona una categoría en CategoryList
   */
  const handleCategorySelect = (categoryId: string) => {
    // Guardar categoría elegida
    setSelectedCategory(categoryId);
    // Resetear producto y rango de fechas cuando se cambia de categoría
    setSelectedProduct(null);
    setDateRange({ start: '', end: '' });
  };

  /**
   * Cuando el usuario selecciona un producto en ProductSelector
   */
  const handleProductSelect = (productId: string) => {
    // Guardar ID del producto elegido
    setSelectedProduct(productId);
    // Resetear rango de fechas al cambiar de producto
    setDateRange({ start: '', end: '' });
  };

  /**
   * Cuando el usuario cambia el rango de fechas en DateRangePicker
   */
  const handleDateRangeChange = (range: { start: string; end: string }) => {
    setDateRange(range);
  };

  /*******************************************************
   * RENDER PRINCIPAL
   *******************************************************/
  return (
    <div className="min-h-screen bg-gray-100">
      {/*****************************************************************
       * HEADER
       *****************************************************************/}
      <header className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-6">
          {/* Encabezado principal */}
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Logo + título */}
            <div className="flex items-center mb-4 md:mb-0">
              <BarChart3 size={32} className="mr-2" />
              <h1 className="text-2xl font-bold">MercadoAnalytics</h1>
            </div>

            {/* Barra de búsqueda, link webhooks, y botón auth */}
            <div className="flex items-center space-x-4">
              {/* Si tu SearchBar se mantiene, puedes usarlo aquí.
                  O podrías quitarlo si ya no lo necesitas. */}
              <SearchBar onSearch={(q) => {
                console.log('Buscar en barra:', q);
                // En caso de usarlo, manipula la lógica que necesites.
              }} />

              {/* Link a la ruta de Webhooks */}
              <Link
                to="/webhooks"
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors"
              >
                <Bell size={18} className="mr-2" />
                <span>Webhooks</span>
              </Link>

              {/* Botón de autenticación */}
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/*****************************************************************
       * MAIN
       *****************************************************************/}
      <main className="container mx-auto px-4 py-8">
        {/* (1) Lista de categorías. Se muestra siempre. */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Selecciona una Categoría</h2>
          <CategoryList
            onSelectCategory={handleCategorySelect}
            selectedCategory={selectedCategory}
          />
        </div>

        {/* (2) Si ya hay selectedCategory, mostrar ProductSelector */}
        {selectedCategory && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <h2 className="text-xl font-semibold mb-4">Selecciona un Producto</h2>
            {/* asumiendo que tu ProductSelector requiere la categoría
                para buscar los productos en esa categoría */}
            <ProductSelector
              categoryId={selectedCategory}
              onSelectProduct={handleProductSelect}
              selectedProductId={selectedProduct}
            />
          </div>
        )}

        {/* (3) Si ya hay selectedProduct, mostrar DateRangePicker */}
        {selectedProduct && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <h2 className="text-xl font-semibold mb-4">Selecciona Rango de Fechas</h2>
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onChange={handleDateRangeChange}
            />
          </div>
        )}

        {/* (4) Si hay producto y dateRange completo, mostrar MarketInsights */}
        {selectedProduct && dateRange.start && dateRange.end && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4">Análisis de Mercado</h2>
            <MarketInsights
              productId={selectedProduct}
              dateRange={dateRange}
            />
          </div>
        )}

        {/* En caso de querer mostrar el detalle de producto en algún lado
            si presionan un botón, etc., lo puedes adaptar. 
            Ahora ya no hay "activeTab" ni "selectedProduct" vs "insights". */}
      </main>

      {/*****************************************************************
       * FOOTER
       *****************************************************************/}
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
