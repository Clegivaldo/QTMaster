import React, { useState } from 'react';
import { Code, Sparkles } from 'lucide-react';
import { hasTemplateVariables, parseTemplateVariables } from '../../../../utils/templateUtils';
import TemplateVariableModal from '../Modals/TemplateVariableModal';

interface DynamicTextControlsProps {
    element: any;
    onUpdateElements?: (elementIds: string[], updates: any) => void;
    onUpdateContent?: (elementId: string, content: any) => void;
}

const DynamicTextControls: React.FC<DynamicTextControlsProps> = ({
    element,
    onUpdateElements,
    onUpdateContent,
}) => {
    const [showVariableModal, setShowVariableModal] = useState(false);

    const isDynamic = element.properties?.isDynamic || hasTemplateVariables(element.content || '');
    const variables = parseTemplateVariables(element.content || '');

    const handleToggleDynamic = (checked: boolean) => {
        if (onUpdateElements) {
            onUpdateElements([element.id], {
                properties: {
                    ...element.properties,
                    isDynamic: checked
                }
            });
        }
    };

    const handleInsertVariable = (variable: string) => {
        const currentContent = element.content || '';
        const newContent = currentContent + ' ' + variable;
        if (onUpdateContent) {
            onUpdateContent(element.id, newContent);
        }
    };

    return (
        <>
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Texto Dinâmico
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isDynamic}
                            onChange={(e) => handleToggleDynamic(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                {isDynamic && (
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowVariableModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                        >
                            <Code className="w-4 h-4" />
                            Inserir Variável
                        </button>

                        {variables.length > 0 && (
                            <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                                <div className="font-medium text-blue-900 mb-1">
                                    Variáveis Detectadas ({variables.length}):
                                </div>
                                <div className="space-y-1">
                                    {variables.slice(0, 3).map((v, i) => (
                                        <code key={i} className="block text-blue-700 font-mono text-xs">
                                            {`{{${v.path}}}`}
                                        </code>
                                    ))}
                                    {variables.length > 3 && (
                                        <div className="text-blue-600">
                                            +{variables.length - 3} mais...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            Use variáveis como {`{{client.name}}`} para inserir dados dinâmicos
                        </div>
                    </div>
                )}
            </div>

            <TemplateVariableModal
                isOpen={showVariableModal}
                onClose={() => setShowVariableModal(false)}
                onInsertVariable={handleInsertVariable}
            />
        </>
    );
};

export default DynamicTextControls;
