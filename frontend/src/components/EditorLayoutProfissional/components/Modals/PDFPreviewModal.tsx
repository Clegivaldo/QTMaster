import React, { useState, useEffect } from 'react';
import { Loader2, Download, X, AlertTriangle } from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';
import { useToast } from '../../../../hooks/useToast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    templateId: string;
    validationId: string;
    onConfirmGenerate: () => void;
}

export const PDFPreviewModal: React.FC<Props> = ({
    isOpen,
    onClose,
    templateId,
    validationId,
    onConfirmGenerate
}) => {
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { error: showErrorToast } = useToast();

    useEffect(() => {
        if (!isOpen) return;

        const fetchPreview = async () => {
            setLoading(true);
            setError('');
            setHtml('');

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `/api/editor-templates/${templateId}/preview-html`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ validationId })
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Erro ao carregar preview');
                }

                const data = await response.json();
                setHtml(data.html);
            } catch (err: any) {
                const errorMsg = err.message || 'Erro ao gerar preview';
                setError(errorMsg);
                showErrorToast(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        fetchPreview();
    }, [isOpen, templateId, validationId, showErrorToast]);

    return (
        <ResponsiveModal
            isOpen={isOpen}
            onClose={onClose}
            title="Preview do PDF"
            size="xl"
        >
            <div className="flex flex-col h-[80vh]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <div className="text-center">
                            <p className="text-gray-700 font-medium">Gerando preview...</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Renderizando template com dados da validação
                            </p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-medium text-red-900">Erro ao gerar preview</h3>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                            <iframe
                                srcDoc={html}
                                className="w-full h-full bg-white"
                                title="PDF Preview"
                                sandbox="allow-same-origin"
                            />
                        </div>

                        <div className="flex justify-between items-center gap-2 mt-4 p-4 bg-gray-50 border-t">
                            <p className="text-sm text-gray-600">
                                Este é um preview do PDF. Confira se está tudo correto antes de gerar.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirmGenerate();
                                        onClose();
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                    <Download className="h-4 w-4" />
                                    Gerar PDF
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </ResponsiveModal>
    );
};

export default PDFPreviewModal;
