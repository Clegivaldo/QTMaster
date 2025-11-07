import React, { useEffect, useState } from 'react';
import ResponsiveModal from '../../../ResponsiveModal';
import { apiService } from '../../../../services/api';
import useImageUpload from '../../../../hooks/useImageUpload';

interface GalleryImage {
  id: string;
  name: string;
  path: string;
  size: number;
  dimensions?: { width: number; height: number };
  createdAt: string;
}

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (image: { src: string; alt: string; originalSize: { width: number; height: number } }) => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, onSelectImage }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const { uploadImage, isUploading } = useImageUpload();

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const res = await apiService.api.get('/uploads/images/gallery');
      if (res.data && res.data.success) {
        setImages(res.data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar galeria', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchGallery();
  }, [isOpen]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await uploadImage(file);
      // imageData.src already points to hosted URL via hook
      onSelectImage({ src: imageData.src, alt: imageData.alt, originalSize: imageData.originalSize });
      onClose();
    } catch (err) {
      console.error('Upload error', err);
    }
  };

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} title="Galeria de Imagens" size="lg">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Escolha uma imagem da galeria ou faça upload de uma nova.</div>
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full cursor-pointer">
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              {isUploading ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </label>
          </div>
        </div>

        {loading ? (
          <div>Carregando...</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {images.map(img => (
              <div key={img.id} className="relative border rounded overflow-hidden cursor-pointer">
                <button
                  className="absolute top-1 right-1 z-10 bg-white rounded-full p-1 shadow hover:bg-red-100"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await apiService.api.delete(`/uploads/images/${img.id}`);
                      // refresh
                      fetchGallery();
                    } catch (err) {
                      console.error('Erro ao deletar imagem', err);
                    }
                  }}
                  title="Deletar imagem"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div onClick={() => onSelectImage({ src: `${apiService.baseURL}/${img.path}`, alt: img.name, originalSize: img.dimensions || { width: 200, height: 200 } })}>
                  <img src={`${apiService.baseURL}/${img.path}`} alt={img.name} className="w-full h-32 object-cover" />
                  <div className="p-2 text-xs text-gray-700">{img.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};

export default GalleryModal;
