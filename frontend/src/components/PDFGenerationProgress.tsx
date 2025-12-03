import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export interface PDFGenerationProgressProps {
    status: 'idle' | 'preparing' | 'rendering' | 'generating' | 'finalizing' | 'completed' | 'error';
    error?: string;
    estimatedTime?: number; // in seconds
    elapsedTime?: number; // in seconds
}

const STEPS = [
    { key: 'preparing', label: 'Preparando dados...' },
    { key: 'rendering', label: 'Renderizando template...' },
    { key: 'generating', label: 'Gerando PDF...' },
    { key: 'finalizing', label: 'Finalizando...' },
];

export const PDFGenerationProgress: React.FC<PDFGenerationProgressProps> = ({
    status,
    error,
    estimatedTime = 10,
    elapsedTime = 0,
}) => {
    if (status === 'idle') return null;

    const getCurrentStepIndex = () => {
        const index = STEPS.findIndex(step => step.key === status);
        return index >= 0 ? index : 0;
    };

    const getProgress = () => {
        if (status === 'completed') return 100;
        if (status === 'error') return 0;

        const currentStep = getCurrentStepIndex();
        const baseProgress = (currentStep / STEPS.length) * 100;

        // Add sub-progress within current step based on elapsed time
        const stepProgress = Math.min((elapsedTime / estimatedTime) * (100 / STEPS.length), 100 / STEPS.length);

        return Math.min(baseProgress + stepProgress, 95); // Cap at 95% until completed
    };

    const progress = getProgress();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {status === 'completed' ? 'PDF Gerado!' : status === 'error' ? 'Erro' : 'Gerando PDF'}
                    </h3>
                    {status === 'completed' && (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                    )}
                    {status === 'error' && (
                        <XCircle className="h-6 w-6 text-red-500" />
                    )}
                    {!['completed', 'error'].includes(status) && (
                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                    )}
                </div>

                {/* Progress Bar */}
                {status !== 'error' && (
                    <div className="mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className={`h-2.5 rounded-full transition-all duration-300 ${status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{Math.round(progress)}%</span>
                            {estimatedTime > 0 && status !== 'completed' && (
                                <span>~{Math.max(0, estimatedTime - elapsedTime)}s restantes</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Current Step */}
                {!['completed', 'error'].includes(status) && (
                    <div className="space-y-2">
                        {STEPS.map((step, index) => {
                            const currentIndex = getCurrentStepIndex();
                            const isActive = index === currentIndex;
                            const isCompleted = index < currentIndex;

                            return (
                                <div
                                    key={step.key}
                                    className={`flex items-center space-x-2 text-sm ${isActive
                                            ? 'text-blue-600 font-medium'
                                            : isCompleted
                                                ? 'text-green-600'
                                                : 'text-gray-400'
                                        }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${isActive
                                            ? 'bg-blue-500 animate-pulse'
                                            : isCompleted
                                                ? 'bg-green-500'
                                                : 'bg-gray-300'
                                        }`} />
                                    <span>{step.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Error Message */}
                {status === 'error' && error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <p className="text-sm text-green-800">
                            PDF gerado com sucesso! O download deve iniciar automaticamente.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
