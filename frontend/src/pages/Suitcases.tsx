import React, { useState } from 'react';
import { Plus, Search, Package, AlertTriangle, Edit, Trash2, Calendar } from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { parseToDate, formatBRShort } from '@/utils/parseDate';
import { useSuitcases, useDeleteSuitcase, useCreateSuitcase, useUpdateSuitcase } from '@/hooks/useSuitcases';
import { Suitcase, SuitcaseFilters } from '@/types/suitcase';
import SuitcaseForm from '@/components/SuitcaseForm';
import { useSensors } from '@/hooks/useSensors';

const Suitcases: React.FC = () => {
  const [filters, setFilters] = useState<SuitcaseFilters>({
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [deletingSuitcase, setDeletingSuitcase] = useState<Suitcase | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSuitcase, setEditingSuitcase] = useState<Suitcase | null>(null);

  const { data, isLoading, error } = useSuitcases(filters);
  const deleteMutation = useDeleteSuitcase();
  const createMutation = useCreateSuitcase();
  const updateMutation = useUpdateSuitcase();
  const { data: sensorsData } = useSensors();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    setFilters({ ...filters, search: search || undefined, page: 1 });
  };

  const handleDeleteSuitcase = async () => {
    if (!deletingSuitcase) return;
    
    try {
      await deleteMutation.mutateAsync(deletingSuitcase.id);
      setDeletingSuitcase(null);
    } catch (error) {
      console.error('Error deleting suitcase:', error);
    }
  };

  const handleCreateSuitcase = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating suitcase:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao criar maleta');
    }
  };

  const handleUpdateSuitcase = async (data: any) => {
    if (!editingSuitcase) return;
    
    try {
      await updateMutation.mutateAsync({ id: editingSuitcase.id, data });
      setEditingSuitcase(null);
    } catch (error) {
      console.error('Error updating suitcase:', error);
      const serverMessage = (error as any)?.response?.data?.error || (error as any)?.message;
      alert(serverMessage || 'Erro ao atualizar maleta');
    }
  };

  const formatDate = (dateString: string) => {
    return formatBRShort(dateString);
  };

  return (
    <>
      <PageHeader
        title="Maletas"
        description="Gerencie as maletas de sensores"
        actions={
          <button 
            onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Maleta
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
              placeholder="Buscar por nome ou descrição..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined, page: 1 })}
            />
          </div>

        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erro ao carregar maletas
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Tente recarregar a página ou entre em contato com o suporte.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content - standardized table like Clients */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando maletas...</p>
            </div>
          ) : data?.suitcases.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-400 text-lg mb-4">Nenhuma maleta encontrada</div>
              <p className="text-gray-600">Crie sua primeira maleta para organizar os sensores.</p>
            </div>
          ) : (
            <div>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensores</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validações</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.suitcases.map((suitcase) => (
                      <tr key={suitcase.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <Package className="h-5 w-5 text-primary-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{suitcase.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(suitcase.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{suitcase.sensors?.length || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{suitcase._count?.validations || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => setEditingSuitcase(suitcase)} className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50" title="Editar"><Edit className="h-4 w-4"/></button>
                            <button onClick={() => setDeletingSuitcase(suitcase)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" title="Excluir" disabled={(suitcase._count?.validations || 0) > 0}><Trash2 className="h-4 w-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden divide-y divide-gray-200">
                {data.suitcases.map((suitcase) => (
                  <div key={suitcase.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{suitcase.name}</h3>
                        <div className="flex items-center text-sm text-gray-500"><Calendar className="h-4 w-4 mr-1"/>{formatDate(suitcase.createdAt)}</div>
                        <p className="text-sm text-gray-500 mt-1">Sensores: {suitcase.sensors?.length || 0} • Validações: {suitcase._count?.validations || 0}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button onClick={() => setEditingSuitcase(suitcase)} className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50" title="Editar"><Edit className="h-4 w-4"/></button>
                        <button onClick={() => setDeletingSuitcase(suitcase)} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" title="Excluir" disabled={(suitcase._count?.validations || 0) > 0}><Trash2 className="h-4 w-4"/></button>
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
                      Mostrando {(data.pagination.page - 1) * data.pagination.limit + 1} até {' '}
                      {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de {' '}
                      {data.pagination.total} maletas
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
      </div>

      {/* Delete Confirmation Modal */}
      {deletingSuitcase && (
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
                      Excluir Maleta
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja excluir a maleta <strong>{deletingSuitcase.name}</strong>? 
                        Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteSuitcase}
                  disabled={deleteMutation.isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isLoading ? 'Excluindo...' : 'Excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSuitcase(null)}
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

      {/* Create Form Modal */}
      {showForm && (
        <SuitcaseForm
          onSubmit={handleCreateSuitcase}
          onCancel={() => setShowForm(false)}
          isLoading={createMutation.isLoading}
          availableSensors={sensorsData?.sensors || []}
        />
      )}

      {/* Edit Form Modal */}
      {editingSuitcase && (
        <SuitcaseForm
          suitcase={editingSuitcase}
          onSubmit={handleUpdateSuitcase}
          onCancel={() => setEditingSuitcase(null)}
          isLoading={updateMutation.isLoading}
          availableSensors={sensorsData?.sensors || []}
        />
      )}
    </>
  );
};

export default Suitcases;