import React, { useState } from 'react';
import { Plus, AlertTriangle, Edit, Trash2, Search } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useEquipmentModels, useCreateEquipmentModel, useUpdateEquipmentModel, useDeleteEquipmentModel, useBrands, useEquipmentTypes } from '@/hooks/useEquipment';

const Models: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [deletingModel, setDeletingModel] = useState<any>(null);

  const { data: models, isLoading, error } = useEquipmentModels();
  const { data: brands } = useBrands();
  const { data: types } = useEquipmentTypes();
  const createMutation = useCreateEquipmentModel();
  const updateMutation = useUpdateEquipmentModel();
  const deleteMutation = useDeleteEquipmentModel();

  const [filters, setFilters] = useState({ search: '' });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = String(formData.get('search') || '');
    setFilters({ ...filters, search });
  };

  const filteredModels = models?.filter((m: any) => {
    if (!filters.search) return true;
    const s = String(filters.search).toLowerCase();
    return (
      String(m.name || '').toLowerCase().includes(s) ||
      String(m.description || '').toLowerCase().includes(s) ||
      String(m.brand?.name || '').toLowerCase().includes(s) ||
      String(m.type?.name || '').toLowerCase().includes(s)
    );
  });

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating model:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao criar modelo');
    }
  };

  const handleUpdate = async (data: any) => {
    console.log('Models: handleUpdate called', { id: editingModel?.id, data });
    const id = editingModel?.id ?? (data?.id as string);
    if (!id) {
      console.error('Models: missing id for update', { editingModel, data });
      alert('ID do modelo não encontrado para atualização');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data });
      setEditingModel(null);
    } catch (error) {
      console.error('Error updating model:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao atualizar modelo');
    }
  };

  const handleDelete = async () => {
    if (!deletingModel) return;
    try {
      await deleteMutation.mutateAsync(deletingModel.id);
      setDeletingModel(null);
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelos"
        description="Gerencie os modelos de equipamentos"
        actions={
          <button
            onClick={() => { console.log('Models: New button clicked'); setShowForm(true); }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Modelo
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar modelos</h3>
              <div className="mt-2 text-sm text-red-700">
                {(error as any)?.response?.data?.error || (error as any)?.message || 'Erro desconhecido'}
              </div>
            </div>
          </div>
        </div>
      )}

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
              placeholder="Buscar por nome, marca, tipo ou descrição..."
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(!filteredModels || filteredModels.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhum modelo encontrado.</td>
                    </tr>
                  ) : (
                    filteredModels.map((model: any) => (
                      <tr key={model.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{model.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{model.brand?.name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{model.type?.name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{model.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => setEditingModel(model)} className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50" title="Editar"><Edit className="h-4 w-4"/></button>
                            <button onClick={() => setDeletingModel(model)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" title="Excluir"><Trash2 className="h-4 w-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden divide-y divide-gray-200">
              {filteredModels?.map((model: any) => (
                <div key={model.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{model.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">{model.brand?.name} • {model.type?.name}</p>
                      {model.description && <p className="mt-1 text-sm text-gray-500">{model.description}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => setEditingModel(model)} className="text-primary-600 hover:text-primary-900 p-2 rounded hover:bg-primary-50" title="Editar"><Edit className="h-4 w-4"/></button>
                      <button onClick={() => setDeletingModel(model)} className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50" title="Excluir"><Trash2 className="h-4 w-4"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showForm || editingModel) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name'),
                  brandId: formData.get('brandId'),
                  typeId: formData.get('typeId'),
                  description: formData.get('description'),
                };
                console.log('Models: form submit', data);
                editingModel ? handleUpdate(data) : handleCreate(data);
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        {editingModel ? 'Editar Modelo' : 'Novo Modelo'}
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
                            defaultValue={editingModel?.name || ''}
                            className="mobile-form-input h-10 w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="brandId" className="mobile-form-label">
                            Marca *
                          </label>
                          <select
                            name="brandId"
                            id="brandId"
                            required
                            defaultValue={editingModel?.brandId || ''}
                            className="mobile-form-input h-10 w-full"
                          >
                            <option value="">Selecione uma marca</option>
                            {brands?.map((brand: any) => (
                              <option key={brand.id} value={brand.id}>
                                {brand.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="typeId" className="mobile-form-label">
                            Tipo *
                          </label>
                          <select
                            name="typeId"
                            id="typeId"
                            required
                            defaultValue={editingModel?.typeId || ''}
                            className="mobile-form-input h-10 w-full"
                          >
                            <option value="">Selecione um tipo</option>
                            {types?.map((type: any) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="description" className="mobile-form-label">
                            Descrição
                          </label>
                          <textarea
                            name="description"
                            id="description"
                            rows={3}
                            defaultValue={editingModel?.description || ''}
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
                    {editingModel ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingModel(null);
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
      {deletingModel && (
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
                      Excluir Modelo
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja excluir o modelo <strong>{deletingModel.name}</strong>? 
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
                  onClick={() => setDeletingModel(null)}
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

export default Models;