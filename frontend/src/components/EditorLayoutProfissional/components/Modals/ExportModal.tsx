import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Image, 
  Code, 
  Settings,
  Info
} from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';
import { EditorTemplate, ExportFormat, ExportOptions } from '../../../../types/editor';
import { useTemplateStorage } from '../../../../hooks/useTemplateStorage';
import { useNotifications } from '../Utils/NotificationSystem';
import { useLoadingOverlay } from '../Utils/LoadingOverlay';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: EditorTemplate;
}

interface ExportConfig {
  format: ExportFormat;
  quality: number;
  dpi: number;
  includeMetadata: boolean;
  filename: string;
}

const EXPORT_FORMATS = [
  {
    format: 'pdf' as ExportFormat,
    label: 'PDF',
    description: 'Formato ideal para impressão e compartilhamento',
    icon: FileText,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    extensions: ['.pdf']
  },
  {
    format: 'png' as ExportFormat,
    label: 'PNG',
    description: 'Imagem de alta qualidade com transparência',
    icon: Image,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    extensions: ['.png']
  },
  {
    format: 'html' as ExportFormat,
    label: 'HTML',
    description: 'Página web interativa e responsiva',
    icon: Code,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    extensions: ['.html']
  },
  {
    format: 'json' as ExportFormat,
    label: 'JSON',
    description: 'Dados estruturados para integração',
    icon: Code,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    extensions: ['.json']
  }
];

const QUALITY_PRESETS = [
  { value: 0.5, label: 'Baixa (Menor arquivo)' },
  { value: 0.75, label: 'Média' },
  { value: 0.9, label: 'Alta' },
  { value: 1.0, label: 'Máxima (Maior arquivo)' }
];

