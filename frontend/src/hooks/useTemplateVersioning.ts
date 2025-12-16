import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'array' | 'object' | 'boolean';
  description: string;
  example: any;
  required?: boolean;
  category: string;
}

export interface TemplateVersion {
  id: string;
  version: number;
  name: string;
  description?: string;
  changeLog?: string;
  createdBy: string;
  createdAt: string;
}

export interface VersionComparison {
  version1: any;
  version2: any;
  differences: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'removed' | 'modified';
  }>;
}

export function useTemplateVariables() {
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [grouped, setGrouped] = useState<Record<string, TemplateVariable[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariables = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiService.api.get('/templates/variables');
      const data = res.data ?? {};
      setVariables(data.data?.variables ?? []);
      setGrouped(data.data?.grouped ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  return { variables, grouped, loading, error, refetch: fetchVariables };
}

export function useTemplatePreview() {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generatePreview = useCallback(async (
    templateContent: string,
    sampleData?: any
  ) => {
    setLoading(true);
    setErrors([]);
    setWarnings([]);

    try {
      const res = await apiService.api.post('/templates/preview', { templateContent, sampleData });
      const data = res.data ?? {};
      setPreviewHtml(data.data?.html || '');
      setWarnings(data.data?.warnings || []);
      setErrors(data.data?.errors || []);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Erro desconhecido']);
    } finally {
      setLoading(false);
    }
  }, []);

  return { previewHtml, warnings, errors, loading, generatePreview };
}

export function useTemplateVersions(templateId: string) {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async (limit = 50, offset = 0) => {
    if (!templateId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiService.api.get(`/templates/${templateId}/versions?limit=${limit}&offset=${offset}`);
      const data = res.data ?? {};
      setVersions(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  const getVersion = useCallback(async (version: number) => {
    if (!templateId) return null;

    try {
      const res = await apiService.api.get(`/templates/${templateId}/versions/${version}`);
      const data = res.data ?? {};
      return data.data ?? null;
    } catch (err) {
      console.error('Erro ao carregar versão:', err);
      return null;
    }
  }, [templateId]);

  const createVersion = useCallback(async (
    versionData: {
      name: string;
      description?: string;
      elements: any;
      globalStyles: any;
      pages?: any;
      pageSettings?: any;
      changeLog?: string;
    }
  ) => {
    if (!templateId) return null;

    try {
      const res = await apiService.api.post(`/templates/${templateId}/versions`, versionData);
      await fetchVersions();
      return res.data?.data ?? null;
    } catch (err) {
      console.error('Erro ao criar versão:', err);
      try {
        const res = await apiService.api.post(`/templates/${templateId}/rollback/${version}`, { createNewVersion });
        await fetchVersions();
        return res.data?.data ?? null;
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao fazer rollback');
      }

      const data = await response.json();
      await fetchVersions(); // Recarregar lista
      return data.data;
    } catch (err) {
      console.error('Erro ao fazer rollback:', err);
      throw err;
    }
  }, [templateId, fetchVersions]);

  const compareVersions = useCallback(async (
    version1: number,
    version2: number
  ): Promise<VersionComparison | null> => {
    if (!templateId) return null;

    try {
      const response = await fetch(
        `/api/templates/${templateId}/compare/${version1}/${version2}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao comparar versões');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      console.error('Erro ao comparar versões:', err);
      return null;
    }
  }, [templateId]);

  const pruneOldVersions = useCallback(async (keepLast = 10) => {
    if (!templateId) return 0;

    try {
      const response = await fetch(
        `/api/templates/${templateId}/versions/prune?keepLast=${keepLast}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao deletar versões antigas');
      }

      const data = await response.json();
      await fetchVersions(); // Recarregar lista
      return data.data.deletedCount;
    } catch (err) {
      console.error('Erro ao deletar versões antigas:', err);
      return 0;
    }
  }, [templateId, fetchVersions]);

  useEffect(() => {
    if (templateId) {
      fetchVersions();
    }
  }, [templateId, fetchVersions]);

  return {
    versions,
    total,
    loading,
    error,
    fetchVersions,
    getVersion,
    createVersion,
    rollbackToVersion,
    compareVersions,
    pruneOldVersions,
  };
}
