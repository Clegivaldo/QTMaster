import React, { useState } from 'react';
import { ProcessingStatus } from '@/components/FileUpload';
import FileUpload from '@/components/FileUpload';

export default function Home() {
  const [lastProcessedFile, setLastProcessedFile] = useState<ProcessingStatus | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotifications(prev => [...prev, `${type.toUpperCase()}: ${message}`]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 4000);
  };

  const handleProcessingComplete = (status: ProcessingStatus) => {
    setLastProcessedFile(status);
    
    if (status.invalidRows === 0) {
      showNotification(
        `Arquivo processado com sucesso! ${status.validRows} de ${status.totalRows} linhas importadas com sucesso.`,
        'success'
      );
    } else {
      showNotification(
        `Arquivo processado com erros. ${status.invalidRows} de ${status.totalRows} linhas contêm erros. Verifique os detalhes abaixo.`,
        'warning'
      );
    }
  };

  const handleError = (error: string) => {
    showNotification(`Erro ao processar arquivo: ${error}`, 'error');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {notification.startsWith('SUCCESS') && (
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  )}
                  {notification.startsWith('ERROR') && (
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  )}
                  {notification.startsWith('WARNING') && (
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">
                    {notification.split(': ').slice(1).join(': ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Sistema de Importação de Dados
            </h1>
            <p className="mt-2 text-gray-600">
              Importe arquivos CSV e Excel com validação em tempo real e feedback detalhado de erros
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced File Upload */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Importação de Arquivos com Validação
          </h2>
          <FileUpload
            onFileSelect={async (file) => {
              // Simulate processing for demo
              showNotification(`Processando arquivo: ${file.name}...`, 'info');
              
              // Simulate API call delay
              setTimeout(() => {
                const mockStatus: ProcessingStatus = {
                  jobId: 'demo-job-' + Date.now(),
                  status: 'completed',
                  progress: 100,
                  totalRows: 5,
                  validRows: 2,
                  invalidRows: 3,
                  errors: [
                    {
                      row: 2,
                      message: 'Valor de temperatura inválido: invalid_temp',
                      data: { Sensor_ID: 'S002', Temperatura: 'invalid_temp', Umidade: '55.1', Data_Hora: '2024-01-15 10:15:00', Localizacao: 'Sala B' }
                    },
                    {
                      row: 3,
                      message: 'Valor de umidade inválido: invalid_humidity',
                      data: { Sensor_ID: 'S003', Temperatura: '22.8', Umidade: 'invalid_humidity', Data_Hora: '2024-01-15 10:30:00', Localizacao: 'Sala C' }
                    },
                    {
                      row: 4,
                      message: 'Formato de data inválido: invalid_date',
                      data: { Sensor_ID: 'S004', Temperatura: '26.1', Umidade: '58.9', Data_Hora: 'invalid_date', Localizacao: 'Sala D' }
                    }
                  ],
                  validationResults: [
                    { rowNumber: 1, isValid: true, errors: [] },
                    { rowNumber: 2, isValid: false, errors: [{ field: 'Temperatura', message: 'Valor de temperatura inválido' }] },
                    { rowNumber: 3, isValid: false, errors: [{ field: 'Umidade', message: 'Valor de umidade inválido' }] },
                    { rowNumber: 4, isValid: false, errors: [{ field: 'Data_Hora', message: 'Formato de data inválido' }] },
                    { rowNumber: 5, isValid: true, errors: [] }
                  ],
                  processingTime: 2500,
                  completedAt: new Date().toISOString(),
                  fileName: file.name,
                };
                
                handleProcessingComplete(mockStatus);
              }, 2000);
            }}
            onProcessingComplete={handleProcessingComplete}
          />
        </div>

        {/* Last Processed File Summary */}
        {lastProcessedFile && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Último Arquivo Processado
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {lastProcessedFile.totalRows}
                </div>
                <div className="text-sm text-gray-600">Total de Linhas</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {lastProcessedFile.validRows}
                </div>
                <div className="text-sm text-gray-600">Linhas Válidas</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {lastProcessedFile.invalidRows}
                </div>
                <div className="text-sm text-gray-600">Linhas com Erro</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((lastProcessedFile.validRows / lastProcessedFile.totalRows) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Taxa de Sucesso</div>
              </div>
            </div>
            
            {lastProcessedFile.errors.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Resumo de Erros
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <ul className="space-y-2">
                    {lastProcessedFile.errors.slice(0, 3).map((error, index) => (
                      <li key={index} className="text-sm text-red-700">
                        <strong>Linha {error.row}:</strong> {error.message}
                      </li>
                    ))}
                    {lastProcessedFile.errors.length > 3 && (
                      <li className="text-sm text-red-600 font-medium">
                        ... e mais {lastProcessedFile.errors.length - 3} erros
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}