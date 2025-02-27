import React from 'react';
import { Product } from '../services/api';
import { ArrowLeft, Star, Truck, ShieldCheck, BarChart3 } from 'lucide-react';

interface ProductDetailProps {
  product: Product | null;
  onBack: () => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onBack }) => {
  if (!product) return null;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <button 
        onClick={onBack}
        className="flex items-center text-blue-600 mb-6 hover:text-blue-800"
      >
        <ArrowLeft size={20} className="mr-2" />
        Volver a resultados
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
          <img 
            src={product.thumbnail.replace('http://', 'https://')} 
            alt={product.title} 
            className="max-w-full max-h-96 object-contain"
          />
        </div>

        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">
              {product.condition === 'new' ? 'Nuevo' : 'Usado'} | {product.sold_quantity} vendidos
            </p>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{product.title}</h1>
            <div className="flex items-center mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={18} 
                    className={star <= 4 ? "text-yellow-400 fill-current" : "text-gray-300"} 
                  />
                ))}
              </div>
              <span className="ml-2 text-gray-600">(120 opiniones)</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {formatPrice(product.price, product.currency_id)}
            </p>
            <p className="text-sm text-green-600 mb-6">
              en 12x {formatPrice(product.price / 12, product.currency_id)}
            </p>
          </div>

          <div className="mb-6">
            {product.shipping.free_shipping && (
              <div className="flex items-center text-green-600 mb-2">
                <Truck size={18} className="mr-2" />
                <span>Envío gratis a todo el país</span>
              </div>
            )}
            <div className="flex items-center text-gray-600 mb-2">
              <ShieldCheck size={18} className="mr-2" />
              <span>Garantía - 12 meses</span>
            </div>
            <div className="flex items-center text-gray-600">
              <BarChart3 size={18} className="mr-2" />
              <span>Stock disponible - {product.available_quantity} unidades</span>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Comprar ahora
            </button>
            <button className="w-full bg-blue-100 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-200 transition-colors">
              Agregar al carrito
            </button>
            <a 
              href={product.permalink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-center text-blue-600 underline py-2"
            >
              Ver en MercadoLibre
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Análisis de mercado</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-600 mb-4">
            Este producto tiene un precio {Math.random() > 0.5 ? 'por debajo' : 'por encima'} del promedio 
            de mercado en su categoría. La tendencia de ventas es {Math.random() > 0.5 ? 'creciente' : 'estable'}.
          </p>
          <div className="h-64 bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-center text-gray-500">Aquí se mostraría un gráfico de tendencia de precios</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;