import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Save, X, Type } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';

interface TextSnippet {
    id: string;
    code: string;
    content: string;
    description?: string;
    category: string;
    tags: string[];
    isActive: boolean;
}

export const TextSnippetManager: React.FC = () => {
    const [snippets, setSnippets] = useState<TextSnippet[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentSnippet, setCurrentSnippet] = useState<Partial<TextSnippet>>({});
    const { success, error } = useToast();

    useEffect(() => {
        fetchSnippets();
    }, []);

    const fetchSnippets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/text-snippets', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch snippets');
            const data = await response.json();
            setSnippets(data);
        } catch (err) {
            error('Erro ao carregar snippets');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');
            const method = currentSnippet.id ? 'PUT' : 'POST';
            const url = currentSnippet.id
                ? `/api/text-snippets/${currentSnippet.id}`
                : '/api/text-snippets';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(currentSnippet)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao salvar snippet');
            }

            success('Snippet salvo com sucesso');
            setIsEditing(false);
            setCurrentSnippet({});
            fetchSnippets();
        } catch (err: any) {
            error(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este snippet?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/text-snippets/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao excluir snippet');

            success('Snippet excluído com sucesso');
            fetchSnippets();
        } catch (err: any) {
            error(err.message);
        }
    };

    const filteredSnippets = snippets.filter(s =>
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Type className="w-5 h-5" />
                    Snippets de Texto
                </h2>
                <button
                    onClick={() => {
                        setCurrentSnippet({ category: 'general', isActive: true });
                        setIsEditing(true);
                    }}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {isEditing ? (
                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código (único)</label>
                            <input
                                type="text"
                                value={currentSnippet.code || ''}
                                onChange={e => setCurrentSnippet({ ...currentSnippet, code: e.target.value })}
                                disabled={!!currentSnippet.id}
                                className="w-full p-2 border rounded-md"
                                placeholder="ex: aviso_legal"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                            <textarea
                                value={currentSnippet.content || ''}
                                onChange={e => setCurrentSnippet({ ...currentSnippet, content: e.target.value })}
                                className="w-full p-2 border rounded-md h-32"
                                placeholder="Texto do snippet..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <input
                                type="text"
                                value={currentSnippet.description || ''}
                                onChange={e => setCurrentSnippet({ ...currentSnippet, description: e.target.value })}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <input
                                type="text"
                                value={currentSnippet.category || ''}
                                onChange={e => setCurrentSnippet({ ...currentSnippet, category: e.target.value })}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar snippets..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Carregando...</div>
                        ) : filteredSnippets.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Nenhum snippet encontrado</div>
                        ) : (
                            filteredSnippets.map(snippet => (
                                <div key={snippet.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{snippet.code}</h3>
                                            <p className="text-xs text-gray-500">{snippet.category}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setCurrentSnippet(snippet);
                                                    setIsEditing(true);
                                                }}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(snippet.id)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">{snippet.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
