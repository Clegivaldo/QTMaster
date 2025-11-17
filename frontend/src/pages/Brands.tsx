import React, { useState } from 'react';
import { Plus, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '@/hooks/useEquipment';

const Brands: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [deletingBrand, setDeletingBrand] = useState<any>(null);

  const { data: brands, isLoading, error } = useBrands();
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating brand:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao criar marca');
    }
  };

  const handleUpdate = async (data: any) => {
    console.log('Brands: handleUpdate called', { id: editingBrand?.id, data });
    const id = editingBrand?.id ?? (data?.id as string);
    if (!id) {
      console.error('Brands: missing id for update', { editingBrand, data });
      alert('ID da marca não encontrado para atualização');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data });
      setEditingBrand(null);
    } catch (error) {
      console.error('Error updating brand:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao atualizar marca');
    }
  };

  const handleDelete = async () => {
    if (!deletingBrand) return;
    try {
      await deleteMutation.mutateAsync(deletingBrand.id);
      setDeletingBrand(null);
    } catch (error) {
      console.error('Error deleting brand:', error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marcas"
        description="Gerencie as marcas de equipamentos"
        actions={
          <button
            onClick={() => { console.log('Brands: New button clicked'); setShowForm(true); }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Marca
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar marcas</h3>
              <div className="mt-2 text-sm text-red-700">
                {(error as any)?.response?.data?.error || (error as any)?.message || 'Erro desconhecido'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {brands?.map((brand: any) => (
                <div key={brand.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{brand.name}</h3>
                      {brand.description && (
                        <p className="mt-1 text-sm text-gray-600">{brand.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => { console.log('Brands: Edit clicked', brand); setEditingBrand(brand); }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => { console.log('Brands: Delete clicked', brand); setDeletingBrand(brand); }}
                        className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(!brands || brands.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma marca encontrada.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {(showForm || editingBrand) && (
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
                console.log('Brands: form submit', data);
                editingBrand ? handleUpdate(data) : handleCreate(data);
              }}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        {editingBrand ? 'Editar Marca' : 'Nova Marca'}
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
                            defaultValue={editingBrand?.name || ''}
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
                            defaultValue={editingBrand?.description || ''}
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
                    {editingBrand ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingBrand(null);
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
      {deletingBrand && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar Exclusão</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Tem certeza que deseja excluir a marca "{deletingBrand.name}"?
                      Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setDeletingBrand(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brands;