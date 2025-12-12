import React, { useState } from 'react';
import { Plus, AlertTriangle, Edit, Trash2, Search } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useEquipmentTypes, useCreateEquipmentType, useUpdateEquipmentType, useDeleteEquipmentType } from '@/hooks/useEquipment';

const EquipmentTypes: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [deletingType, setDeletingType] = useState<any>(null);

  const { data: equipmentTypes, isLoading, error } = useEquipmentTypes();
  const [filters, setFilters] = useState({ search: '' });
  const createMutation = useCreateEquipmentType();
  const updateMutation = useUpdateEquipmentType();
  const deleteMutation = useDeleteEquipmentType();

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating equipment type:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao criar tipo de equipamento');
    }
  };

  const handleUpdate = async (data: any) => {
    console.log('EquipmentTypes: handleUpdate called', { id: editingType?.id, data });
    const id = editingType?.id ?? (data?.id as string);
    if (!id) {
      console.error('EquipmentTypes: missing id for update', { editingType, data });
      alert('ID do tipo de equipamento não encontrado para atualização');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data });
      setEditingType(null);
    } catch (error) {
      console.error('Error updating equipment type:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao atualizar tipo de equipamento');
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    try {
      await deleteMutation.mutateAsync(deletingType.id);
      setDeletingType(null);
    } catch (error) {
      console.error('Error deleting equipment type:', error);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = String(formData.get('search') || '');
    setFilters({ ...filters, search });
  };

  const filteredEquipmentTypes = equipmentTypes?.filter((t: any) => {
    if (!filters.search) return true;
    const s = String(filters.search).toLowerCase();
    return (
      String(t.name || '').toLowerCase().includes(s) ||
      String(t.description || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Equipamento"
        description="Gerencie os tipos de equipamentos disponíveis"
        actions={
          <button
            onClick={() => { console.log('EquipmentTypes: New button clicked'); setShowForm(true); }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Tipo
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar tipos de equipamento</h3>
              <div className="mt-2 text-sm text-red-700">
                {(error as any)?.response?.data?.error || (error as any)?.message || 'Erro desconhecido'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              name="search"
              type="text"
              className="input w-full pl-10"
              placeholder="Buscar por nome ou descrição..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || '' })}
            />
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(!filteredEquipmentTypes || filteredEquipmentTypes.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">Nenhum tipo de equipamento encontrado.</td>
                    </tr>
                  ) : (
                    filteredEquipmentTypes.map((type: any) => (
                      <tr key={type.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{type.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{type.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => setEditingType(type)} className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50" title="Editar"><Edit className="h-4 w-4"/></button>
                            <button onClick={() => setDeletingType(type)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" title="Excluir"><Trash2 className="h-4 w-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden divide-y divide-gray-200">
              {filteredEquipmentTypes?.map((type: any) => (
                <div key={type.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{type.name}</h3>
                      {type.description && <p className="mt-1 text-sm text-gray-600">{type.description}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => setEditingType(type)} className="text-primary-600 hover:text-primary-900 p-2 rounded hover:bg-primary-50" title="Editar"><Edit className="h-4 w-4"/></button>
                      <button onClick={() => setDeletingType(type)} className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50" title="Excluir"><Trash2 className="h-4 w-4"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showForm || editingType) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name'),
                  description: formData.get('description'),
                };
                console.log('EquipmentTypes: form submit', data);
                editingType ? handleUpdate(data) : handleCreate(data);
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        {editingType ? 'Editar Tipo de Equipamento' : 'Novo Tipo de Equipamento'}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="name" className="mobile-form-label">
                            Nome *
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            defaultValue={editingType?.name || ''}
                            className="mobile-form-input h-10 w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="description" className="mobile-form-label">
                            Descrição
                          </label>
                          <textarea
                            name="description"
                            id="description"
                            rows={3}
                            defaultValue={editingType?.description || ''}
                            className="mobile-form-input h-24 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingType ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingType(null);
                    }}
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingType && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Excluir Tipo de Equipamento
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja excluir o tipo de equipamento <strong>{deletingType.name}</strong>? 
                        Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isLoading ? 'Excluindo...' : 'Excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingType(null)}
                  disabled={deleteMutation.isLoading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
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

export default EquipmentTypes;