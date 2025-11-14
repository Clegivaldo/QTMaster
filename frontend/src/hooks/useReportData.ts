import { useState, useCallback, useEffect } from 'react';
import { ReportData, DataSource, ImportProgress } from '../types/report';
import { api } from '../services/api';

export const useReportData = () => {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [currentData, setCurrentData] = useState<ReportData | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [uploading, setUploading] = useState(false);

  // Carregar dados de relatórios
  const loadReportData = useCallback(async (filters?: {
    clientId?: string;
    sensorId?: string;
    dateRange?: { start: Date; end: Date };
    dataSourceId?: string;
    status?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getReportData(filters);
      setReportData(response.data);
    } catch (err) {
      setError('Erro ao carregar dados de relatórios');
      console.error('Erro ao carregar dados de relatórios:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar dado específico
  const loadReportDataById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getReportDataById(id);
      setCurrentData(response.data);
      return response.data;
    } catch (err) {
      setError('Erro ao carregar dado de relatório');
      console.error('Erro ao carregar dado de relatório:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar fontes de dados
  const loadDataSources = useCallback(async (clientId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getDataSources(clientId);
      setDataSources(response.data);
    } catch (err) {
      setError('Erro ao carregar fontes de dados');
      console.error('Erro ao carregar fontes de dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload de arquivo
  const uploadFile = useCallback(async (
    file: File,
    options: {
      clientId?: string;
      sensorId?: string;
      dataSourceId?: string;
      validateOnly?: boolean;
      chunkSize?: number;
    } = {}
  ) => {
    setUploading(true);
    setError(null);
    setImportProgress(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options.clientId) formData.append('clientId', options.clientId);
      if (options.sensorId) formData.append('sensorId', options.sensorId);
      if (options.dataSourceId) formData.append('dataSourceId', options.dataSourceId);
      if (options.validateOnly) formData.append('validateOnly', 'true');
      if (options.chunkSize) formData.append('chunkSize', options.chunkSize.toString());
      
      const response = await api.uploadReportFile(formData, (progress) => {
        setImportProgress(progress);
      });
      
      // Atualizar lista de dados
      if (response.data && !options.validateOnly) {
        setReportData(prev => [...prev, response.data]);
      }
      
      return response.data;
    } catch (err) {
      setError('Erro ao fazer upload do arquivo');
      console.error('Erro ao fazer upload do arquivo:', err);
      throw err;
    } finally {
      setUploading(false);
      setImportProgress(null);
    }
  }, []);

  // Validar arquivo
  const validateFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setImportProgress(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('validateOnly', 'true');
      
      const response = await api.validateReportFile(formData, (progress) => {
        setImportProgress(progress);
      });
      
      return response.data;
    } catch (err) {
      setError('Erro ao validar arquivo');
      console.error('Erro ao validar arquivo:', err);
      throw err;
    } finally {
      setIsLoading(false);
      setImportProgress(null);
    }
  }, []);

  // Processar dados importados
  const processImportedData = useCallback(async (
    importId: string,
    options: {
      mapping?: Record<string, string>;
      transformations?: Record<string, any>;
      filters?: Record<string, any>;
    } = {}
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.processImportedData(importId, options);
      
      // Atualizar lista de dados
      setReportData(prev => [...prev, response.data]);
      
      return response.data;
    } catch (err) {
      setError('Erro ao processar dados importados');
      console.error('Erro ao processar dados importados:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Atualizar dado de relatório
  const updateReportData = useCallback(async (
    id: string,
    data: Partial<ReportData>
  ) => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.updateReportData(id, data);
      
      // Atualizar lista
      setReportData(prev => prev.map(item =>
        item.id === id ? { ...item, ...response.data } : item
      ));
      
      // Atualizar dado atual se for o mesmo
      if (currentData?.id === id) {
        setCurrentData(prev => prev ? { ...prev, ...response.data } : null);
      }
      
      return response.data;
    } catch (err) {
      setError('Erro ao atualizar dado de relatório');
      console.error('Erro ao atualizar dado de relatório:', err);
      throw err;
    }
  }, [currentData]);

  // Excluir dado de relatório
  const deleteReportData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.deleteReportData(id);
      
      // Remover da lista
      setReportData(prev => prev.filter(item => item.id !== id));
      
      // Limpar dado atual se for o mesmo
      if (currentData?.id === id) {
        setCurrentData(null);
      }
    } catch (err) {
      setError('Erro ao excluir dado de relatório');
      console.error('Erro ao excluir dado de relatório:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentData]);

  // Exportar dados
  const exportData = useCallback(async (
    ids: string[],
    format: 'xlsx' | 'csv' | 'pdf',
    options?: {
      templateId?: string;
      filters?: Record<string, any>;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.exportReportData(ids, format, options);
      
      // Criar link de download
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'csv' ? 'text/csv' : 
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return response.data;
    } catch (err) {
      setError('Erro ao exportar dados');
      console.error('Erro ao exportar dados:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Obter estatísticas
  const getDataStatistics = useCallback(async (
    clientId?: string,
    dateRange?: { start: Date; end: Date }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getDataStatistics(clientId, dateRange);
      return response.data;
    } catch (err) {
      setError('Erro ao obter estatísticas');
      console.error('Erro ao obter estatísticas:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Obter schema de dados
  const getDataSchema = useCallback(async (dataSourceId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getDataSchema(dataSourceId);
      return response.data;
    } catch (err) {
      setError('Erro ao obter schema de dados');
      console.error('Erro ao obter schema de dados:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Limpar dados antigos
  const cleanupOldData = useCallback(async (
    clientId?: string,
    olderThanDays?: number
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.cleanupOldData(clientId, olderThanDays);
      
      // Recarregar dados
      await loadReportData();
      
      return response.data;
    } catch (err) {
      setError('Erro ao limpar dados antigos');
      console.error('Erro ao limpar dados antigos:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadReportData]);

  // Carregar dados iniciais
  useEffect(() => {
    loadReportData();
    loadDataSources();
  }, [loadReportData, loadDataSources]);

  return {
    reportData,
    currentData,
    dataSources,
    isLoading,
    error,
    uploading,
    importProgress,
    
    // Ações principais
    loadReportData,
    loadReportDataById,
    loadDataSources,
    
    // Upload e importação
    uploadFile,
    validateFile,
    processImportedData,
    
    // Manipulação de dados
    updateReportData,
    deleteReportData,
    exportData,
    
    // Utilidades
    getDataStatistics,
    getDataSchema,
    cleanupOldData,
  };
};
