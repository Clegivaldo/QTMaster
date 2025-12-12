import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useFileUpload, useUploadFiles, useProcessingStatus } from '@/hooks/useFileProcessing';
import { useSuitcases } from '@/hooks/useSuitcases';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ToastContext';

const ImportData: React.FC = () => {
  const [selectedSuitcaseId, setSelectedSuitcaseId] = useState<string>('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const validationIdFromQuery = searchParams.get('validationId');
  const suitcaseIdFromQuery = searchParams.get('suitcaseId');

  const { data: suitcasesData } = useSuitcases({ limit: 100 });
  const uploadMutation = useUploadFiles();
  const { data: processingStatus } = useProcessingStatus(currentJobId, !!currentJobId);
  const toast = useToast();

  const {
    selectedFiles,
    dragActive,
    addFiles,
    removeFile,
    clearFiles,
    dragHandlers,
  } = useFileUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const result = addFiles(e.target.files);
      if (result.invalid > 0) {
        toast.warning(`${result.invalid} arquivo(s) ignorados. Aceitos: .xlsx, .xls, .csv`);
      }
    }
  };

  useEffect(() => {
    // If navigation came from newly created validation, pre-select suitcase if provided
    if (suitcaseIdFromQuery) {
      setSelectedSuitcaseId(suitcaseIdFromQuery);
    }
  }, [suitcaseIdFromQuery]);

  // Redirect away if page is accessed directly without context
  useEffect(() => {
    if (!validationIdFromQuery && !suitcaseIdFromQuery) {
      // Only allow entering this page when coming from a validation or with suitcase pre-selection
      toast?.warning('A página de importação só pode ser acessada a partir da tela de Validações. Redirecionando.');
      navigate('/validations');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkForDuplicates = async (): Promise<boolean> => {
    if (!validationIdFromQuery) {
      // Se não há validação associada, não há como ter duplicatas
      return true;
    }

    try {
      const token = localStorage.getItem('accessToken');
      
      // Extrair metadados do primeiro arquivo (aproximação)
      const file = selectedFiles[0];
      const fileName = file.name;
      
      const response = await fetch(`/api/validations/${validationIdFromQuery}/check-duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName,
          // Nota: metadados completos viriam do parser, mas por enquanto enviamos só o nome
        })
      });

      if (!response.ok) {
        // Se API falhar, continua com upload
        console.warn('Failed to check duplicates, proceeding with upload');
        toast.info('Não foi possível verificar duplicidade. Prosseguindo.');
        return true;
      }

      const result = await response.json();
      const isDuplicate = result?.isDuplicate ?? result?.data?.isDuplicate ?? false;
      const message = result?.message ?? result?.data?.message;
      const existingCount = result?.existingCount ?? result?.data?.existingCount ?? 0;
      
      if (isDuplicate) {
        toast.warning(message || 'Dados possivelmente já importados.');
        const confirmed = window.confirm(
          `⚠️ ATENÇÃO: ${message}\n\n` +
          `Registros existentes: ${existingCount}\n` +
          `Novos arquivos: ${selectedFiles.length}\n\n` +
          `Deseja prosseguir com a importação mesmo assim?`
        );
        
        return confirmed;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      // Em caso de erro na verificação, continua com upload
      toast.info('Erro ao verificar duplicidade. Prosseguindo.');
      return true;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('Escolha ao menos um arquivo para processar.');
      return;
    }

    if (!selectedSuitcaseId) {
      toast.warning('Escolha a maleta correspondente aos sensores.');
      return;
    }

    // Verificar duplicatas antes de fazer upload
    const canProceed = await checkForDuplicates();
    if (!canProceed) {
      return;
    }

    try {
      const response = await uploadMutation.mutateAsync({
        files: selectedFiles,
        suitcaseId: selectedSuitcaseId,
        validationId: validationIdFromQuery || undefined,
      });

      if (response.data.success) {
        setCurrentJobId(response.data.data?.jobId || null);
        clearFiles();
        toast.success('Upload iniciado. Processamento em andamento.');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.response?.data?.error || 'Falha ao enviar arquivos.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      <PageHeader
        title="Importar Dados"
        description="Faça upload dos arquivos de dados dos sensores"
      />

      <div className="space-y-6">
        {/* Suitcase Selection */}
        <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              1. Selecione a Maleta
            </h3>
            {validationIdFromQuery && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-sm text-yellow-800">
                  Você está importando dados para a validação <strong>{validationIdFromQuery}</strong>. Após o processamento, você poderá associar os dados a essa validação.
                </div>
              </div>
            )}
          <div className="max-w-md">
            <select
              value={selectedSuitcaseId}
              onChange={(e) => setSelectedSuitcaseId(e.target.value)}
              className="input w-full"
            >
              <option value="">Selecione uma maleta...</option>
              {suitcasesData?.suitcases.map((suitcase) => (
                <option key={suitcase.id} value={suitcase.id}>
                  {suitcase.name} ({suitcase.sensors?.length || 0} sensores)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            2. Selecione os Arquivos
          </h3>

          {/* Drag & Drop Area */}
          <div
            {...dragHandlers}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Formatos aceitos: .xlsx, .xls, .csv (máximo 120 arquivos, 10MB cada)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              Selecionar Arquivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">
                  Arquivos Selecionados ({selectedFiles.length})
                </h4>
                <button
                  onClick={clearFiles}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Limpar Todos
                </button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800 p-1 ml-2 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={uploadMutation.isLoading || !selectedSuitcaseId}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadMutation.isLoading ? (
                    <div className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Upload className="h-4 w-4 mr-2" />
                      Processar Arquivos
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Processing Status */}
        {processingStatus && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              3. Status do Processamento
            </h3>

            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(processingStatus.status)}
                  <span className="font-medium capitalize">
                    {processingStatus.status === 'pending' && 'Aguardando'}
                    {processingStatus.status === 'processing' && 'Processando'}
                    {processingStatus.status === 'completed' && 'Concluído'}
                    {processingStatus.status === 'failed' && 'Falhou'}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {processingStatus.progress}% concluído
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingStatus.progress}%` }}
                />
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">
                    {processingStatus.statistics.totalFiles}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Total</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {processingStatus.statistics.successfulFiles}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Sucesso</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-red-600">
                    {processingStatus.statistics.failedFiles}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Falhas</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">
                    {processingStatus.statistics.totalRecords}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">Registros</div>
                </div>
              </div>

              {/* Results */}
              {processingStatus.results.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Resultados por Arquivo
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {processingStatus.results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          result.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium text-sm">
                              {result.fileName}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {result.recordsProcessed} registros
                          </span>
                        </div>
                        
                        {result.sensorSerialNumber && (
                          <div className="mt-1 text-xs text-gray-500">
                            Sensor: {result.sensorSerialNumber}
                          </div>
                        )}
                        
                        {result.errors.length > 0 && (
                          <div className="mt-2">
                            {result.errors.map((error, errorIndex) => (
                              <div key={errorIndex} className="text-xs text-red-600">
                                • {error}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Actions */}
              {processingStatus.status === 'completed' && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-green-900">
                          Importação Concluída com Sucesso!
                        </h4>
                        <p className="text-sm text-green-700 mt-1">
                          {processingStatus.statistics.totalRecords} registros foram processados.
                          {validationIdFromQuery 
                            ? ' Os dados foram associados à validação.' 
                            : ' Você pode criar uma validação para analisar estes dados.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate('/validations')}
                      className="btn-primary flex items-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      {validationIdFromQuery ? 'Ver Validações' : 'Criar Validação'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setCurrentJobId(null);
                        clearFiles();
                      }}
                      className="btn-secondary"
                    >
                      Importar Mais Dados
                    </button>
                  </div>
                </div>
              )}

              {/* Error Actions */}
              {processingStatus.status === 'failed' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-900">
                        Erro no Processamento
                      </h4>
                      <p className="text-sm text-red-700 mt-1">
                        Alguns arquivos não puderam ser processados. Verifique os erros acima e tente novamente.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setCurrentJobId(null);
                        clearFiles();
                      }}
                      className="btn-secondary"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            Instruções de Uso
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• Selecione primeiro a maleta que contém os sensores dos dados</p>
            <p>• Os arquivos serão automaticamente associados aos sensores baseado no nome do arquivo ou conteúdo</p>
            <p>• Formatos suportados: Excel (.xlsx, .xls) e CSV (.csv)</p>
            <p>• Máximo de 120 arquivos por vez, 10MB cada arquivo</p>
            <p>• O sistema processará os dados conforme a configuração de cada tipo de sensor</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImportData;