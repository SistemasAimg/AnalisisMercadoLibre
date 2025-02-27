import React from 'react';
import { Trend } from '../services/api';
import { TrendingUp } from 'lucide-react';

interface TrendingSearchesProps {
  trends: Trend[];
  onSelectTrend: (keyword: string) => void;
}

const TrendingSearches: React.FC<TrendingSearchesProps> = ({ trends, onSelectTrend }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center mb-4">
        <TrendingUp size={20} className="text-blue-600 mr-2" />
        <h2 className="text-lg font-medium text-gray-800">Tendencias</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {trends.map((trend, index) => (
          <button
            key={index}
            onClick={() => onSelectTrend(trend.keyword)}
            className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            {trend.keyword}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrendingSearches;