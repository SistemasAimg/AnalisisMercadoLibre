import React from 'react';
import { Category } from '../services/api';
import { Layers } from 'lucide-react';

interface CategoryListProps {
  categories: Category[];
  onSelectCategory: (categoryId: string) => void;
  selectedCategory: string | null;
}

const CategoryList: React.FC<CategoryListProps> = ({ 
  categories, 
  onSelectCategory, 
  selectedCategory 
}) => {
  // Asegurarse de que categories sea un array
  const categoriesArray = Array.isArray(categories) ? categories : [];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center mb-4">
        <Layers size={20} className="text-blue-600 mr-2" />
        <h2 className="text-lg font-medium text-gray-800">Categorías</h2>
      </div>
      <div className="space-y-1">
        {categoriesArray.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryList;