import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  FileImage, 
  Upload, 
  X, 
  Eye, 
  EyeOff,
  Ruler,
  Square,
  RotateCcw
} from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';

export interface PageSettings {
  size: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  backgroundColor: string;
  showMargins: boolean;
  customSize?: { width: number; height: number };
}

export interface BackgroundImageSettings {
  url: string;
  repeat: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  opacity: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

interface PageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageSettings: PageSettings;
  backgroundImage?: BackgroundImageSettings | null;
  onUpdatePageSettings: (settings: PageSettings) => void;
  onUpdateBackgroundImage: (image: BackgroundImageSettings | null) => void;
  onUpdateHeaderFooter?: (header: any | null, footer: any | null) => void;
}

const PAGE_SIZES = [
  { value: 'A4', label: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  { value: 'A3', label: 'A3 (297 × 420 mm)', width: 297, height: 420 },
  { value: 'Letter', label: 'Letter (216 × 279 mm)', width: 216, height: 279 },
  { value: 'Legal', label: 'Legal (216 × 356 mm)', width: 216, height: 356 },
  { value: 'Custom', label: 'Personalizado', width: 210, height: 297 }
];

const BACKGROUND_REPEAT_OPTIONS = [
  { value: 'repeat', label: 'Repetir' },
  { value: 'no-repeat', label: 'Não repetir' },
  { value: 'repeat-x', label: 'Repetir horizontalmente' },
  { value: 'repeat-y', label: 'Repetir verticalmente' }
];

const BACKGROUND_POSITION_OPTIONS = [
  { value: 'center', label: 'Centro' },
  { value: 'top-left', label: 'Superior esquerdo' },
  { value: 'top-right', label: 'Superior direito' },
  { value: 'bottom-left', label: 'Inferior esquerdo' },
  { value: 'bottom-right', label: 'Inferior direito' }
];

const PageSettingsModal: React.FC<PageSettingsModalProps> = ({
  isOpen,
  onClose,
  pageSettings,
  backgroundImage,
  onUpdatePageSettings,
  onUpdateBackgroundImage
  , onUpdateHeaderFooter
}) => {
  const [localSettings, setLocalSettings] = useState<PageSettings>(pageSettings);
  const [localBackgroundImage, setLocalBackgroundImage] = useState<BackgroundImageSettings | null>(backgroundImage || null);
  const [localHeader, setLocalHeader] = useState<any | null>(null);
  const [localFooter, setLocalFooter] = useState<any | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Resetar estado quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(pageSettings);
      setLocalBackgroundImage(backgroundImage || null);
      setLocalHeader(null);
      setLocalFooter(null);
      setUploadingImage(false);
      setShowPreview(true);
    }
  }, [isOpen, pageSettings, backgroundImage]);

  const handleSizeChange = (size: PageSettings['size']) => {
    const sizeInfo = PAGE_SIZES.find(s => s.value === size);
    if (!sizeInfo) return;

    const newSettings = {
      ...localSettings,
      size,
      customSize: size === 'Custom' ? localSettings.customSize || { width: 210, height: 297 } : undefined
    };

    setLocalSettings(newSettings);
  };

  const handleOrientationChange = (orientation: PageSettings['orientation']) => {
    setLocalSettings(prev => ({
      ...prev,
      orientation
    }));
  };

  const handleMarginChange = (side: keyof PageSettings['margins'], value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      margins: {
        ...prev.margins,
        [side]: Math.max(0, Math.min(100, value)) // Limitar entre 0 e 100mm
      }
    }));
  };

  const handleCustomSizeChange = (dimension: 'width' | 'height', value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      customSize: {
        ...prev.customSize!,
        [dimension]: Math.max(50, Math.min(1000, value)) // Limitar entre 50 e 1000mm
      }
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploadingImage(true);

    try {
      // Criar URL temporária para preview
      const url = URL.createObjectURL(file);
      
      // TODO: Implementar upload real para o servidor
      // const formData = new FormData();
      // formData.append('image', file);
      // const response = await fetch('/api/uploads/background-image', {
      //   method: 'POST',
      //   body: formData
      // });
      // const { url } = await response.json();

      setLocalBackgroundImage({
        url,
        repeat: 'repeat',
        opacity: 0.1,
        position: 'center'
      });

    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveBackgroundImage = () => {
    if (localBackgroundImage?.url.startsWith('blob:')) {
      URL.revokeObjectURL(localBackgroundImage.url);
    }
    setLocalBackgroundImage(null);
  };

  const handleBackgroundImageChange = (field: keyof BackgroundImageSettings, value: any) => {
    if (!localBackgroundImage) return;

    setLocalBackgroundImage(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  const handleApply = () => {
    onUpdatePageSettings(localSettings);
    if (localBackgroundImage) {
      onUpdateBackgroundImage(localBackgroundImage);
    } else {
      onUpdateBackgroundImage(null);
    }
    if (onUpdateHeaderFooter) {
      onUpdateHeaderFooter(localHeader, localFooter);
    }
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: PageSettings = {
      size: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      backgroundColor: '#ffffff',
      showMargins: true
    };
    setLocalSettings(defaultSettings);
    setLocalBackgroundImage(null);
  };

  const getCurrentPageSize = () => {
    if (localSettings.size === 'Custom' && localSettings.customSize) {
      return localSettings.customSize;
    }
    
    const sizeInfo = PAGE_SIZES.find(s => s.value === localSettings.size);
    if (!sizeInfo) return { width: 210, height: 297 };
    
    return localSettings.orientation === 'landscape' 
      ? { width: sizeInfo.height, height: sizeInfo.width }
      : { width: sizeInfo.width, height: sizeInfo.height };
  };

  const pageSize = getCurrentPageSize();

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações da Página"
      size="xl"
    >
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configurações */}
          <div className="space-y-6">
            {/* Tamanho da página */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Square className="inline h-4 w-4 mr-2" />
                Tamanho da Página
              </label>
              <select
                value={localSettings.size}
                onChange={(e) => handleSizeChange(e.target.value as PageSettings['size'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAGE_SIZES.map(size => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>

              {/* Tamanho personalizado */}
              {localSettings.size === 'Custom' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Largura (mm)</label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      value={localSettings.customSize?.width || 210}
                      onChange={(e) => handleCustomSizeChange('width', parseInt(e.target.value) || 210)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Altura (mm)</label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      value={localSettings.customSize?.height || 297}
                      onChange={(e) => handleCustomSizeChange('height', parseInt(e.target.value) || 297)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Orientação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Orientação
              </label>
              <div className="flex gap-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="orientation"
                    value="portrait"
                    checked={localSettings.orientation === 'portrait'}
                    onChange={(e) => handleOrientationChange(e.target.value as 'portrait')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Retrato</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="orientation"
                    value="landscape"
                    checked={localSettings.orientation === 'landscape'}
                    onChange={(e) => handleOrientationChange(e.target.value as 'landscape')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Paisagem</span>
                </label>
              </div>
            </div>

            {/* Margens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Ruler className="inline h-4 w-4 mr-2" />
                Margens (mm)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Superior</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localSettings.margins.top}
                    onChange={(e) => handleMarginChange('top', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Inferior</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localSettings.margins.bottom}
                    onChange={(e) => handleMarginChange('bottom', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Esquerda</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localSettings.margins.left}
                    onChange={(e) => handleMarginChange('left', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Direita</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localSettings.margins.right}
                    onChange={(e) => handleMarginChange('right', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center mt-3">
                <input
                  type="checkbox"
                  checked={localSettings.showMargins}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, showMargins: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Mostrar guias de margem</span>
              </label>
            </div>

              {/* Header/Footer region */}
              <div className="mt-4 border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cabeçalho / Rodapé</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center text-xs">
                      <input type="checkbox" className="mr-2" checked={!!localHeader} onChange={(e) => setLocalHeader(e.target.checked ? { height: 20, replicateAcrossPages: true, elements: [] } : null)} />
                      <span>Cabeçalho habilitado</span>
                    </label>
                    {localHeader && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600">Altura (mm)</label>
                        <input type="number" min={0} max={200} value={localHeader.height} onChange={(e) => setLocalHeader((prev: any) => ({ ...prev, height: Math.max(0, Math.min(200, parseInt(e.target.value) || 0)) }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                        <label className="flex items-center mt-2 text-xs"><input type="checkbox" className="mr-2" checked={!!localHeader.replicateAcrossPages} onChange={(e) => setLocalHeader((prev: any) => ({ ...prev, replicateAcrossPages: e.target.checked }))} /> <span>Replicar em todas as páginas</span></label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center text-xs">
                      <input type="checkbox" className="mr-2" checked={!!localFooter} onChange={(e) => setLocalFooter(e.target.checked ? { height: 20, replicateAcrossPages: true, elements: [] } : null)} />
                      <span>Rodapé habilitado</span>
                    </label>
                    {localFooter && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600">Altura (mm)</label>
                        <input type="number" min={0} max={200} value={localFooter.height} onChange={(e) => setLocalFooter((prev: any) => ({ ...prev, height: Math.max(0, Math.min(200, parseInt(e.target.value) || 0)) }))} className="w-full px-2 py-1 border border-gray-300 rounded" />
                        <label className="flex items-center mt-2 text-xs"><input type="checkbox" className="mr-2" checked={!!localFooter.replicateAcrossPages} onChange={(e) => setLocalFooter((prev: any) => ({ ...prev, replicateAcrossPages: e.target.checked }))} /> <span>Replicar em todas as páginas</span></label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {/* Cor de fundo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cor de Fundo
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={localSettings.backgroundColor}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={localSettings.backgroundColor}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Imagem de fundo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <FileImage className="inline h-4 w-4 mr-2" />
                Imagem de Fundo
              </label>

              {!localBackgroundImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">
                    Adicione uma imagem de fundo que aparecerá em todas as páginas
                  </p>
                  <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingImage ? 'Enviando...' : 'Selecionar Imagem'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos suportados: JPG, PNG, GIF (máx. 5MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preview da imagem */}
                  <div className="relative">
                    <img
                      src={localBackgroundImage.url}
                      alt="Imagem de fundo"
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={handleRemoveBackgroundImage}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                      title="Remover imagem"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Configurações da imagem */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Repetição</label>
                      <select
                        value={localBackgroundImage.repeat}
                        onChange={(e) => handleBackgroundImageChange('repeat', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {BACKGROUND_REPEAT_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Posição</label>
                      <select
                        value={localBackgroundImage.position}
                        onChange={(e) => handleBackgroundImageChange('position', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {BACKGROUND_POSITION_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Opacidade ({Math.round(localBackgroundImage.opacity * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={localBackgroundImage.opacity}
                        onChange={(e) => handleBackgroundImageChange('opacity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Preview da Página</h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {showPreview && (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div
                  className="mx-auto border border-gray-400 shadow-lg relative overflow-hidden"
                  style={{
                    width: `${Math.min(200, (pageSize.width / pageSize.height) * 280)}px`,
                    height: `${Math.min(280, (pageSize.height / pageSize.width) * 200)}px`,
                    backgroundColor: localSettings.backgroundColor,
                    backgroundImage: localBackgroundImage ? `url(${localBackgroundImage.url})` : 'none',
                    backgroundRepeat: localBackgroundImage?.repeat || 'repeat',
                    backgroundPosition: localBackgroundImage?.position || 'center',
                    backgroundSize: localBackgroundImage?.repeat === 'no-repeat' ? 'cover' : 'auto',
                    opacity: localBackgroundImage ? 1 - (1 - localBackgroundImage.opacity) * 0.5 : 1
                  }}
                >
                  {/* Margens visuais */}
                  {localSettings.showMargins && (
                    <div
                      className="absolute border border-dashed border-blue-400"
                      style={{
                        top: `${(localSettings.margins.top / pageSize.height) * 100}%`,
                        left: `${(localSettings.margins.left / pageSize.width) * 100}%`,
                        right: `${(localSettings.margins.right / pageSize.width) * 100}%`,
                        bottom: `${(localSettings.margins.bottom / pageSize.height) * 100}%`
                      }}
                    />
                  )}

                  {/* Indicador de conteúdo */}
                  <div className="absolute inset-4 flex items-center justify-center">
                    <div className="text-xs text-gray-400 text-center">
                      <div className="w-8 h-8 bg-gray-300 rounded mb-1 mx-auto"></div>
                      <div>Conteúdo</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-600 text-center">
                  {pageSize.width} × {pageSize.height} mm
                  <br />
                  {localSettings.orientation === 'portrait' ? 'Retrato' : 'Paisagem'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Aplicar Configurações
            </button>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default PageSettingsModal;