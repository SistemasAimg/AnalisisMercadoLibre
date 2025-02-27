import React from 'react';
import { Product } from '../services/api';
import { TrendingUp, Star, Truck } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onClick={() => onClick(product)}
    >
      <div className="relative h-48 bg-gray-100 flex items-center justify-center p-4">
        <img 
          src={product.thumbnail.replace('http://', 'https://')} 
          alt={product.title} 
          className="max-h-full max-w-full object-contain"
        />
        {product.shipping.free_shipping && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
            <Truck size={12} className="mr-1" />
            Envío gratis
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-800 line-clamp-2 h-14">{product.title}</h3>
        <div className="mt-2">
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(product.price, product.currency_id)}
          </p>
          <div className="flex items-center mt-2 text-sm text-gray-600">
            <div className="flex items-center mr-4">
              <Star size={16} className="text-yellow-500 mr-1" />
              <span>4.5</span>
            </div>
            <div className="flex items-center">
              <TrendingUp size={16} className="text-blue-500 mr-1" />
              <span>{product.sold_quantity} vendidos</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {product.condition === 'new' ? 'Nuevo' : 'Usado'} | {product.available_quantity} disponibles
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;