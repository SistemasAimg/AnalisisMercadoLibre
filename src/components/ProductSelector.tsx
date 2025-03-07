// ProductSelector.tsx – Tras seleccionar categoría, busca productos reales de esa categoría (y opcionalmente por texto de búsqueda).
import React, { useEffect, useState } from 'react';

interface Product {
  id: string;
  title: string;
  price: number;
  sold_quantity: number;
}

interface ProductSelectorProps {
  category: string;
  onSelectProduct: (productId: string) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ category, onSelectProduct }) => {
  const [query, setQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Cargar productos iniciales de la categoría (ej. primeros resultados)
    if (category) {
      fetch(`/api/search?category=${category}`)
        .then(res => res.json())
        .then(data => setProducts(data))
        .catch(err => console.error('Error fetching products:', err));
    }
  }, [category]);

  const handleSearch = () => {
    // Buscar productos en la categoría con el texto ingresado
    fetch(`/api/search?category=${category}&q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Error searching products:', err));
  };

  return (
    <div>
      <h2>Producto:</h2>
      <input 
        type="text" 
        placeholder="Buscar producto..." 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
      />
      <button onClick={handleSearch}>Buscar</button>
      <ul>
        {products.map(prod => (
          <li key={prod.id}>
            <button onClick={() => onSelectProduct(prod.id)}>
              {prod.title} – Vendidos: {prod.sold_quantity}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProductSelector;
