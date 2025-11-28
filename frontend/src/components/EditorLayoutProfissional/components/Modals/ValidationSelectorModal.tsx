import React, { useState, useEffect } from 'react';
import ResponsiveModal from '../../../ResponsiveModal';
import { X, Search, Calendar, User, FileText, Loader2, ArrowRightCircle } from 'lucide-react';
import { useValidations } from '../../../../hooks/useValidations';
import { useToast } from '../../../../hooks/useToast';

interface Validation {
  id: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  clientId?: string;
  client?: {
    name: string;
    cnpj?: string;
    cpf?: string;
  };
  equipmentId?: string;
  equipment?: {
    name: string;
    serialNumber: string;
  };
  startAt?: string;
  importedItemsCount?: number;
}

interface ValidationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (validationId: string) => void;
  templateId?: string;
  onGeneratePDF?: (validationId: string) => Promise<void>;
}

const ValidationSelectorModal: React.FC<ValidationSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  templateId,
  onGeneratePDF
}) => {
  const { data, isLoading, error } = useValidations({ page: 1, limit: 100 });
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState<Validation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!data?.validations) return;
    setFiltered(data.validations);
  }, [data]);

  useEffect(() => {
    if (!data?.validations) return;
    const list = data.validations;

    if (!query.trim()) {
      setFiltered(list);
      return;
    }

    const q = query.toLowerCase();
    setFiltered(list.filter((v: any) => (
      String(v.id).toLowerCase().includes(q) ||
      String(v.name || '').toLowerCase().includes(q) ||
      String(v.client?.name || '').toLowerCase().includes(q) ||
      String(v.createdAt || '').toLowerCase().includes(q)
    )));
  }, [query, data]);

  const handleAction = async () => {
    if (!selected) return;

    if (onGeneratePDF && templateId) {
      setGenerating(selected);
      try {
        await onGeneratePDF(selected);
        showToast('PDF gerado com sucesso!', 'success');
        onClose();
      } catch (err) {
        showToast('Erro ao gerar PDF', 'error');
        console.error(err);
      } finally {
        setGenerating(null);
      }
    } else if (onSelect) {
      onSelect(selected);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} title="Selecionar Validação" size="lg">
      <div className="p-4">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por ID, nome, cliente ou data..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Carregando validações...</span>
            </div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-red-500">Erro ao carregar validações</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              {query ? 'Nenhuma validação encontrada para a busca.' : 'Nenhuma validação disponível.'}
            </div>
          ) : (
            filtered.map((v) => (
              <div
                key={v.id}
                className={`p-3 border rounded-md flex items-center justify-between cursor-pointer transition-colors ${selected === v.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                onClick={() => setSelected(v.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium truncate text-gray-900">{v.name || v.id}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate">{v.client?.name || 'Cliente N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{v.startAt ? new Date(v.startAt).toLocaleDateString('pt-BR') : (v.createdAt ? new Date(v.createdAt).toLocaleDateString('pt-BR') : '')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-2">
                  {v.importedItemsCount !== undefined && (
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {v.importedItemsCount} itens
                    </div>
                  )}
                  {selected === v.id ? (
                    <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-full" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAction}
            disabled={!selected || !!generating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                {onGeneratePDF ? 'Gerar PDF' : 'Selecionar'}
              </>
            )}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
};

export default ValidationSelectorModal;