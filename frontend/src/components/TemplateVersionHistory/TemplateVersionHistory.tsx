import React, { useState } from 'react';
import { useTemplateVersions } from '../../hooks/useTemplateVersioning';
import { formatBRShort } from '@/utils/parseDate';
import type { TemplateVersion } from '../../hooks/useTemplateVersioning';

interface TemplateVersionHistoryProps {
  templateId: string;
  onVersionSelect?: (version: TemplateVersion) => void;
  onRollback?: (version: number) => void;
}

export const TemplateVersionHistory: React.FC<TemplateVersionHistoryProps> = ({
  templateId,
  onVersionSelect,
  onRollback,
}) => {
  const {
    versions,
    total,
    loading,
    error,
    rollbackToVersion,
    compareVersions,
    pruneOldVersions,
  } = useTemplateVersions(templateId);

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion1, setCompareVersion1] = useState<number | null>(null);
  const [compareVersion2, setCompareVersion2] = useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  const handleVersionClick = (version: TemplateVersion) => {
    if (compareMode) {
      // Modo comparação: selecionar duas versões
      if (compareVersion1 === null) {
        setCompareVersion1(version.version);
      } else if (compareVersion2 === null && version.version !== compareVersion1) {
        setCompareVersion2(version.version);
        // Comparar automaticamente
        handleCompare(compareVersion1, version.version);
      } else {
        // Resetar seleção
        setCompareVersion1(version.version);
        setCompareVersion2(null);
        setComparisonResult(null);
      }
    } else {
      // Modo normal: selecionar versão
      setSelectedVersion(version.version);
      onVersionSelect?.(version);
    }
  };

  const handleRollback = async (version: number) => {
    if (!confirm(`Deseja restaurar o template para a versão ${version}?`)) {
      return;
    }

    try {
      await rollbackToVersion(version, true);
      alert(`Rollback para versão ${version} realizado com sucesso!`);
      onRollback?.(version);
    } catch (err) {
      alert('Erro ao fazer rollback: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };

  const handleCompare = async (v1: number, v2: number) => {
    const result = await compareVersions(v1, v2);
    setComparisonResult(result);
  };

  const handlePrune = async () => {
    const keepLast = prompt('Quantas versões deseja manter?', '10');
    if (!keepLast) return;

    const count = parseInt(keepLast);
    if (isNaN(count) || count < 1) {
      alert('Número inválido');
      return;
    }

    try {
      const deleted = await pruneOldVersions(count);
      alert(`${deleted} versões antigas foram deletadas`);
    } catch (err) {
      alert('Erro ao deletar versões antigas');
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setCompareVersion1(null);
    setCompareVersion2(null);
    setComparisonResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando versões...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Erro: {error}</p>
      </div>
    );
  }

  return (
    <div className="template-version-history">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Versões</h3>
          <p className="text-sm text-gray-500">{total} versões disponíveis</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleCompareMode}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              compareMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {compareMode ? 'Cancelar Comparação' : 'Comparar Versões'}
          </button>
          <button
            onClick={handlePrune}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Limpar Antigas
          </button>
        </div>
      </div>

      {/* Compare Mode Info */}
      {compareMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            {compareVersion1 === null
              ? 'Selecione a primeira versão para comparar'
              : compareVersion2 === null
              ? `Versão ${compareVersion1} selecionada. Selecione a segunda versão`
              : `Comparando versões ${compareVersion1} e ${compareVersion2}`}
          </p>
        </div>
      )}

      {/* Versions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {versions.map((version) => {
          const isSelected = selectedVersion === version.version;
          const isCompareSelected =
            compareVersion1 === version.version || compareVersion2 === version.version;

          return (
            <div
              key={version.id}
              onClick={() => handleVersionClick(version)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected || isCompareSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-semibold">
                      v{version.version}
                    </span>
                    <div>
                      <h4 className="font-medium text-gray-900">{version.name}</h4>
                      {version.description && (
                        <p className="text-sm text-gray-600">{version.description}</p>
                      )}
                    </div>
                  </div>
                  {version.changeLog && (
                    <p className="mt-2 text-sm text-gray-500 italic">{version.changeLog}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>Por: {version.createdBy}</span>
                    <span>
                      {formatBRShort(version.createdAt)}
                    </span>
                  </div>
                </div>
                {!compareMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRollback(version.version);
                    }}
                    className="ml-4 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Restaurar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Result */}
      {comparisonResult && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">
            Diferenças entre v{compareVersion1} e v{compareVersion2}
          </h4>
          {comparisonResult.differences.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma diferença encontrada</p>
          ) : (
            <div className="space-y-2">
              {comparisonResult.differences.map((diff: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    diff.type === 'added'
                      ? 'bg-green-50 border-green-200'
                      : diff.type === 'removed'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        diff.type === 'added'
                          ? 'bg-green-200 text-green-800'
                          : diff.type === 'removed'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-yellow-200 text-yellow-800'
                      }`}
                    >
                      {diff.type === 'added'
                        ? 'ADICIONADO'
                        : diff.type === 'removed'
                        ? 'REMOVIDO'
                        : 'MODIFICADO'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{diff.field}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TemplateVersionHistory;
