import React from 'react';
import { useQuery } from 'react-query';
import { Layers } from 'lucide-react';
import { Category, getCategories } from '../services/api';

interface CategoryListProps {
  onSelectCategory: (categoryId: string) => void;
  selectedCategory: string | null;
}

const CategoryList: React.FC<CategoryListProps> = ({
  onSelectCategory,
  selectedCategory,
}) => {

  // Hook de React Query para cargar categorías
  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery<Category[]>('categories', getCategories);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <p className="text-gray-500">Cargando categorías...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <p className="text-red-500">Error al cargar categorías.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center mb-4">
        <Layers size={20} className="text-blue-600 mr-2" />
        <h2 className="text-lg font-medium text-gray-800">Categorías</h2>
      </div>
      <div className="space-y-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryList;
