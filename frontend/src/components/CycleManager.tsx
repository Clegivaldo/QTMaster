import React, { useState } from 'react';
import { Plus, Edit, Trash2, X, Clock, Calendar } from 'lucide-react';
import { useToast } from './ToastContext';

interface Cycle {
  id: string;
  name: string;
  cycleType: 'NORMAL' | 'CHEIO' | 'VAZIO' | 'FALTA_ENERGIA' | 'PORTA_ABERTA';
  startAt: string;
  endAt: string;
  notes?: string;
  _count?: {
    importedItems: number;
  };
}

interface CycleManagerProps {
  validationId: string;
  cycles: Cycle[];
  onUpdate: () => void;
}

const CYCLE_TYPES = [
  { value: 'NORMAL', label: 'Normal', color: 'blue' },
  { value: 'CHEIO', label: 'Cheio', color: 'green' },
  { value: 'VAZIO', label: 'Vazio', color: 'yellow' },
  { value: 'FALTA_ENERGIA', label: 'Falta de Energia', color: 'red' },
  { value: 'PORTA_ABERTA', label: 'Porta Aberta', color: 'orange' }
];

const CycleManager: React.FC<CycleManagerProps> = ({ validationId, cycles, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteCycle, setConfirmDeleteCycle] = useState<Cycle | null>(null);
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    cycleType: 'NORMAL' as Cycle['cycleType'],
    startAt: '',
    endAt: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      cycleType: 'NORMAL',
      startAt: '',
      endAt: '',
      notes: ''
    });
    setEditingCycle(null);
  };

  const handleOpenModal = (cycle?: Cycle) => {
    if (cycle) {
      setEditingCycle(cycle);
      setFormData({
        name: cycle.name,
        cycleType: cycle.cycleType,
        startAt: new Date(cycle.startAt).toISOString().slice(0, 16),
        endAt: new Date(cycle.endAt).toISOString().slice(0, 16),
        notes: cycle.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const url = editingCycle
        ? `/api/validations/${validationId}/cycles/${editingCycle.id}`
        : `/api/validations/${validationId}/cycles`;
      
      const method = editingCycle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          startAt: new Date(formData.startAt).toISOString(),
          endAt: new Date(formData.endAt).toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar ciclo');
      }

      toast.success(editingCycle ? 'Ciclo atualizado com sucesso!' : 'Ciclo criado com sucesso!');
      handleCloseModal();
      onUpdate();
    } catch (error) {
      console.error('Error saving cycle:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar ciclo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (cycle: Cycle) => {
    setConfirmDeleteCycle(cycle);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteCycle) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/validations/${validationId}/cycles/${confirmDeleteCycle.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar ciclo');
      }

      toast.success('Ciclo deletado com sucesso!');
      setConfirmDeleteCycle(null);
      onUpdate();
    } catch (error) {
      console.error('Error deleting cycle:', error);
      toast.error('Erro ao deletar ciclo');
    }
  };

  const getCycleColor = (type: string) => {
    const cycleType = CYCLE_TYPES.find(t => t.value === type);
    return cycleType?.color || 'gray';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startAt: string, endAt: string) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const hours = Math.abs(end.getTime() - start.getTime()) / 36e5;
    
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }
    return `${(hours / 24).toFixed(1)} dias`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          <Clock className="inline h-5 w-5 mr-2" />
          Ciclos de Validação
        </h3>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Ciclo
        </button>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Nenhum ciclo definido</p>
          <p className="text-sm text-gray-500">
            Adicione ciclos para segmentar a análise por períodos específicos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cycles.map(cycle => (
            <div
              key={cycle.id}
              className={`bg-white border-l-4 border-${getCycleColor(cycle.cycleType)}-500 rounded-lg shadow p-4`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{cycle.name}</h4>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded bg-${getCycleColor(cycle.cycleType)}-100 text-${getCycleColor(cycle.cycleType)}-800 mt-1`}>
                    {CYCLE_TYPES.find(t => t.value === cycle.cycleType)?.label}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(cycle)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cycle)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Início: {formatDateTime(cycle.startAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Fim: {formatDateTime(cycle.endAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Duração: {calculateDuration(cycle.startAt, cycle.endAt)}</span>
                </div>
                {cycle._count && cycle._count.importedItems > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    {cycle._count.importedItems} leituras associadas
                  </div>
                )}
              </div>

              {cycle.notes && (
                <p className="mt-2 text-sm text-gray-600 italic">
                  {cycle.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingCycle ? 'Editar Ciclo' : 'Novo Ciclo'}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Ciclo *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="input w-full"
                        placeholder="Ex: Porta Aberta - Teste 1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Ciclo *
                      </label>
                      <select
                        value={formData.cycleType}
                        onChange={e => setFormData({ ...formData, cycleType: e.target.value as Cycle['cycleType'] })}
                        className="input w-full"
                        required
                      >
                        {CYCLE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data/Hora Início *
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.startAt}
                          onChange={e => setFormData({ ...formData, startAt: e.target.value })}
                          className="input w-full"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data/Hora Fim *
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.endAt}
                          onChange={e => setFormData({ ...formData, endAt: e.target.value })}
                          className="input w-full"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="input w-full"
                        rows={3}
                        placeholder="Notas sobre este ciclo..."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full sm:w-auto sm:ml-3"
                  >
                    {isLoading ? 'Salvando...' : (editingCycle ? 'Atualizar' : 'Criar')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isLoading}
                    className="btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteCycle && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setConfirmDeleteCycle(null)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Confirmar exclusão</h3>
                  <button type="button" onClick={() => setConfirmDeleteCycle(null)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-700">
                  Tem certeza que deseja excluir o ciclo <strong>{confirmDeleteCycle.name}</strong>?
                </p>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button onClick={confirmDelete} className="btn-primary w-full sm:w-auto sm:ml-3">
                  Excluir
                </button>
                <button onClick={() => setConfirmDeleteCycle(null)} className="btn-secondary w-full sm:w-auto mt-3 sm:mt-0">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CycleManager;
