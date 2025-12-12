import React, { useState } from 'react';
import { Plus, Search, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { parseToDate, formatBRShort } from '@/utils/parseDate';
import { useSensors, useSensorTypes, useCreateSensor, useUpdateSensor, useDeleteSensor } from '@/hooks/useSensors';
import { SensorFilters } from '@/types/sensor';
import SensorForm from '@/components/SensorForm';

const Sensors: React.FC = () => {
  const [filters, setFilters] = useState<SensorFilters>({
    page: 1,
    limit: 10,
    sortBy: 'serialNumber',
    sortOrder: 'asc',
  });
  const [showSensorForm, setShowSensorForm] = useState(false);
  const [editingSensor, setEditingSensor] = useState<any>(null);

  const { data: sensorsData, isLoading: sensorsLoading, error: sensorsError } = useSensors(filters);
  const { data: sensorTypes } = useSensorTypes();
  
  const createSensorMutation = useCreateSensor();
  const updateSensorMutation = useUpdateSensor();
  const deleteSensorMutation = useDeleteSensor();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    setFilters({ ...filters, search: search || undefined, page: 1 });
  };

  const handleCreateSensor = async (data: any) => {
    try {
      await createSensorMutation.mutateAsync(data);
      setShowSensorForm(false);
    } catch (error) {
      console.error('Error creating sensor:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao criar sensor');
    }
  };

  const handleUpdateSensor = async (data: any) => {
    if (!editingSensor) return;
    
    try {
      await updateSensorMutation.mutateAsync({ id: editingSensor.id, data });
      setEditingSensor(null);
    } catch (error) {
      console.error('Error updating sensor:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao atualizar sensor');
    }
  };

  const [deletingSensor, setDeletingSensor] = useState<any>(null);

  const handleDeleteSensor = async () => {
    if (!deletingSensor) return;
    
    try {
      await deleteSensorMutation.mutateAsync(deletingSensor.id);
      setDeletingSensor(null);
    } catch (error) {
      console.error('Error deleting sensor:', error);
      alert('Erro ao excluir sensor');
    }
  };

  return (
    <>
      <PageHeader
        title="Sensores"
        description="Gerencie os sensores do sistema"
        actions={
          <button 
            onClick={() => setShowSensorForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Sensor
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
              className="input w-full pl-10"
              placeholder="Buscar por número de série ou modelo..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined, page: 1 })}
            />
          </div>
          <select
            value={filters.typeId || ''}
            onChange={(e) => setFilters({ ...filters, typeId: e.target.value || undefined, page: 1 })}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos os tipos</option>
            {sensorTypes?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </form>
      </div>

      {/* Error state */}
      {sensorsError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erro ao carregar sensores
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Tente recarregar a página ou entre em contato com o suporte.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sensors Content - standardized table like Clients */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          {sensorsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando sensores...</p>
            </div>
          ) : sensorsData?.sensors.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">Nenhum sensor encontrado</div>
              <p className="text-gray-600">Crie seu primeiro sensor para começar.</p>
            </div>
          ) : (
            <div>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Série</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calibração</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sensorsData.sensors.map((sensor) => (
                      <tr key={sensor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary-600">{String(sensor.serialNumber || '').charAt(0).toUpperCase()}</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{sensor.serialNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sensor.model || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sensor.type?.name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sensor.calibrationDate ? formatBRShort(sensor.calibrationDate) : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => setEditingSensor(sensor)} className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50" title="Editar"><Edit className="h-4 w-4"/></button>
                            <button onClick={() => setDeletingSensor(sensor)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" title="Excluir"><Trash2 className="h-4 w-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden divide-y divide-gray-200">
                {sensorsData.sensors.map((sensor) => (
                  <div key={sensor.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{sensor.serialNumber}</h3>
                        <p className="mt-1 text-sm text-gray-600">{sensor.model} • {sensor.type?.name}</p>
                        {sensor.calibrationDate && (<p className="text-xs text-gray-400">Calibrado em: {formatBRShort(sensor.calibrationDate)}</p>)}
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => setEditingSensor(sensor)} className="text-primary-600 hover:text-primary-900 p-2 rounded hover:bg-primary-50" title="Editar"><Edit className="h-4 w-4"/></button>
                        <button onClick={() => setDeletingSensor(sensor)} className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50" title="Excluir"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Sensor Form Modal */}
      {showSensorForm && (
        <SensorForm
          sensorTypes={sensorTypes || []}
          onSubmit={handleCreateSensor}
          onCancel={() => setShowSensorForm(false)}
          isLoading={createSensorMutation.isLoading}
        />
      )}

      {/* Edit Sensor Form Modal */}
      {editingSensor && (
        <SensorForm
          sensor={editingSensor}
          sensorTypes={sensorTypes || []}
          onSubmit={handleUpdateSensor}
          onCancel={() => setEditingSensor(null)}
          isLoading={updateSensorMutation.isLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSensor && (
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
                      Excluir Sensor
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja excluir o sensor <strong>{deletingSensor.serialNumber}</strong>? 
                        Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteSensor}
                  disabled={deleteSensorMutation.isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteSensorMutation.isLoading ? 'Excluindo...' : 'Excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSensor(null)}
                  disabled={deleteSensorMutation.isLoading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sensors;