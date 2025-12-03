import React, { useState } from 'react';
import { FileText, Download, Eye, Star, Tag } from 'lucide-react';

export interface TemplateGalleryProps {
    onSelectTemplate?: (templateId: string) => void;
    onPreviewTemplate?: (templateId: string) => void;
    showActions?: boolean;
}

interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPublic: boolean;
    thumbnail?: string;
    createdAt: Date;
}

const MOCK_TEMPLATES: Template[] = [
    {
        id: '1',
        name: 'Laudo Técnico Padrão',
        description: 'Template profissional para laudos técnicos de validação térmica com layout estruturado e completo',
        category: 'technical',
        tags: ['laudo', 'técnico', 'padrão', 'validação'],
        isPublic: true,
        createdAt: new Date(),
    },
    {
        id: '2',
        name: 'Laudo com Gráficos Detalhados',
        description: 'Template focado em visualizações gráficas para análise de dados de temperatura e umidade',
        category: 'charts',
        tags: ['laudo', 'gráficos', 'análise', 'visual'],
        isPublic: true,
        createdAt: new Date(),
    },
    {
        id: '3',
        name: 'Relatório Executivo',
        description: 'Template resumido e objetivo para apresentações executivas, focado em resultados',
        category: 'executive',
        tags: ['executivo', 'resumo', 'apresentação'],
        isPublic: true,
        createdAt: new Date(),
    },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    technical: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    charts: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    executive: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    custom: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    imported: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const CATEGORY_LABELS: Record<string, string> = {
    technical: 'Técnico',
    charts: 'Gráficos',
    executive: 'Executivo',
    custom: 'Personalizado',
    imported: 'Importado',
};

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
    onSelectTemplate,
    onPreviewTemplate,
    showActions = true,
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter templates
    const filteredTemplates = MOCK_TEMPLATES.filter((template) => {
        const matchesCategory = !selectedCategory || template.category === selectedCategory;
        const matchesSearch =
            !searchTerm ||
            template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesCategory && matchesSearch;
    });

    // Get unique categories
    const categories = Array.from(new Set(MOCK_TEMPLATES.map((t) => t.category)));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Galeria de Templates</h2>
                <p className="mt-1 text-sm text-gray-500">
                    Escolha um template pronto ou crie o seu próprio
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Buscar templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Category filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${selectedCategory === null
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Todos
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${selectedCategory === category
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {CATEGORY_LABELS[category] || category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                    const categoryStyle = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom;

                    return (
                        <div
                            key={template.id}
                            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            {/* Thumbnail */}
                            <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                <FileText className="h-20 w-20 text-gray-300" />
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-3">
                                {/* Title and category */}
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold text-gray-900 line-clamp-1">
                                            {template.name}
                                        </h3>
                                        {template.isPublic && (
                                            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <span
                                        className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded ${categoryStyle.bg} ${categoryStyle.text}`}
                                    >
                                        {CATEGORY_LABELS[template.category] || template.category}
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>

                                {/* Tags */}
                                {template.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {template.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                                            >
                                                <Tag className="h-3 w-3" />
                                                {tag}
                                            </span>
                                        ))}
                                        {template.tags.length > 3 && (
                                            <span className="px-2 py-0.5 text-xs text-gray-500">
                                                +{template.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                {showActions && (
                                    <div className="flex gap-2 pt-2">
                                        {onPreviewTemplate && (
                                            <button
                                                onClick={() => onPreviewTemplate(template.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                            >
                                                <Eye className="h-4 w-4" />
                                                Preview
                                            </button>
                                        )}
                                        {onSelectTemplate && (
                                            <button
                                                onClick={() => onSelectTemplate(template.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                <Download className="h-4 w-4" />
                                                Usar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty state */}
            {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum template encontrado</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Tente ajustar os filtros ou criar um novo template
                    </p>
                </div>
            )}
        </div>
    );
};
