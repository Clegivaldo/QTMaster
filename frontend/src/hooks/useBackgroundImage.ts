import { useState, useCallback } from 'react';
import { useErrorHandler, EditorErrorType } from './useErrorHandler';

interface UseBackgroundImageReturn {
  uploadBackgroundImage: (file: File) => Promise<string | null>;
  removeBackgroundImage: (imageUrl: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}

export const useBackgroundImage = (): UseBackgroundImageReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { handleError } = useErrorHandler();

  const validateImageFile = (file: File): boolean => {
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      handleError({
        type: EditorErrorType.BACKGROUND_UPLOAD_FAILED,
        message: 'Por favor, selecione um arquivo de imagem válido (JPG, PNG, GIF).',
        recoverable: true
      });
      return false;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      handleError({
        type: EditorErrorType.BACKGROUND_UPLOAD_FAILED,
        message: 'A imagem deve ter no máximo 5MB.',
        recoverable: true
      });
      return false;
    }

    // Validar dimensões mínimas (opcional)
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 100 || img.height < 100) {
          handleError({
            type: EditorErrorType.BACKGROUND_UPLOAD_FAILED,
            message: 'A imagem deve ter pelo menos 100x100 pixels.',
            recoverable: true
          });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        handleError({
          type: EditorErrorType.BACKGROUND_UPLOAD_FAILED,
          message: 'Arquivo de imagem corrompido ou inválido.',
          recoverable: true
        });
        resolve(false);
      };
      img.src = URL.createObjectURL(file);
    }) as any;
  };

  const uploadBackgroundImage = useCallback(async (file: File): Promise<string | null> => {
    if (!validateImageFile(file)) {
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // TODO: Implementar upload real para o servidor
      // Por enquanto, usar URL local para desenvolvimento
      const url = URL.createObjectURL(file);
      
      // Simular delay de upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Em produção, seria algo assim:
      /*
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'background');
      
      const response = await fetch('/api/uploads/background-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data.url;
      */

      return url;

    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      
      handleError({
        type: EditorErrorType.BACKGROUND_UPLOAD_FAILED,
        message: `Erro ao fazer upload da imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        details: error,
        recoverable: true
      });
      
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [handleError]);

  const removeBackgroundImage = useCallback((imageUrl: string) => {
    // Limpar URL blob se for local
    if (imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    
    // TODO: Em produção, também remover do servidor
    /*
    if (!imageUrl.startsWith('blob:')) {
      fetch(`/api/uploads/background-image`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ url: imageUrl })
      }).catch(error => {
        console.error('Erro ao remover imagem do servidor:', error);
      });
    }
    */
  }, []);

  return {
    uploadBackgroundImage,
    removeBackgroundImage,
    isUploading,
    uploadProgress
  };
};