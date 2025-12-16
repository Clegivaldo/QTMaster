import React, { useState, useEffect } from 'react';
import { Code, Search, Plus } from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';
import { getAvailableVariables } from '../../../../utils/templateUtils';
import { apiService } from '@/services/api';

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
    const [selectedVariable, setSelectedVariable] = useState<any | null>(null);
    const [selectedFormatter, setSelectedFormatter] = useState<string>('');
    const [snippets, setSnippets] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchSnippets();
        }
    }, [isOpen]);

    const fetchSnippets = async () => {
        try {
            const res = await apiService.api.get('/text-snippets?isActive=true');
            setSnippets(res.data?.data ?? res.data ?? []);
        } catch (error) {
            console.error('Failed to fetch snippets', error);
        }
    };

    const availableVariables = getAvailableVariables();

    // Add snippets as a category
    const allCategories = [
        ...availableVariables,
        {
            category: 'snippets',
            label: 'Snippets (Textos)',
            variables: snippets.map(s => ({
                path: `snippet.${s.code}`,
                description: s.code,
                example: s.content.substring(0, 50) + (s.content.length > 50 ? '...' : ''),
                type: 'text'
            }))
        }
    ];

    const filteredVariables = allCategories.map((category) => ({
        ...category,
        variables: category.variables.filter(
            (v) =>
                v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.path.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    })).filter((category) => category.variables.length > 0);

    const handleVariableClick = (variable: any) => {
        setSelectedVariable(variable);
        setSelectedFormatter('');
    };

    const handleInsert = () => {
        if (!selectedVariable) return;

        const formatterPart = selectedFormatter ? ` | ${selectedFormatter}` : '';
        onInsertVariable(`{{${selectedVariable.path}${formatterPart}}}`);
        onClose();
        setSelectedVariable(null);
        setSelectedFormatter('');
    };

    const getFormattersForType = (type: string) => {
        const common = [
            { value: '', label: 'Padrão' },
        ];

        switch (type) {
            case 'date':
                return [
                    ...common,
                    { value: 'formatDate', label: 'Data (dd/mm/aaaa)' },
                    { value: 'formatDateTime', label: 'Data e Hora' },
                ];
            case 'number':
                return [
                    ...common,
                    { value: 'formatCurrency', label: 'Moeda (R$)' },
                    { value: 'formatTemperature', label: 'Temperatura (°C)' },
                    { value: 'formatHumidity', label: 'Umidade (%)' },
                ];
            case 'text':
                return [
                    ...common,
                    { value: 'uppercase', label: 'MAIÚSCULAS' },
                ];
            default:
                return common;
        }
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
            <div className="flex gap-6 h-[500px]">
                {/* Left Side: Variable List */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
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
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === null
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Todas
                        </button>
                        {allCategories.map((category) => (
                            <button
                                key={category.category}
                                onClick={() => setSelectedCategory(category.category)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category.category
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>

                    {/* Variables List */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {displayCategories.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Nenhuma variável encontrada</p>
                            </div>
                        ) : (
                            displayCategories.map((category) => (
                                <div key={category.category} className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider sticky top-0 bg-white py-1">
                                        {category.label}
                                    </h3>
                                    <div className="space-y-2">
                                        {category.variables.map((variable) => (
                                            <button
                                                key={variable.path}
                                                onClick={() => handleVariableClick(variable)}
                                                className={`w-full text-left p-3 border rounded-lg transition-all group ${selectedVariable?.path === variable.path
                                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {variable.description}
                                                            </span>
                                                        </div>
                                                        <code className={`text-xs font-mono mt-1 block ${selectedVariable?.path === variable.path ? 'text-blue-700' : 'text-gray-500'
                                                            }`}>
                                                            {`{{${variable.path}}}`}
                                                        </code>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Side: Configuration */}
                <div className="w-80 border-l pl-6 flex flex-col">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Configuração</h3>

                    {selectedVariable ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Variável Selecionada
                                </label>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="font-medium text-gray-900">{selectedVariable.description}</div>
                                    <code className="text-xs text-blue-600 block mt-1">{`{{${selectedVariable.path}}}`}</code>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Formatação
                                </label>
                                <select
                                    value={selectedFormatter}
                                    onChange={(e) => setSelectedFormatter(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    {getFormattersForType(selectedVariable.type || 'text').map(fmt => (
                                        <option key={fmt.value} value={fmt.value}>
                                            {fmt.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Define como o valor será exibido no documento.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Preview
                                </label>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                                    {selectedVariable.example}
                                    {selectedFormatter && <span className="text-gray-400 ml-2">(formatado)</span>}
                                </div>
                            </div>

                            <div className="pt-4 mt-auto">
                                <button
                                    onClick={handleInsert}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Inserir Variável
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center p-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <Code className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-sm">Selecione uma variável da lista para configurar opções de formatação.</p>
                        </div>
                    )}
                </div>
            </div>
        </ResponsiveModal>
    );
};

export default TemplateVariableModal;
