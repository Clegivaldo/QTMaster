import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ==================== Interfaces ====================

export interface SignatureInfo {
  isSigned: boolean;
  signature?: string;
  signedBy?: string;
  signedAt?: Date;
  certificateInfo?: any;
}

export interface SignatureVerification {
  isValid: boolean;
  signedBy?: string;
  signedAt?: Date;
  certificateInfo?: any;
  error?: string;
}

export interface SignReportOptions {
  reason?: string;
  location?: string;
  contactInfo?: string;
}

export interface SharedLinkInfo {
  id: string;
  token: string;
  expiresAt: Date;
  maxAccess: number;
  accessCount: number;
  hasPassword: boolean;
  isActive: boolean;
  createdAt: Date;
  report: {
    id: string;
    name: string;
  };
}

export interface CreateSharedLinkOptions {
  expiresInHours?: number;
  maxAccess?: number;
  password?: string;
  allowedIPs?: string[];
}

export interface LinkStatistics {
  totalAccess: number;
  successfulAccess: number;
  failedAccess: number;
  lastAccess?: Date;
  accessByIP: Record<string, number>;
  recentAccesses: {
    ip: string;
    timestamp: Date;
    success: boolean;
  }[];
}

// ==================== useSignature Hook ====================

export const useSignature = (reportId: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  /**
   * Obter informações da assinatura
   */
  const fetchSignatureInfo = useCallback(async () => {
    if (!reportId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}/signature`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar informações da assinatura');
      }

      setSignatureInfo(result.data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      console.error('Erro ao buscar assinatura:', err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  /**
   * Assinar relatório
   */
  const signReport = useCallback(
    async (options?: SignReportOptions) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/reports/${reportId}/sign`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(options || {}),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao assinar relatório');
        }

        // Atualizar info após assinar
        await fetchSignatureInfo();

        return result.data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMsg);
        console.error('Erro ao assinar:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [reportId, fetchSignatureInfo]
  );

  /**
   * Verificar assinatura (público)
   */
  const verifySignature = useCallback(async (): Promise<SignatureVerification> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}/signature/verify`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao verificar assinatura');
      }

      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      console.error('Erro ao verificar:', err);
      return {
        isValid: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  /**
   * Remover assinatura
   */
  const removeSignature = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}/signature`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao remover assinatura');
      }

      // Atualizar info após remover
      await fetchSignatureInfo();

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      console.error('Erro ao remover assinatura:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reportId, fetchSignatureInfo]);

  return {
    signatureInfo,
    loading,
    error,
    fetchSignatureInfo,
    signReport,
    verifySignature,
    removeSignature,
  };
};

// ==================== useSharing Hook ====================

export const useSharing = (reportId: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedLinks, setSharedLinks] = useState<SharedLinkInfo[]>([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  /**
   * Listar links compartilhados
   */
  const fetchSharedLinks = useCallback(async () => {
    if (!reportId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}/share`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar links');
      }

      setSharedLinks(result.data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      console.error('Erro ao buscar links:', err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  /**
   * Criar link compartilhado
   */
  const createSharedLink = useCallback(
    async (options?: CreateSharedLinkOptions) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/reports/${reportId}/share`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(options || {}),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao criar link');
        }

        // Atualizar lista
        await fetchSharedLinks();

        return result.data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMsg);
        console.error('Erro ao criar link:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [reportId, fetchSharedLinks]
  );

  /**
   * Revogar link
   */
  const revokeSharedLink = useCallback(
    async (linkId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/reports/share/${linkId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao revogar link');
        }

        // Atualizar lista
        await fetchSharedLinks();

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMsg);
        console.error('Erro ao revogar link:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchSharedLinks]
  );

  /**
   * Obter estatísticas de um link
   */
  const getLinkStatistics = useCallback(async (linkId: string): Promise<LinkStatistics | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reports/share/${linkId}/stats`, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar estatísticas');
      }

      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      console.error('Erro ao buscar estatísticas:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Copiar link para clipboard
   */
  const copyLinkToClipboard = useCallback(async (token: string) => {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      return shareUrl;
    } catch (err) {
      console.error('Erro ao copiar link:', err);
      throw new Error('Não foi possível copiar o link');
    }
  }, []);

  return {
    sharedLinks,
    loading,
    error,
    fetchSharedLinks,
    createSharedLink,
    revokeSharedLink,
    getLinkStatistics,
    copyLinkToClipboard,
  };
};

// ==================== Hook combinado ====================

export const useReportSecurity = (reportId: string) => {
  const signature = useSignature(reportId);
  const sharing = useSharing(reportId);

  return {
    signature,
    sharing,
  };
};
