import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Search, Grid, List, Trash2, Eye } from 'lucide-react';
import { ImageData } from '../../../../types/editor';
import useImageUpload from '../../../../hooks/useImageUpload';
import { apiService } from '../../../../services/api';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageData: ImageData) => void;
}

interface GalleryImage {
  id: string;
  name: string;
  path: string;
  size: number;
  dimensions: { width: number; height: number };
  createdAt: string;
  thumbnail?: string;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, onSelectImage }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const { uploadImage, isUploading, uploadProgress } = useImageUpload();

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.api.get('/uploads/images/gallery');
      if (response.data?.success) {
        setImages(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar galeria:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadImages();
  }, [isOpen, loadImages]);

  const filteredImages = images.filter((image) =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const imageData = await uploadImage(file);
        await loadImages();
        onSelectImage(imageData);
        onClose();
      } catch (error: any) {
        alert(error?.message || 'Erro ao fazer upload da imagem.');
      }
    },
    [uploadImage, loadImages, onSelectImage, onClose]
  );

  const handleSelectImage = useCallback(
    (image: GalleryImage) => {
      const imageData: ImageData = {
        src: `${apiService.baseURL}/${image.path}`,
        alt: image.name,
        originalSize: image.dimensions,
        aspectRatio: image.dimensions.width / image.dimensions.height,
      };
      onSelectImage(imageData);
      onClose();
    },
    [onSelectImage, onClose]
  );

  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      // eslint-disable-next-line no-restricted-globals
      if (!confirm('Tem certeza que deseja deletar esta imagem?')) return;
      try {
        await apiService.api.delete(`/uploads/images/${imageId}`);
        await loadImages();
      } catch (error) {
        console.error('Erro ao deletar imagem:', error);
        alert('Erro ao deletar imagem.');
      }
    },
    [loadImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files || []);
      const imageFile = files.find((file) => file.type.startsWith('image/'));
      if (imageFile) handleFileUpload(imageFile);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Galeria de Imagens</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
          <label className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </label>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar imagens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-auto" onDrop={handleDrop} onDragOver={handleDragOver}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : isUploading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-sm text-gray-600">Fazendo upload...</div>
                <div className="w-48 bg-gray-200 rounded-full h-2 mt-2 mx-auto">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Upload className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma imagem encontrada</p>
              <p className="text-sm">Faça upload de imagens para começar</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                    selectedImageId === image.id ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageId(image.id)}
                  onDoubleClick={() => handleSelectImage(image)}
                >
                  <div className="aspect-square">
                    <img src={image.thumbnail || `${apiService.baseURL}/${image.path}`} alt={image.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectImage(image);
                        }}
                        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
                        title="Selecionar"
                      >
                        <Eye className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2">
                    <div className="truncate font-medium">{image.name}</div>
                    <div className="text-gray-300">{image.dimensions.width} × {image.dimensions.height}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedImageId === image.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageId(image.id)}
                  onDoubleClick={() => handleSelectImage(image)}
                >
                  <img src={image.thumbnail || `${apiService.baseURL}/${image.path}`} alt={image.name} className="w-12 h-12 object-cover rounded" />
                  <div className="flex-1">
                    <div className="font-medium">{image.name}</div>
                    <div className="text-sm text-gray-500">{image.dimensions.width} × {image.dimensions.height} • {Math.round(image.size / 1024)}KB</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectImage(image);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full"
                      title="Selecionar"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.id);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full"
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">{filteredImages.length} imagem(ns) encontrada(s)</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
            {selectedImageId && (
              <button
                onClick={() => {
                  const selectedImage = images.find((img) => img.id === selectedImageId);
                  if (selectedImage) handleSelectImage(selectedImage);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Selecionar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') return createPortal(modal, document.body);
  return modal;
};

export default ImageGalleryModal;