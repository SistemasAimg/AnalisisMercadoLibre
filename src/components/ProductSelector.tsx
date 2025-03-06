import React from 'react';
import { Product } from '../services/api';
import { Check } from 'lucide-react';

interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  products,
  selectedProduct,
  onSelectProduct
}) => {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-medium text-gray-800 mb-4">
        Seleccionar producto para análisis
      </h3>
      <div className="space-y-2">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className={`w-full flex items-start p-3 rounded-lg transition-colors ${
              selectedProduct?.id === product.id
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            <img
              src={product.thumbnail.replace('http://', 'https://')}
              alt={product.title}
              className="w-16 h-16 object-contain rounded"
            />
            <div className="ml-4 flex-1 text-left">
              <h4 className="font-medium text-gray-800">{product.title}</h4>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {formatPrice(product.price, product.currency_id)}
              </p>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <span>Vendidos: {product.sold_quantity}</span>
                <span className="mx-2">•</span>
                <span>Stock: {product.available_quantity}</span>
              </div>
            </div>
            {selectedProduct?.id === product.id && (
              <Check size={20} className="text-blue-600 mt-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductSelector;