import { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../../../api/config';
import { useTheme } from '../../../context/ThemeContext';

interface Product {
  productId: number;
  name: string;
}

interface HappyCatUploadFormProps {
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function HappyCatUploadForm({ products, onClose, onSuccess }: HappyCatUploadFormProps) {
  const { darkMode } = useTheme();
  const [catName, setCatName] = useState('');
  const [productId, setProductId] = useState<number>(products[0]?.productId || 0);
  const [comment, setComment] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Please select an image.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('catName', catName);
      formData.append('productId', String(productId));
      if (comment.trim()) {
        formData.append('comment', comment.trim());
      }
      await axios.post(`${api.baseURL}${api.endpoints.happyCats}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
      onClose();
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md shadow-xl transition-colors duration-300`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-form-title"
      >
        <h2
          id="upload-form-title"
          className={`text-2xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} mb-4`}
        >
          Share Your Happy Cat
        </h2>
        {error && (
          <p className="text-red-500 mb-4" role="alert">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="catName"
              className={`block ${darkMode ? 'text-light' : 'text-gray-700'} mb-1`}
            >
              Cat Name
            </label>
            <input
              id="catName"
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 text-light' : 'bg-gray-100 text-gray-800'} rounded`}
              required
            />
          </div>
          <div>
            <label
              htmlFor="productId"
              className={`block ${darkMode ? 'text-light' : 'text-gray-700'} mb-1`}
            >
              Product
            </label>
            <select
              id="productId"
              value={productId}
              onChange={(e) => setProductId(parseInt(e.target.value))}
              className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 text-light' : 'bg-gray-100 text-gray-800'} rounded`}
              required
            >
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="comment"
              className={`block ${darkMode ? 'text-light' : 'text-gray-700'} mb-1`}
            >
              Comment <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>(optional)</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Why is your cat so happy?"
              className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-700 text-light' : 'bg-gray-100 text-gray-800'} rounded resize-none`}
            />
          </div>
          <div>
            <label
              htmlFor="image"
              className={`block ${darkMode ? 'text-light' : 'text-gray-700'} mb-1`}
            >
              Cat Photo
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={`w-full ${darkMode ? 'text-light' : 'text-gray-800'}`}
              required
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-2 rounded max-h-40 object-contain"
              />
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 ${darkMode ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-800'} rounded transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
