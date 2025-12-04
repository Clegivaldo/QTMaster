import React, { useState } from 'react';
import { Droplet } from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';

interface WatermarkConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig?: {
        text: string;
        opacity: number;
        color: string;
        size: number;
    };
    onSave: (config: {
        text: string;
        opacity: number;
        color: string;
        size: number;
    }) => void;
}

const WatermarkConfigModal: React.FC<WatermarkConfigModalProps> = ({
    isOpen,
    onClose,
    currentConfig,
    onSave
}) => {
    const [text, setText] = useState(currentConfig?.text || '');
    const [opacity, setOpacity] = useState(currentConfig?.opacity || 0.1);
    const [color, setColor] = useState(currentConfig?.color || '#000000');
    const [size, setSize] = useState(currentConfig?.size || 100);

    const handleSave = () => {
        onSave({ text, opacity, color, size });
        onClose();
    };

    const handleClear = () => {
        setText('');
        setOpacity(0.1);
        setColor('#000000');
        setSize(100);
        onSave({ text: '', opacity: 0.1, color: '#000000', size: 100 });
        onClose();
    };

    return (
        <ResponsiveModal
            isOpen={isOpen}
            onClose={onClose}
            title="Configurar Marca D'água"
            size="md"
        >
            <div className="space-y-6">
                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Droplet className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-900">
                                Marca D'água
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">
                                A marca d'água será exibida em todas as páginas do documento de forma diagonal e centralizada.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Text */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Texto da Marca D'água
                    </label>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Ex: CONFIDENCIAL, RASCUNHO"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Opacity */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opacidade: {Math.round(opacity * 100)}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Transparente</span>
                        <span>Opaco</span>
                    </div>
                </div>

                {/* Color */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                            type="text"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        />
                    </div>
                </div>

                {/* Size */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tamanho: {size}px
                    </label>
                    <input
                        type="range"
                        min="50"
                        max="200"
                        step="10"
                        value={size}
                        onChange={(e) => setSize(parseInt(e.target.value))}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Pequeno</span>
                        <span>Grande</span>
                    </div>
                </div>

                {/* Preview */}
                {text && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preview
                        </label>
                        <div className="relative h-48 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <div
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] whitespace-nowrap font-bold"
                                style={{
                                    fontSize: `${size / 2}px`,
                                    color: color,
                                    opacity: opacity
                                }}
                            >
                                {text}
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-between gap-3 pt-4 border-t">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Remover Marca D'água
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!text.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </ResponsiveModal>
    );
};

export default WatermarkConfigModal;
