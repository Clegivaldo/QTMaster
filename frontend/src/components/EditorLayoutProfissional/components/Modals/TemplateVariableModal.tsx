import React, { useState } from 'react';
import { Code, Search, Plus, X } from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';
import { getAvailableVariables } from '../../../../utils/templateUtils';

interface TemplateVariableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertVariable: (variable: string) => void;
}

const TemplateVariableModal: React.FC<TemplateVariableModalProps> = ({
    isOpen,
    onClose,
    onInsertVariable,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const availableVariables = getAvailableVariables();

    const filteredVariables = availableVariables.map((category) => ({
        ...category,
        variables: category.variables.filter(
            (v) =>
                v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.path.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    })).filter((category) => category.variables.length > 0);

    const handleInsert = (path: string) => {
        onInsertVariable(`{{${path}}}`);
        onClose();
    };

    const displayCategories = selectedCategory
        ? filteredVariables.filter((cat) => cat.category === selectedCategory)
        : filteredVariables;

    return (
        <ResponsiveModal
            isOpen={isOpen}
            onClose={onClose}
            title="Inserir Variável de Template"
            size="lg"
        >
            <div className="space-y-4">
                {/* Header Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Code className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-900">
                                Como usar variáveis
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Clique em uma variável para inseri-la no texto. As variáveis serão
                                substituídas pelos dados reais ao gerar o relatório.
                            </p>
                            <p className="text-xs text-blue-600 mt-2 font-mono">
                                Exemplo: {`{{client.name}}`} → "Empresa XYZ"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar variável..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === null
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Todas
                    </button>
                    {availableVariables.map((category) => (
                        <button
                            key={category.category}
                            onClick={() => setSelectedCategory(category.category)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === category.category
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>

                {/* Variables List */}
                <div className="max-h-96 overflow-y-auto space-y-4">
                    {displayCategories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma variável encontrada</p>
                        </div>
                    ) : (
                        displayCategories.map((category) => (
                            <div key={category.category} className="space-y-2">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                    {category.label}
                                </h3>
                                <div className="space-y-2">
                                    {category.variables.map((variable) => (
                                        <button
                                            key={variable.path}
                                            onClick={() => handleInsert(variable.path)}
                                            className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {variable.description}
                                                        </span>
                                                    </div>
                                                    <code className="text-xs text-blue-600 font-mono mt-1 block">
                                                        {`{{${variable.path}}}`}
                                                    </code>
                                                    <span className="text-xs text-gray-500 mt-1 block">
                                                        Exemplo: {variable.example}
                                                    </span>
                                                </div>
                                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </ResponsiveModal>
    );
};

export default TemplateVariableModal;
