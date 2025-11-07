import React, { useCallback, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, RotateCw, FolderOpen } from 'lucide-react';
import { ImageElement as ImageElementType, ImageData } from '../../../../types/editor';
import useImageUpload from '../../../../hooks/useImageUpload';
import ImageGalleryModal from '../Modals/ImageGalleryModal';

interface ImageElementProps {
  element: ImageElementType;
  isSelected: boolean;
  zoom: number; // Used for scaling UI elements and calculations
  onEdit?: (elementId: string, newContent: ImageData) => void;
}

const ImageElement: React.FC<ImageElementProps> = ({
  element,
  isSelected,
  zoom: _zoom, // Prefixed with underscore to indicate intentionally unused
  onEdit
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading, uploadProgress } = useImageUpload();
  const [showGallery, setShowGallery] = useState(false);

  // Handler para upload de arquivo
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const imageData = await uploadImage(file);
      onEdit?.(element.id, imageData);
    } catch (error: any) {
      alert(error.message || 'Erro ao fazer upload da imagem.');
    }
  }, [uploadImage, element.id, onEdit]);

  // Handler para clique no botão de upload
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handler para mudança no input de arquivo
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  }, [handleFileUpload]);

  // Handler para drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handler para remover imagem
  const handleRemoveImage = useCallback(() => {
    const emptyImageData: ImageData = {
      src: '',
      alt: '',
      originalSize: { width: 200, height: 150 }
    };
    onEdit?.(element.id, emptyImageData);
  }, [element.id, onEdit]);

  // Handler para abrir galeria
  const handleOpenGallery = useCallback(() => {
    setShowGallery(true);
  }, []);

  // Handler para selecionar imagem da galeria
  const handleSelectFromGallery = useCallback((imageData: ImageData) => {
    onEdit?.(element.id, imageData);
    setShowGallery(false);
  }, [element.id, onEdit]);

  const hasImage = element.content.src;

  return (
    <div 
      className="w-full h-full relative group"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Conteúdo da imagem */}
      {hasImage ? (
        <>
          {/* Imagem */}
          <img
            src={element.content.src}
            alt={element.content.alt}
            className="w-full h-full object-contain"
            draggable={false}
            style={{
              objectFit: 'contain',
              backgroundColor: 'transparent'
            }}
          />

          {/* Overlay com controles (visível apenas quando selecionado) */}
          {isSelected && (
            <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
              <div className="flex gap-1 opacity-80">
                <button
                  onClick={handleUploadClick}
                  className="p-1.5 bg-white rounded shadow hover:bg-gray-50 transition-colors"
                  title="Fazer upload de nova imagem"
                >
                  <Upload className="h-3 w-3 text-gray-600" />
                </button>
                <button
                  onClick={handleOpenGallery}
                  className="p-1.5 bg-white rounded shadow hover:bg-gray-50 transition-colors"
                  title="Escolher da galeria"
                >
                  <FolderOpen className="h-3 w-3 text-blue-600" />
                </button>
                <button
                  onClick={handleRemoveImage}
                  className="p-1.5 bg-white rounded shadow hover:bg-gray-50 transition-colors"
                  title="Remover imagem"
                >
                  <X className="h-3 w-3 text-red-600" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Placeholder para upload */}
          <div 
            className={`
              w-full h-full flex flex-col items-center justify-center
              border-2 border-dashed border-gray-300 rounded-lg
              hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer
              ${isUploading ? 'bg-blue-50 border-blue-400' : 'bg-gray-50'}
            `}
            onClick={handleUploadClick}
          >
            {isUploading ? (
              <div className="text-center">
                <div className="animate-spin mb-2">
                  <RotateCw className="h-8 w-8 text-blue-500" />
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  Carregando...
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {uploadProgress}%
                </div>
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mb-2 mx-auto" />
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Clique para fazer upload
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  ou arraste um arquivo aqui
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGallery();
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                >
                  <FolderOpen className="h-3 w-3" />
                  Escolher da galeria
                </button>
                <div className="text-xs text-gray-400 mt-2">
                  PNG, JPG, GIF até 5MB
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal da galeria de imagens */}
      <ImageGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onSelectImage={handleSelectFromGallery}
      />
    </div>
  );
};

export default ImageElement;