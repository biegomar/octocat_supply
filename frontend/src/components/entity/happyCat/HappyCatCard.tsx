import { api } from '../../../api/config';
import { useTheme } from '../../../context/ThemeContext';

interface HappyCatWithProduct {
  happyCatId: number;
  catName: string;
  productId: number;
  imagePath: string;
  uploadedAt: string;
  productName: string;
  productImgName: string;
  comment?: string | null;
}

interface HappyCatCardProps {
  happyCat: HappyCatWithProduct;
}

export default function HappyCatCard({ happyCat }: HappyCatCardProps) {
  const { darkMode } = useTheme();

  return (
    <div
      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(118,184,82,0.3)]`}
    >
      <div className={`h-48 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <img
          src={`${api.baseURL}/${happyCat.imagePath}`}
          alt={`${happyCat.catName} with ${happyCat.productName}`}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-light' : 'text-gray-800'} mb-1`}>
          {happyCat.catName}
        </h3>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
          {happyCat.productName}
        </p>
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {new Date(happyCat.uploadedAt).toLocaleDateString()}
        </p>
        {happyCat.comment && (
          <p className={`text-sm mt-2 italic ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            "{happyCat.comment}"
          </p>
        )}
      </div>
    </div>
  );
}