const DPI_PRESETS = [
  { value: 72, label: '72 DPI (Tela)' },
  { value: 150, label: '150 DPI (Web)' },
  { value: 300, label: '300 DPI (Impressão)' },
  { value: 600, label: '600 DPI (Alta qualidade)' }
];

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  template
}) => {
  const { exportTemplate, isLoading, error, clearError } = useTemplateStorage();
  const { showExportSuccess, showError } = useNotifications();
  const { showExportLoading, updateProgress, hideLoading } = useLoadingOverlay();
  
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [config, setConfig] = useState<ExportConfig>({
    format: 'pdf',
    quality: 0.9,
    dpi: 300,
    includeMetadata: true,
    filename: template.name || 'template'
  });
  
  // Resetar estado quando modal abrir
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFormat('pdf');
      setShowAdvanced(false);
      setConfig({
        format: 'pdf',
        quality: 0.9,
        dpi: 300,
        includeMetadata: true,
        filename: template.name || 'template'
      });
      clearError();
      hideLoading();
    }
  }, [isOpen, template.name, clearError, hideLoading]);
  
  // Atualizar formato no config quando seleção mudar
  React.useEffect(() => {
    setConfig(prev => ({ ...prev, format: selectedFormat }));
  }, [selectedFormat]);
  
  const handleExport = async () => {
    let progressInterval: any;
    try {
      const options: ExportOptions = {
        format: config.format,
        quality: config.quality,
        dpi: config.dpi,
        includeMetadata: config.includeMetadata
      };
      
      // Mostrar loading overlay
      showExportLoading(config.format, template.name || 'template');
      
      // Simular progresso para melhor UX
      progressInterval = setInterval(() => {
        updateProgress(Math.random() * 30 + 10); // Progresso aleatório até 40%
      }, 500);
      
  const result = await exportTemplate(template, options);
      
  // Limpar interval e mostrar progresso completo
  clearInterval(progressInterval);
      updateProgress(100, 'Finalizando...');
      
      // Aguardar um pouco para mostrar 100%
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Esconder loading e mostrar sucesso
      hideLoading();
      showExportSuccess(result.filename, config.format);
      
      // Fechar modal
      onClose();
      
    } catch (error) {
      hideLoading();
      if (progressInterval) clearInterval(progressInterval);
      // Detectar 404 (Template não encontrado) e mostrar mensagem específica
      const status = (error && typeof error === 'object' && 'response' in error) ? (error as any).response?.status : undefined;
      const msg = error instanceof Error ? error.message : 'Erro desconhecido na exportação';

      if (status === 404 || (typeof msg === 'string' && msg.includes('Template não encontrado'))) {
        showError('Template não encontrado', 'O template selecionado não foi encontrado no servidor. Verifique se ele ainda existe ou recarregue a lista de templates.');
      } else {
        showError('Erro na Exportação', msg);
      }

      console.error('Erro ao exportar template:', error);
    }
  };
  
  const getFormatInfo = (format: ExportFormat) => {
    return EXPORT_FORMATS.find(f => f.format === format);
  };
  
  const formatFilename = (filename: string, format: ExportFormat) => {
    const info = getFormatInfo(format);
    if (!info) return filename;
    
    const extension = info.extensions[0];
    if (filename.endsWith(extension)) {
      return filename;
    }
    
    // Remover outras extensões
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return nameWithoutExt + extension;
  };
  
  const selectedFormatInfo = getFormatInfo(selectedFormat);
  
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Template"
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Seleção de formato */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Escolha o formato de exportação
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXPORT_FORMATS.map((format) => {
              const Icon = format.icon;
              const isSelected = selectedFormat === format.format;
              
              return (
                <button
                  key={format.format}
                  onClick={() => setSelectedFormat(format.format)}
                  className={`p-4 text-left border-2 rounded-lg transition-all ${
                    isSelected
                      ? `${format.borderColor} ${format.bgColor}`
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-6 w-6 ${isSelected ? format.color : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium ${
                        isSelected ? format.color : 'text-gray-900'
                      }`}>
                        {format.label}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {format.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Nome do arquivo */}
        <div>
          <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
            Nome do arquivo
          </label>
          <input
            id="filename"
            type="text"
            value={config.filename}
            onChange={(e) => setConfig(prev => ({ ...prev, filename: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite o nome do arquivo"
          />
          <p className="mt-1 text-sm text-gray-500">
            Arquivo será salvo como: {formatFilename(config.filename, selectedFormat)}
          </p>
        </div>
        
        {/* Configurações avançadas */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurações avançadas
            <span className="ml-2 text-gray-400">
              {showAdvanced ? '▼' : '▶'}
            </span>
          </button>
          
          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              {/* Qualidade (apenas para PNG) */}
              {selectedFormat === 'png' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qualidade da imagem
                  </label>
                  <select
                    value={config.quality}
                    onChange={(e) => setConfig(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {QUALITY_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* DPI (para PDF e PNG) */}
              {(selectedFormat === 'pdf' || selectedFormat === 'png') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolução (DPI)
                  </label>
                  <select
                    value={config.dpi}
                    onChange={(e) => setConfig(prev => ({ ...prev, dpi: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DPI_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Incluir metadados */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includeMetadata}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Incluir metadados do template
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Nome, descrição, tags e informações de criação
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Informações do formato selecionado */}
        {selectedFormatInfo && (
          <div className={`p-4 rounded-lg ${selectedFormatInfo.bgColor} ${selectedFormatInfo.borderColor} border`}>
            <div className="flex items-start space-x-3">
              <Info className={`h-5 w-5 ${selectedFormatInfo.color} flex-shrink-0 mt-0.5`} />
              <div>
                <h4 className={`text-sm font-medium ${selectedFormatInfo.color}`}>
                  Sobre o formato {selectedFormatInfo.label}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedFormatInfo.description}
                </p>
                
                {/* Informações específicas do formato */}
                <div className="mt-2 text-xs text-gray-500">
                  {selectedFormat === 'pdf' && (
                    <p>• Ideal para impressão e compartilhamento profissional</p>
                  )}
                  {selectedFormat === 'png' && (
                    <p>• Suporte a transparência, ideal para uso em apresentações</p>
                  )}
                  {selectedFormat === 'html' && (
                    <p>• Pode ser visualizado em qualquer navegador web</p>
                  )}
                  {selectedFormat === 'json' && (
                    <p>• Dados estruturados para integração com outros sistemas</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        

        
        {/* Erro da API */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}
        
        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleExport}
            aria-label={`Exportar ${selectedFormatInfo?.label}`}
            disabled={isLoading || !config.filename.trim()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar {selectedFormatInfo?.label}
              </>
            )}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default ExportModal;