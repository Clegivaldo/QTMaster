import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Calendar,
  Thermometer,
  Droplets
} from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useValidations, useCreateValidation, useUpdateValidationApproval, useDeleteValidation } from '@/hooks/useValidations';
import { Validation, ValidationFilters } from '@/types/validation';

import ValidationCreationModal, { ValidationCreationData } from '@/components/ValidationCreationModal';


const Validations: React.FC = () => {
  const [filters, setFilters] = useState<ValidationFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [deletingValidation, setDeletingValidation] = useState<Validation | null>(null);

  const { data, isLoading, error } = useValidations(filters);
  const createMutation = useCreateValidation();
  const updateApprovalMutation = useUpdateValidationApproval();
  const deleteMutation = useDeleteValidation();
  

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    setFilters({ ...filters, search: search || undefined, page: 1 });
  };

  const handleCreateValidation = async (data: ValidationCreationData) => {
    try {
      // Transformar os dados do modal de criação para o formato esperado pelo backend
      const validationData = {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        suitcaseId: '', // Será preenchido posteriormente
        parameters: {
          minTemperature: 2,
          maxTemperature: 8,
          minHumidity: undefined,
          maxHumidity: undefined,
        },
        sensorDataIds: [], // Será preenchido quando importar dados dos sensores
      };
      
      await createMutation.mutateAsync(validationData);
      setShowCreationModal(false);
    } catch (error) {
      console.error('Error creating validation:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao criar validação');
    }
  };

  const handleApproveValidation = async (validationId: string, isApproved: boolean) => {
    if (!confirm(`Tem certeza que deseja ${isApproved ? 'aprovar' : 'reprovar'} esta validação?`)) return;
    
    try {
      await updateApprovalMutation.mutateAsync({ id: validationId, isApproved });
    } catch (error) {
      console.error('Error updating validation approval:', error);
      alert('Erro ao atualizar status da validação');
    }
  };

  const handleDeleteValidation = async () => {
    if (!deletingValidation) return;
    
    try {
      await deleteMutation.mutateAsync(deletingValidation.id);
      setDeletingValidation(null);
    } catch (error) {
      console.error('Error deleting validation:', error);
      alert('Erro ao excluir validação');
    }
  };

  const getStatusIcon = (validation: Validation) => {
    if (validation.isApproved === null) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
    return validation.isApproved 
      ? <CheckCircle className="h-5 w-5 text-green-500" />
      : <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = (validation: Validation) => {
    if (validation.isApproved === null) return 'Pendente';
    return validation.isApproved ? 'Aprovado' : 'Reprovado';
  };

  const getStatusColor = (validation: Validation) => {
    if (validation.isApproved === null) return 'bg-yellow-100 text-yellow-800';
    return validation.isApproved 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <>
      <PageHeader
        title="Validações Térmicas"
        description="Gerencie as validações de temperatura e umidade"
        actions={
          <button 
            onClick={() => setShowCreationModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Validação
          </button>
        }
      />

      {/* Search and Filters */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              name="search"
              type="text"
              className="input w-full pl-10"
              placeholder="Buscar por nome ou descrição..."
              defaultValue={filters.search || ''}
            />
          </div>
          <select
            value={filters.isApproved?.toString() || ''}
            onChange={(e) => {
              const value = e.target.value;
              setFilters({ 
                ...filters, 
                isApproved: value === '' ? undefined : value === 'true',
                page: 1 
              });
            }}
            className="input w-full sm:w-auto"
          >
            <option value="">Todos os status</option>
            <option value="true">Aprovados</option>
            <option value="false">Reprovados</option>
          </select>

        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erro ao carregar validações
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Tente recarregar a página ou entre em contato com o suporte.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando validações...</p>
          </div>
        ) : data?.validations.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-400 text-lg mb-4">
              Nenhuma validação encontrada
            </div>
            <p className="text-gray-600">
              Crie sua primeira validação térmica para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Grid of validations */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
              {data?.validations.map((validation) => (
                <div key={validation.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 mb-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900">
                          {validation.name}
                        </h3>
                        <div className="flex items-center text-xs sm:text-sm text-gray-500">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          {formatDate(validation.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      {getStatusIcon(validation)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(validation)}`}>
                        {getStatusText(validation)}
                      </span>
                    </div>
                  </div>

                  {/* Client and Suitcase */}
                  <div className="mb-4 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Cliente:</span>{' '}
                      <span className="text-gray-900">{validation.client?.name}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Maleta:</span>{' '}
                      <span className="text-gray-900">{validation.suitcase?.name}</span>
                    </div>
                  </div>

                  {/* Parameters */}
                  <div className="mb-4">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Parâmetros</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center">
                        <Thermometer className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-2" />
                        <span className="text-gray-600">
                          {validation.minTemperature}°C - {validation.maxTemperature}°C
                        </span>
                      </div>
                      {validation.minHumidity !== null && validation.maxHumidity !== null && (
                        <div className="flex items-center">
                          <Droplets className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mr-2" />
                          <span className="text-gray-600">
                            {validation.minHumidity}% - {validation.maxHumidity}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statistics */}
                  {validation.statistics && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Estatísticas</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">
                            {validation.statistics.totalReadings}
                          </div>
                          <div className="text-xs text-gray-500">Leituras</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {formatPercentage(validation.statistics.conformityPercentage)}
                          </div>
                          <div className="text-xs text-gray-500">Conformidade</div>
                        </div>
                      </div>
                      
                      {/* Temperature stats */}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {validation.statistics.temperature.min}°C
                          </div>
                          <div className="text-gray-500">Mín</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {validation.statistics.temperature.average}°C
                          </div>
                          <div className="text-gray-500">Média</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {validation.statistics.temperature.max}°C
                          </div>
                          <div className="text-gray-500">Máx</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {validation._count?.sensorData || 0} dados • {validation._count?.reports || 0} relatórios
                    </span>
                    <div className="flex space-x-2">
                      <button 
                          onClick={() => alert('Funcionalidade de gráficos será implementada em breve')}
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          Ver Gráficos
                        </button>
                        <button 
                          onClick={() => alert('Funcionalidade de detalhes será implementada em breve')}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Detalhes
                        </button>
                        {validation.isApproved === null && (
                          <>
                            <button 
                              onClick={() => handleApproveValidation(validation.id, true)}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Aprovar
                            </button>
                            <button 
                              onClick={() => handleApproveValidation(validation.id, false)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Reprovar
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => setDeletingValidation(validation)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Excluir
                        </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {(data.pagination.page - 1) * data.pagination.limit + 1} até{' '}
                    {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de{' '}
                    {data.pagination.total} validações
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
                      disabled={!data.pagination.hasPrev}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                      disabled={!data.pagination.hasNext}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          Como Funciona
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• As validações analisam os dados importados dos sensores</p>
          <p>• Configure limites de temperatura e umidade para cada validação</p>
          <p>• O sistema calcula estatísticas e percentual de conformidade automaticamente</p>
          <p>• Validações aprovadas podem ser usadas para gerar relatórios oficiais</p>
          <p>• Gráficos mostram dados ao longo do tempo com limites visuais</p>
        </div>
      </div>

      {/* Create Validation Modal */}
      {showCreationModal && (
        <ValidationCreationModal
          isOpen={showCreationModal}
          onClose={() => setShowCreationModal(false)}
          onSubmit={handleCreateValidation}
          isLoading={createMutation.isLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingValidation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar Exclusão
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Tem certeza que deseja excluir a validação "{deletingValidation.name}"? 
                    Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleDeleteValidation}
                disabled={deleteMutation.isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isLoading ? 'Excluindo...' : 'Excluir'}
              </button>
              <button
                type="button"
                onClick={() => setDeletingValidation(null)}
                disabled={deleteMutation.isLoading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Validations;