import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Maximize,
  Minimize,
  Loader2
} from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';
import { EditorTemplate, TemplateElement } from '../../../../types/editor';
import { PageSettings, BackgroundImageSettings } from './PageSettingsModal';
import { TemplatePage } from '../../../../hooks/usePageManagement';
import { useErrorHandler, EditorErrorType } from '../../../../hooks/useErrorHandler';
import { useNotifications } from '../Utils/NotificationSystem';
import { useLoadingOverlay } from '../Utils/LoadingOverlay';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: EditorTemplate;
  pages?: TemplatePage[];
  pageSettings?: PageSettings;
  backgroundImage?: BackgroundImageSettings | null;
  onExport?: (format: 'pdf' | 'png') => void;
}

interface PreviewPageProps {
  page: TemplatePage;
  pageSettings: PageSettings;
  backgroundImage?: BackgroundImageSettings | null;
  zoom: number;
  pageNumber: number;
}

const PreviewPage: React.FC<PreviewPageProps> = ({
  page,
  pageSettings,
  backgroundImage,
  zoom,
  pageNumber
}) => {
  // Converter mm para pixels (assumindo 96 DPI)
  const mmToPx = (mm: number) => (mm * 96) / 25.4 * zoom;
  
  const getPageSize = () => {
    const sizes = {
      A4: { width: 210, height: 297 },
      A3: { width: 297, height: 420 },
      Letter: { width: 216, height: 279 },
      Legal: { width: 216, height: 356 }
    };
    
    if (pageSettings.size === 'Custom' && pageSettings.customSize) {
      return pageSettings.customSize;
    }
    
    const sizeInfo = pageSettings.size !== 'Custom' ? sizes[pageSettings.size] : sizes.A4;
    return pageSettings.orientation === 'landscape' 
      ? { width: sizeInfo.height, height: sizeInfo.width }
      : sizeInfo;
  };

  const pageSize = getPageSize();
  const pageWidth = mmToPx(pageSize.width);
  const pageHeight = mmToPx(pageSize.height);

  const renderElement = (element: TemplateElement) => {
    // Elements are stored in pixels in the editor; use pixel values and apply zoom.
    const elementStyle: React.CSSProperties = {
      position: 'absolute',
      left: (element.position.x || 0) * zoom,
      top: (element.position.y || 0) * zoom,
      width: (element.size.width || 0) * zoom,
      height: (element.size.height || 0) * zoom,
      zIndex: element.zIndex || 1,
      opacity: element.styles.opacity || 1,
      transform: element.styles.rotation ? `rotate(${element.styles.rotation}deg)` : undefined
    };

    switch (element.type) {
      case 'text':
      case 'heading':
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              fontFamily: element.styles.fontFamily || 'Arial',
              fontSize: element.styles.fontSize ? `${element.styles.fontSize}px` : '14px',
              fontWeight: element.styles.fontWeight || 'normal',
              fontStyle: element.styles.fontStyle || 'normal',
              textDecoration: element.styles.textDecoration || 'none',
              color: element.styles.color || '#000000',
              textAlign: element.styles.textAlign || 'left',
              lineHeight: element.styles.lineHeight || 1.2,
              backgroundColor: element.styles.backgroundColor || 'transparent',
              padding: element.styles.padding ? 
                `${element.styles.padding.top}px ${element.styles.padding.right}px ${element.styles.padding.bottom}px ${element.styles.padding.left}px` : 
                '0',
              border: element.styles.border ? 
                `${element.styles.border.width}px ${element.styles.border.style} ${element.styles.border.color}` : 
                'none',
              borderRadius: element.styles.borderRadius ? `${element.styles.borderRadius}px` : '0',
              overflow: 'hidden',
              wordWrap: 'break-word'
            }}
          >
            {typeof element.content === 'string' ? element.content : ''}
          </div>
        );

      case 'image':
        const imageContent = element.content as any;
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              backgroundColor: element.styles.backgroundColor || 'transparent',
              border: element.styles.border ? 
                `${element.styles.border.width}px ${element.styles.border.style} ${element.styles.border.color}` : 
                'none',
              borderRadius: element.styles.borderRadius ? `${element.styles.borderRadius}px` : '0',
              overflow: 'hidden'
            }}
          >
            <img
              src={imageContent.src || imageContent.url || ''}
              alt={imageContent.alt || 'Imagem'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        );

      case 'line':
        const lineContent = element.content as any;
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              borderTop: `${lineContent.thickness || 1}px solid ${lineContent.color || '#000000'}`,
              height: '0px'
            }}
          />
        );

      case 'rectangle':
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              backgroundColor: element.styles.backgroundColor || 'transparent',
              border: element.styles.border ? 
                `${element.styles.border.width}px ${element.styles.border.style} ${element.styles.border.color}` : 
                '1px solid #000000',
              borderRadius: element.styles.borderRadius ? `${element.styles.borderRadius}px` : '0'
            }}
          />
        );

      case 'circle':
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              backgroundColor: element.styles.backgroundColor || 'transparent',
              border: element.styles.border ? 
                `${element.styles.border.width}px ${element.styles.border.style} ${element.styles.border.color}` : 
                '1px solid #000000',
              borderRadius: '50%'
            }}
          />
        );

      case 'table':
        const tableContent = element.content as any;
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              overflow: 'hidden'
            }}
          >
            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
              {tableContent.headers && (
                <thead>
                  <tr>
                    {tableContent.headers.map((header: string, index: number) => (
                      <th
                        key={index}
                        style={{
                          border: '1px solid #ccc',
                          padding: '4px',
                          backgroundColor: '#f5f5f5',
                          fontSize: '12px'
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableContent.data?.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex}>
                    {row.map((cell: string, cellIndex: number) => (
                      <td
                        key={cellIndex}
                        style={{
                          border: '1px solid #ccc',
                          padding: '4px',
                          fontSize: '12px'
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              backgroundColor: '#f0f0f0',
              border: '1px dashed #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#666'
            }}
          >
            {element.type}
          </div>
        );
    }
  };

  return (
    <div
      className="relative mx-auto shadow-lg border border-gray-300"
      style={{
        width: pageWidth,
        height: pageHeight,
        backgroundColor: pageSettings.backgroundColor || '#ffffff',
        backgroundImage: backgroundImage ? `url(${backgroundImage.url})` : 'none',
        backgroundRepeat: backgroundImage?.repeat || 'repeat',
        backgroundPosition: backgroundImage?.position || 'center',
        backgroundSize: backgroundImage?.repeat === 'no-repeat' ? 'cover' : 'auto',
        opacity: backgroundImage ? (1 - (1 - backgroundImage.opacity) * 0.3) : 1
      }}
    >
      {/* Margens visuais */}
      {pageSettings.showMargins && (
        <div
          className="absolute border border-dashed border-blue-400 pointer-events-none"
          style={{
            top: mmToPx(pageSettings.margins.top),
            left: mmToPx(pageSettings.margins.left),
            right: mmToPx(pageSettings.margins.right),
            bottom: mmToPx(pageSettings.margins.bottom)
          }}
        />
      )}

      {/* Elementos da página */}
      {page.elements.map(renderElement)}

      {/* Número da página */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
        Página {pageNumber}
      </div>
    </div>
  );
};

const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  template,
  pages = [],
  pageSettings,
  backgroundImage,
  onExport
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { handleError } = useErrorHandler();
  const { showExportSuccess, showError } = useNotifications();
  const { showExportLoading, updateProgress, hideLoading } = useLoadingOverlay();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPageIndex(0);
      setZoom(0.5);
      setIsLoading(false);
      setIsFullscreen(false);
    }
  }, [isOpen]);

  // Usar páginas do template ou páginas passadas como prop
  const previewPages = pages.length > 0 ? pages : [
    {
      id: 'default',
      elements: template.elements || [],
      pageNumber: 1,
      name: 'Página 1'
    }
  ];

  // Usar configurações de página do template ou passadas como prop
  const currentPageSettings = pageSettings || template.pageSettings || {
    size: 'A4' as const,
    orientation: 'portrait' as const,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    backgroundColor: '#ffffff',
    showMargins: false
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleZoomReset = () => {
    setZoom(0.5);
  };

  const handleZoomFit = () => {
    // Calcular zoom para caber na tela
    const container = document.querySelector('.preview-container');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const pageSize = getPageSizeForZoom();
      const zoomX = (containerRect.width - 40) / pageSize.width;
      const zoomY = (containerRect.height - 40) / pageSize.height;
      setZoom(Math.min(zoomX, zoomY, 1));
    }
  };

  const getPageSizeForZoom = () => {
    const sizes = {
      A4: { width: 210, height: 297 },
      A3: { width: 297, height: 420 },
      Letter: { width: 216, height: 279 },
      Legal: { width: 216, height: 356 }
    };
    
    if (currentPageSettings.size === 'Custom' && currentPageSettings.customSize) {
      return currentPageSettings.customSize;
    }
    
    const sizeInfo = currentPageSettings.size !== 'Custom' ? sizes[currentPageSettings.size] : sizes.A4;
    return currentPageSettings.orientation === 'landscape' 
      ? { width: sizeInfo.height, height: sizeInfo.width }
      : sizeInfo;
  };

  const handleExport = async (format: 'pdf' | 'png') => {
    if (!onExport) return;
    let progressInterval: any;
    try {
      // Marcar loading localmente e mostrar loading overlay
      setIsLoading(true);
      showExportLoading(format, template.name || 'template');

      // Simular progresso
      progressInterval = setInterval(() => {
        updateProgress(Math.random() * 30 + 10);
      }, 500);

      await onExport(format);

      // Limpar interval e finalizar
      clearInterval(progressInterval);
      updateProgress(100, 'Finalizando...');

      await new Promise(resolve => setTimeout(resolve, 500));

      hideLoading();
      setIsLoading(false);
      showExportSuccess(`${template.name || 'template'}.${format}`, format);
      
    } catch (error) {
      hideLoading();
      setIsLoading(false);
      if (progressInterval) clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      const status = (error && typeof error === 'object' && 'response' in error) ? (error as any).response?.status : undefined;
      if (status === 404 || (typeof errorMessage === 'string' && errorMessage.includes('Template não encontrado'))) {
        showError('Template não encontrado', 'O template solicitado para pré-visualização/exportação não foi encontrado. Verifique se ele existe ou recarregue a lista de templates.');
      } else {
        showError('Erro na Exportação', `Erro ao exportar como ${format.toUpperCase()}: ${errorMessage}`);
      }

      handleError({
        type: EditorErrorType.EXPORT_FAILED,
        message: errorMessage,
        details: error,
        recoverable: true
      });
    }
  };

  const goToNextPage = () => {
    setCurrentPageIndex(prev => Math.min(prev + 1, previewPages.length - 1));
  };

  const goToPreviousPage = () => {
    setCurrentPageIndex(prev => Math.max(prev - 1, 0));
  };

  const currentPage = previewPages[currentPageIndex];

  if (!isOpen) return null;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      className="h-full"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Preview - {template.name}
            </h2>
            
            {previewPages.length > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPageIndex === 0}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                  {currentPageIndex + 1} de {previewPages.length}
                </span>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPageIndex === previewPages.length - 1}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Diminuir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleZoomReset}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Zoom 50%"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleZoomFit}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Ajustar à tela"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {onExport && (
              <>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  PDF
                </button>
                
                <button
                  onClick={() => handleExport('png')}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  PNG
                </button>
              </>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Fechar preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 preview-container">
          <div className="p-8 flex justify-center">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Processando...</p>
                </div>
              </div>
            ) : currentPage ? (
              <PreviewPage
                page={currentPage}
                pageSettings={currentPageSettings}
                backgroundImage={backgroundImage}
                zoom={zoom}
                pageNumber={currentPageIndex + 1}
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <p>Nenhuma página para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default PreviewModal;