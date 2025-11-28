import React, { useEffect, useState } from 'react';
import { useSharing, SharedLinkInfo, LinkStatistics } from '../../hooks/useReportSecurity';
import { parseToDate, formatBRShort } from '@/utils/parseDate';

interface SharingPanelProps {
  reportId: string;
  reportName?: string;
}

export const SharingPanel: React.FC<SharingPanelProps> = ({ reportId, reportName }) => {
  const { sharedLinks, loading, error, fetchSharedLinks, createSharedLink, revokeSharedLink, getLinkStatistics, copyLinkToClipboard } =
    useSharing(reportId);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createOptions, setCreateOptions] = useState({
    expiresInHours: 24,
    maxAccess: undefined as number | undefined,
    password: '',
    allowedIPs: '',
  });

  const [selectedLinkStats, setSelectedLinkStats] = useState<{ linkId: string; stats: LinkStatistics } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedLinks();
  }, [fetchSharedLinks]);

  const handleCreate = async () => {
    try {
      const options: any = {
        expiresInHours: createOptions.expiresInHours,
      };

      if (createOptions.maxAccess && createOptions.maxAccess > 0) {
        options.maxAccess = createOptions.maxAccess;
      }

      if (createOptions.password) {
        options.password = createOptions.password;
      }

      if (createOptions.allowedIPs) {
        options.allowedIPs = createOptions.allowedIPs.split(',').map((ip) => ip.trim()).filter(Boolean);
      }

      await createSharedLink(options);
      setShowCreateDialog(false);
      setCreateOptions({
        expiresInHours: 24,
        maxAccess: undefined,
        password: '',
        allowedIPs: '',
      });
    } catch (err) {
      console.error('Erro ao criar link:', err);
    }
  };

  const handleCopy = async (token: string) => {
    try {
      await copyLinkToClipboard(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (!confirm('Deseja revogar este link? Ele não poderá mais ser acessado.')) {
      return;
    }

    try {
      await revokeSharedLink(linkId);
    } catch (err) {
      console.error('Erro ao revogar:', err);
    }
  };

  const handleViewStats = async (linkId: string) => {
    const stats = await getLinkStatistics(linkId);
    if (stats) {
      setSelectedLinkStats({ linkId, stats });
    }
  };

  const isExpired = (date: Date | string) => parseToDate(date as any).getTime() < Date.now();
  const isLimitReached = (link: SharedLinkInfo) => link.maxAccess > 0 && link.accessCount >= link.maxAccess;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Compartilhamento Seguro</h3>
        <button
          onClick={() => setShowCreateDialog(true)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          + Criar Link
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Dialog de Criação */}
      {showCreateDialog && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          <h4 className="font-medium text-gray-900">Criar Novo Link de Compartilhamento</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expira em (horas)</label>
              <input
                type="number"
                min="1"
                max="720"
                value={createOptions.expiresInHours}
                onChange={(e) => setCreateOptions({ ...createOptions, expiresInHours: parseInt(e.target.value) || 24 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Acessos (opcional)</label>
              <input
                type="number"
                min="0"
                value={createOptions.maxAccess || ''}
                onChange={(e) =>
                  setCreateOptions({
                    ...createOptions,
                    maxAccess: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Ilimitado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha (opcional)</label>
            <input
              type="password"
              value={createOptions.password}
              onChange={(e) => setCreateOptions({ ...createOptions, password: e.target.value })}
              placeholder="Deixe em branco para sem senha"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IPs Permitidos (opcional)</label>
            <input
              type="text"
              value={createOptions.allowedIPs}
              onChange={(e) => setCreateOptions({ ...createOptions, allowedIPs: e.target.value })}
              placeholder="Ex: 192.168.1.1, 10.0.0.1 (separados por vírgula)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Criando...' : 'Criar Link'}
            </button>
            <button
              onClick={() => setShowCreateDialog(false)}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Links */}
      {loading && sharedLinks.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-24"></div>
          ))}
        </div>
      ) : sharedLinks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <p className="text-sm">Nenhum link compartilhado ainda</p>
          <p className="text-xs text-gray-400 mt-1">Crie um link para compartilhar este relatório de forma segura</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sharedLinks.map((link) => {
            const expired = isExpired(link.expiresAt);
            const limitReached = isLimitReached(link);
            const inactive = !link.isActive || expired || limitReached;

            return (
              <div
                key={link.id}
                className={`border rounded-lg p-4 ${
                  inactive ? 'bg-gray-50 border-gray-300 opacity-75' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          inactive
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {!link.isActive ? 'Revogado' : expired ? 'Expirado' : limitReached ? 'Limite Atingido' : 'Ativo'}
                      </span>
                      {link.hasPassword && (
                        <span className="inline-flex items-center text-xs text-gray-600">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Protegido
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      Criado em {formatBRShort(link.createdAt)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Expira em {formatBRShort(link.expiresAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {link.accessCount} {link.maxAccess > 0 ? `/ ${link.maxAccess}` : ''} acessos
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded px-3 py-2 mb-3 flex items-center justify-between">
                  <code className="text-xs text-gray-600 truncate flex-1">{`${window.location.origin}/shared/${link.token}`}</code>
                  <button
                    onClick={() => handleCopy(link.token)}
                    className="ml-2 p-1 text-gray-600 hover:text-blue-600 transition-colors"
                    title="Copiar link"
                  >
                    {copiedToken === link.token ? (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewStats(link.id)}
                    className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Estatísticas
                  </button>
                  {link.isActive && (
                    <button
                      onClick={() => handleRevoke(link.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Revogar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Estatísticas */}
      {selectedLinkStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Estatísticas de Acesso</h4>
              <button
                onClick={() => setSelectedLinkStats(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">Total de Acessos</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedLinkStats.stats.totalAccess}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 mb-1">Bem-sucedidos</p>
                  <p className="text-2xl font-bold text-green-900">{selectedLinkStats.stats.successfulAccess}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600 mb-1">Falhas</p>
                  <p className="text-2xl font-bold text-red-900">{selectedLinkStats.stats.failedAccess}</p>
                </div>
              </div>

              {/* Último Acesso */}
                  {selectedLinkStats.stats.lastAccess && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Último Acesso</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatBRShort(selectedLinkStats.stats.lastAccess)}
                    </p>
                </div>
              )}

              {/* Acessos por IP */}
              {Object.keys(selectedLinkStats.stats.accessByIP).length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Acessos por IP</h5>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {Object.entries(selectedLinkStats.stats.accessByIP).map(([ip, count]) => (
                      <div key={ip} className="flex justify-between text-sm">
                        <span className="text-gray-600 font-mono">{ip}</span>
                        <span className="font-medium text-gray-900">{count} acessos</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acessos Recentes */}
              {selectedLinkStats.stats.recentAccesses.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Acessos Recentes</h5>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-64 overflow-auto">
                    {selectedLinkStats.stats.recentAccesses.map((access, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs pb-2 border-b border-gray-200 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-mono text-gray-700">{access.ip}</p>
                          <p className="text-gray-500">{formatBRShort(access.timestamp)}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            access.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {access.success ? 'Sucesso' : 'Falha'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
