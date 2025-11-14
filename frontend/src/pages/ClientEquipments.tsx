import React, { useState } from 'react';
import { Plus, Search, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useClientEquipments, useCreateClientEquipment, useUpdateClientEquipment, useDeleteClientEquipment, useBrands, useEquipmentTypes, useEquipmentModels } from '@/hooks/useEquipment';
import { useClients } from '@/hooks/useClients';

const ClientEquipments: React.FC = () => {
  const [filters, setFilters] = useState({ page: 1, limit: 10, search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [deletingEquipment, setDeletingEquipment] = useState<any>(null);

  const { data: equipmentsData, isLoading, error } = useClientEquipments();
  const { data: clients } = useClients();
  const { data: brands } = useBrands();
  const { data: types } = useEquipmentTypes();
  const { data: models } = useEquipmentModels();
  const createMutation = useCreateClientEquipment();
  const updateMutation = useUpdateClientEquipment();
  const deleteMutation = useDeleteClientEquipment();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    setFilters({ ...filters, search, page: 1 });
  };

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating client equipment:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao criar equipamento de cliente');
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: editingEquipment.id, ...data });
      setEditingEquipment(null);
    } catch (error) {
      console.error('Error updating client equipment:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao atualizar equipamento de cliente');
    }
  };

  const handleDelete = async () => {
    if (!deletingEquipment) return;
    try {
      await deleteMutation.mutateAsync(deletingEquipment.id);
      setDeletingEquipment(null);
    } catch (error) {
      console.error('Error deleting client equipment:', error);
    }
  };

  const filteredEquipments = equipmentsData?.filter((equipment: any) =>
    !filters.search ||
    equipment.serialNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
    equipment.client?.name.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipamentos de Clientes"
        description="Gerencie os equipamentos dos clientes"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Equipamento
          </button>
        }
      />

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              name="search"
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Buscar por número de série ou cliente..."
              defaultValue={filters.search}
            />
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar equipamentos</h3>
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
              {filteredEquipments?.map((equipment: any) => (
                <div key={equipment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{equipment.serialNumber}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {equipment.client?.name} • {equipment.brand?.name} • {equipment.model?.name}
                      </p>
                      {equipment.assetNumber && (
                        <p className="mt-1 text-sm text-gray-500">Patrimônio: {equipment.assetNumber}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingEquipment(equipment)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => setDeletingEquipment(equipment)}
                        className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(!filteredEquipments || filteredEquipments.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum equipamento encontrado.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {(showForm || editingEquipment) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  clientId: formData.get('clientId'),
                  equipmentTypeId: formData.get('equipmentTypeId'),
                  brandId: formData.get('brandId'),
                  modelId: formData.get('modelId'),
                  serialNumber: formData.get('serialNumber'),
                  assetNumber: formData.get('assetNumber'),
                  tag: formData.get('tag'),
                  acceptanceMinTemp: formData.get('acceptanceMinTemp'),
                  acceptanceMaxTemp: formData.get('acceptanceMaxTemp'),
                  acceptanceMinHum: formData.get('acceptanceMinHum'),
                  acceptanceMaxHum: formData.get('acceptanceMaxHum'),
                  acceptanceNotes: formData.get('acceptanceNotes'),
                };
                editingEquipment ? handleUpdate(data) : handleCreate(data);
              }}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                      Cliente *
                    </label>
                    <select
                      name="clientId"
                      id="clientId"
                      required
                      defaultValue={editingEquipment?.clientId || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Selecione um cliente</option>
                      {clients?.clients?.map((client: any) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="equipmentTypeId" className="block text-sm font-medium text-gray-700">
                      Tipo de Equipamento *
                    </label>
                    <select
                      name="equipmentTypeId"
                      id="equipmentTypeId"
                      required
                      defaultValue={editingEquipment?.equipmentTypeId || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
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
                    <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
                      Marca *
                    </label>
                    <select
                      name="brandId"
                      id="brandId"
                      required
                      defaultValue={editingEquipment?.brandId || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
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
                    <label htmlFor="modelId" className="block text-sm font-medium text-gray-700">
                      Modelo *
                    </label>
                    <select
                      name="modelId"
                      id="modelId"
                      required
                      defaultValue={editingEquipment?.modelId || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Selecione um modelo</option>
                      {models?.map((model: any) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700">
                      Número de Série *
                    </label>
                    <input
                      type="text"
                      name="serialNumber"
                      id="serialNumber"
                      required
                      defaultValue={editingEquipment?.serialNumber || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="assetNumber" className="block text-sm font-medium text-gray-700">
                      Número do Patrimônio
                    </label>
                    <input
                      type="text"
                      name="assetNumber"
                      id="assetNumber"
                      defaultValue={editingEquipment?.assetNumber || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="tag" className="block text-sm font-medium text-gray-700">
                      Tag
                    </label>
                    <input
                      type="text"
                      name="tag"
                      id="tag"
                      defaultValue={editingEquipment?.tag || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingEquipment(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                  >
                    {editingEquipment ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEquipment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar Exclusão</h3>
              <p className="text-sm text-gray-500 mb-4">
                Tem certeza que deseja excluir o equipamento "{deletingEquipment.serialNumber}"?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingEquipment(null)}
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
      )}
    </div>
  );
};

export default ClientEquipments;