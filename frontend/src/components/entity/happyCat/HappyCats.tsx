import { useState } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';
import { api } from '../../../api/config';
import { useTheme } from '../../../context/ThemeContext';
import HappyCatCard from './HappyCatCard';
import HappyCatUploadForm from './HappyCatUploadForm';

interface HappyCatWithProduct {
  happyCatId: number;
  catName: string;
  productId: number;
  imagePath: string;
  uploadedAt: string;
  productName: string;
  productImgName: string;
}

interface Product {
  productId: number;
  name: string;
}

const fetchHappyCats = async (): Promise<HappyCatWithProduct[]> => {
  const { data } = await axios.get(`${api.baseURL}${api.endpoints.happyCats}`);
  return data;
};

const fetchProducts = async (): Promise<Product[]> => {
  const { data } = await axios.get(`${api.baseURL}${api.endpoints.products}`);
  return data;
};

export default function HappyCats() {
  const { darkMode } = useTheme();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const {
    data: happyCats,
    isLoading,
    error,
    refetch,
  } = useQuery('happyCats', fetchHappyCats);

  const { data: products } = useQuery('products', fetchProducts);

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4`}>
        <div className="max-w-7xl mx-auto flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4`}>
        <div className="max-w-7xl mx-auto text-red-500 text-center">
          Failed to load happy cats
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
              Happy Customers
            </h1>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors"
            >
              Share Your Happy Cat
            </button>
          </div>

          {(!happyCats || happyCats.length === 0) && (
            <div
              className={`flex flex-col items-center justify-center text-center py-20 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
              role="status"
            >
              <p className={`${darkMode ? 'text-light' : 'text-gray-800'} text-lg font-medium`}>
                No happy cats yet
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                Be the first to share your happy cat!
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {happyCats?.map((happyCat) => (
              <HappyCatCard key={happyCat.happyCatId} happyCat={happyCat} />
            ))}
          </div>
        </div>
      </div>

      {showUploadModal && products && (
        <HappyCatUploadForm
          products={products}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
