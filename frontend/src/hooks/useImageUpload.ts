import { useState, useCallback } from 'react';
import { ImageData } from '../types/editor';
import { apiService } from '../services/api';

interface UseImageUploadReturn {
  uploadImage: (file: File) => Promise<ImageData>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

export const useImageUpload = (): UseImageUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<ImageData> => {
    // Validações
    if (!file.type.startsWith('image/')) {
      throw new Error('Por favor, selecione apenas arquivos de imagem.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('O arquivo deve ter no máximo 5MB.');
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simular progresso inicial
      setUploadProgress(10);

      // Preparar FormData
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'template'); // Identificar como imagem de template

      // Simular progresso
      setUploadProgress(30);

      // Upload para o servidor
      const response = await apiService.api.post('/uploads/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(30 + (progress * 0.6)); // 30% inicial + 60% do upload real
          }
        },
      });

      setUploadProgress(95);

      if (response.data.success) {
        // Obter dimensões da imagem
        const img = new Image();
        // Use absolute `url` returned by the backend when available; fallback to constructed path
        const imageUrl = response.data.data.url || `${apiService.baseURL}/${response.data.data.path}`;
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            const imageData: ImageData = {
              src: imageUrl,
              alt: file.name,
              originalSize: {
                width: img.width,
                height: img.height
              },
              aspectRatio: img.width / img.height
            };

            setUploadProgress(100);
            setTimeout(() => {
              setIsUploading(false);
              setUploadProgress(0);
            }, 500);

            resolve(imageData);
          };

          img.onerror = () => {
            reject(new Error('Erro ao carregar a imagem.'));
          };

          img.src = imageUrl;
        });
      } else {
        throw new Error(response.data.message || 'Erro no upload da imagem.');
      }
    } catch (error: any) {
      setIsUploading(false);
      setUploadProgress(0);
      
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao fazer upload da imagem.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    uploadImage,
    isUploading,
    uploadProgress,
    error
  };
};

export default useImageUpload;