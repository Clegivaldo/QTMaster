import React from 'react';
import { AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';
import type { ValidationResult } from '../../../../utils/templateValidation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    result: ValidationResult | null;
    onSelectElement?: (elementId: string) => void;
}

export const ValidationResultModal: React.FC<Props> = ({
    isOpen,
    onClose,
    result,
    onSelectElement
}) => {
    if (!result) return null;

    const hasErrors = result.errors && result.errors.length > 0;
    const hasWarnings = result.warnings && result.warnings.length > 0;
    const hasIssues = hasErrors || hasWarnings;

    return (
        <ResponsiveModal
            isOpen={isOpen}
            onClose={onClose}
            title="Validação do Template"
            size="lg"
        >
            <div className="p-4">
                {!hasIssues ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <div>
                            <h3 className="font-medium text-green-900">Template válido!</h3>
                            <p className="text-sm text-green-700 mt-1">
                                Nenhum problema encontrado. Você pode salvar ou gerar o PDF com segurança.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="flex items-center gap-2 text-gray-700">
                            <Info className="h-5 w-5" />
                            <span className="text-sm">
                                Encontrados: {hasErrors ? `${result.errors.length} erro(s)` : ''}
                                {hasErrors && hasWarnings ? ' e ' : ''}
                                {hasWarnings ? `${result.warnings.length} aviso(s)` : ''}
                            </span>
                        </div>

                        {/* Errors */}
                        {hasErrors && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-red-700 font-medium">
                                    <XCircle className="h-5 w-5" />
                                    <span>Erros ({result.errors.length})</span>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {result.errors.map((error, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-red-50 border border-red-200 rounded-lg"
                                        >
                                            <p className="text-sm text-red-900">{error}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warnings */}
                        {hasWarnings && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-yellow-700 font-medium">
                                    <AlertTriangle className="h-5 w-5" />
                                    <span>Avisos ({result.warnings.length})</span>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {result.warnings.map((warning, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                                        >
                                            <p className="text-sm text-yellow-900">{warning}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action suggestion */}
                        {hasErrors && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    <strong>Dica:</strong> Corrija os erros antes de gerar o PDF para evitar problemas.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </ResponsiveModal>
    );
};

export default ValidationResultModal;
