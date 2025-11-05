import React, { useState } from 'react';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useSensors, useSensorTypes } from '@/hooks/useSensors';
import { SensorFilters } from '@/types/sensor';

const Sensors: React.FC = () => {
  const [filters, setFilters] = useState<SensorFilters>({
    page: 1,
    limit: 10,
    sortBy: 'serialNumber',
    sortOrder: 'asc',
  });
  const [activeTab, setActiveTab] = useState<'sensors' | 'types'>('sensors');

  const { data: sensorsData, isLoading: sensorsLoading, error: sensorsError } = useSensors(filters);
  const { data: sensorTypes, isLoading: typesLoading, error: typesError } = useSensorTypes();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    setFilters({ ...filters, search: search || undefined, page: 1 });
  };

  return (
    <>
      <PageHeader
        title="Sensores"
        description="Gerencie os sensores e tipos de sensores"
        actions={
          <button 
            onClick={() => {/* TODO: Open sensor form */}}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Sensor
          </button>
        }
      />

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('sensors')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sensors'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sensores ({sensorsData?.pagination.total || 0})
            </button>
            <button
              onClick={() => setActiveTab('types')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'types'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tipos de Sensores ({sensorTypes?.length || 0})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'sensors' && (
        <>
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
                  placeholder="Buscar por número de série ou modelo..."
                  defaultValue={filters.search || ''}
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

          {/* Sensors Content */}
          <div className="bg-white shadow rounded-lg p-6">
            {sensorsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando sensores...</p>
              </div>
            ) : sensorsData?.sensors.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-4">
                  Nenhum sensor encontrado
                </div>
                <p className="text-gray-600">
                  Crie seu primeiro sensor para começar.
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-4">
                  Interface de sensores em desenvolvimento
                </div>
                <p className="text-gray-600">
                  A tabela de sensores será implementada em breve.
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  <p>Sensores encontrados: {sensorsData?.sensors.length || 0}</p>
                  <p>Total: {sensorsData?.pagination.total || 0}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'types' && (
        <>
          {/* Error state */}
          {typesError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erro ao carregar tipos de sensores
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Tente recarregar a página ou entre em contato com o suporte.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sensor Types Content */}
          <div className="bg-white shadow rounded-lg p-6">
            {typesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando tipos de sensores...</p>
              </div>
            ) : sensorTypes?.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-4">
                  Nenhum tipo de sensor encontrado
                </div>
                <p className="text-gray-600">
                  Configure os tipos de sensores para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sensorTypes?.map((type) => (
                  <div key={type.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{type.name}</h3>
                        {type.description && (
                          <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {type._count?.sensors || 0} sensores
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-primary-600 hover:text-primary-900 text-sm">
                          Editar
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900 text-sm"
                          disabled={(type._count?.sensors || 0) > 0}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>Temp: {type.dataConfig.temperatureColumn}</div>
                        <div>Timestamp: {type.dataConfig.timestampColumn}</div>
                        <div>Linha inicial: {type.dataConfig.startRow}</div>
                        <div>Formato: {type.dataConfig.dateFormat}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default Sensors;