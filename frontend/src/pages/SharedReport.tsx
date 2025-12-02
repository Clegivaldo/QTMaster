import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { buildApiUrl } from '@/config/api';

export const SharedReport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const accessReport = async (passwordValue?: string) => {
    if (!token) {
      setError('Token de acesso inválido');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl(`/reports/shared/${token}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: passwordValue || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        
        // Detectar se requer senha
        if (result.error?.includes('senha') || result.error?.includes('password')) {
          setRequiresPassword(true);
          setError('Este link está protegido por senha');
        } else {
          setError(result.error || 'Não foi possível acessar o relatório');
        }
        setLoading(false);
        return;
      }

      // Verificar se é PDF
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        setError('Formato de arquivo inválido');
        setLoading(false);
        return;
      }

      // Criar URL do PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao acessar relatório:', err);
      setError('Erro ao conectar com o servidor');
      setLoading(false);
    }
  };

  useEffect(() => {
    accessReport();

    // Cleanup
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      accessReport(password);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `relatorio-${token}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Loading State
  if (loading && !requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando Relatório</h2>
          <p className="text-gray-600">Por favor, aguarde...</p>
        </div>
      </div>
    );
  }

  // Password Required
  if (requiresPassword && !pdfUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Relatório Protegido</h2>
            <p className="text-gray-600">Este relatório requer senha para acesso</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha de Acesso
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Verificando...' : 'Acessar Relatório'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Possíveis causas:</p>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>Link expirado</li>
              <li>Limite de acessos atingido</li>
              <li>Link revogado</li>
              <li>Acesso não autorizado de seu IP</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Success - Display PDF
  if (pdfUrl) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h1 className="text-xl font-semibold text-gray-900">Relatório Compartilhado</h1>
              </div>

              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 p-4">
          <div className="max-w-7xl mx-auto h-full">
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg shadow-lg bg-white"
              style={{ minHeight: 'calc(100vh - 120px)' }}
              title="Relatório PDF"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              Este é um link temporário de compartilhamento. O acesso pode ser revogado a qualquer momento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
