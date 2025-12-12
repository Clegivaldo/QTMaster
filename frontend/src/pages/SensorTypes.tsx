import React, { useState } from 'react';
import { Plus, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useSensorTypes, useCreateSensorType, useUpdateSensorType, useDeleteSensorType } from '@/hooks/useSensors';
import SensorTypeForm from '@/components/SensorTypeForm';

const SensorTypes: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [deletingType, setDeletingType] = useState<any>(null);

  const { data: sensorTypes, isLoading, error } = useSensorTypes();
  const createMutation = useCreateSensorType();
  const updateMutation = useUpdateSensorType();
  const deleteMutation = useDeleteSensorType();

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating sensor type:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao criar tipo de sensor');
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: editingType.id, ...data });
      setEditingType(null);
    } catch (error) {
      console.error('Error updating sensor type:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao atualizar tipo de sensor');
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    try {
      await deleteMutation.mutateAsync(deletingType.id);
      setDeletingType(null);
    } catch (error) {
      console.error('Error deleting sensor type:', error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Sensor"
        description="Gerencie os tipos de sensores disponíveis no sistema"
        actions={
          <button
            onClick={() => setShowForm(true)}
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
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar tipos de sensor</h3>
              <div className="mt-2 text-sm text-red-700">
                {(error as any)?.response?.data?.error || (error as any)?.message || 'Erro desconhecido'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div>
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
                    {(!sensorTypes || sensorTypes.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-500">Nenhum tipo de sensor encontrado.</td>
                      </tr>
                    ) : (
                      sensorTypes.map((type: any) => (
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
                {sensorTypes?.map((type: any) => (
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
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {(showForm || editingType) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {editingType ? 'Editar Tipo de Sensor' : 'Novo Tipo de Sensor'}
                    </h3>
                    <SensorTypeForm
                      sensorType={editingType}
                      onSubmit={editingType ? handleUpdate : handleCreate}
                      onCancel={() => {
                        setShowForm(false);
                        setEditingType(null);
                      }}
                    />
                  </div>
                </div>
              </div>
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
                      Excluir Tipo de Sensor
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja excluir o tipo de sensor <strong>{deletingType.name}</strong>? 
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

export default SensorTypes;