import React, { useEffect, useState } from 'react';
import { useSignature, SignatureVerification } from '../../hooks/useReportSecurity';
import { parseToDate, formatBRShort } from '@/utils/parseDate';

interface SignaturePanelProps {
  reportId: string;
  onSignatureChange?: () => void;
}

export const SignaturePanel: React.FC<SignaturePanelProps> = ({ reportId, onSignatureChange }) => {
  const { signatureInfo, loading, error, fetchSignatureInfo, signReport, verifySignature, removeSignature } =
    useSignature(reportId);

  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signOptions, setSignOptions] = useState({
    reason: '',
    location: '',
    contactInfo: '',
  });

  const [verification, setVerification] = useState<SignatureVerification | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchSignatureInfo();
  }, [fetchSignatureInfo]);

  const handleSign = async () => {
    try {
      await signReport(signOptions);
      setShowSignDialog(false);
      setSignOptions({ reason: '', location: '', contactInfo: '' });
      onSignatureChange?.();
    } catch (err) {
      console.error('Erro ao assinar:', err);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await verifySignature();
      setVerification(result);
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Deseja remover a assinatura digital? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await removeSignature();
      setVerification(null);
      onSignatureChange?.();
    } catch (err) {
      console.error('Erro ao remover:', err);
    }
  };

  if (loading && !signatureInfo) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Assinatura Digital</h3>
        {signatureInfo?.isSigned ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Assinado
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Não Assinado
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {signatureInfo?.isSigned ? (
        <div className="space-y-4">
          {/* Informações da Assinatura */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {signatureInfo.signedBy && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Assinado por:</span>
                <span className="font-medium text-gray-900">{signatureInfo.signedBy}</span>
              </div>
            )}
            {signatureInfo.signedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Data:</span>
                <span className="font-medium text-gray-900">
                  {formatBRShort(signatureInfo.signedAt)}
                </span>
              </div>
            )}
            {signatureInfo.certificateInfo && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Informações do Certificado:</p>
                <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-auto max-h-32">
                  {JSON.stringify(signatureInfo.certificateInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Verificação */}
          {verification && (
            <div
              className={`rounded-lg p-4 ${
                verification.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start">
                {verification.isValid ? (
                  <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${verification.isValid ? 'text-green-800' : 'text-red-800'}`}>
                    {verification.isValid ? 'Assinatura Válida' : 'Assinatura Inválida'}
                  </p>
                  {verification.error && <p className="text-sm text-red-700 mt-1">{verification.error}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={verifying || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {verifying ? 'Verificando...' : 'Verificar Assinatura'}
            </button>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Este relatório ainda não foi assinado digitalmente. A assinatura garante autenticidade e integridade do documento.
          </p>

          {!showSignDialog ? (
            <button
              onClick={() => setShowSignDialog(true)}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Assinar Relatório
            </button>
          ) : (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                <input
                  type="text"
                  value={signOptions.reason}
                  onChange={(e) => setSignOptions({ ...signOptions, reason: e.target.value })}
                  placeholder="Ex: Aprovação final"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localização (opcional)</label>
                <input
                  type="text"
                  value={signOptions.location}
                  onChange={(e) => setSignOptions({ ...signOptions, location: e.target.value })}
                  placeholder="Ex: São Paulo, Brasil"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contato (opcional)</label>
                <input
                  type="text"
                  value={signOptions.contactInfo}
                  onChange={(e) => setSignOptions({ ...signOptions, contactInfo: e.target.value })}
                  placeholder="Ex: email@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSign}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Assinando...' : 'Confirmar Assinatura'}
                </button>
                <button
                  onClick={() => setShowSignDialog(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
