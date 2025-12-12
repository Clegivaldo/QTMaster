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
  Droplets,
  Eye,
  Edit,
  Trash2,
  FileText,
  Upload,
  Download,
  Check,
  X
} from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { useValidations, useCreateValidation, useUpdateValidationApproval, useDeleteValidation } from '@/hooks/useValidations';
import { useQueryClient } from 'react-query';
import { validationKeys } from '@/hooks/useValidations';
import { useNavigate } from 'react-router-dom';
import { Validation, ValidationFilters } from '@/types/validation';
import { useToast } from '@/components/ToastContext';

import ValidationCreationModal, { ValidationCreationData } from '@/components/ValidationCreationModal';
import { parseApiError } from '@/utils/apiErrors';
import { parseToDate, formatBRShort } from '@/utils/parseDate';
import TemplateSelectionModal from '@/components/TemplateSelectionModal';
import { apiService } from '@/services/api';


const Validations: React.FC = () => {
  const [filters, setFilters] = useState<ValidationFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [editingValidation, setEditingValidation] = useState<Validation | null>(null);
  const [deletingValidation, setDeletingValidation] = useState<Validation | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [selectedValidationForReport, setSelectedValidationForReport] = useState<Validation | null>(null);

  const { data, isLoading, error } = useValidations(filters);
  const createMutation = useCreateValidation();
  const queryClient = useQueryClient();
  const updateApprovalMutation = useUpdateValidationApproval();
  const deleteMutation = useDeleteValidation();
  const toast = useToast();


  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    setFilters({ ...filters, search: search || undefined, page: 1 });
  };

  const navigate = useNavigate();

  const handleCreateValidation = async (data: ValidationCreationData) => {
    try {
      if (editingValidation) {
        // Update criteria endpoint only (name/client/equipment are kept readonly in edit)
        const payload = {
          minTemperature: data.minTemperature,
          maxTemperature: data.maxTemperature,
          minHumidity: data.minHumidity ?? null,
          maxHumidity: data.maxHumidity ?? null,
        };
        await apiService.api.put(`/validations/${editingValidation.id}/criteria`, payload);
        toast.success('Validação atualizada com sucesso');
        setShowCreationModal(false);
        setEditingValidation(null);
        setFilters(f => ({ ...f }));
        return;
      }

      // Transform create data
      const validationData = {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        validationNumber: data.certificateNumber,
        equipmentId: data.equipmentId,
        parameters: {
          minTemperature: data.minTemperature,
          maxTemperature: data.maxTemperature,
          minHumidity: data.minHumidity,
          maxHumidity: data.maxHumidity,
        },
        sensorDataIds: [], // Será preenchido quando importar dados dos sensores
      };

      const response = await createMutation.mutateAsync(validationData);
      const createdId = response?.data?.data?.validation?.id;
      setShowCreationModal(false);
      if (createdId) {
        navigate(`/import?validationId=${createdId}&clientId=${validationData.clientId}`);
      }
    } catch (error) {
      console.error('Error creating/updating validation:', error);
      const message = parseApiError(error);
      toast.error(message || 'Erro ao criar/atualizar validação');
    }
  };

  const [confirmApproval, setConfirmApproval] = useState<{ id: string; isApproved: boolean } | null>(null);

  const handleApproveValidation = async (validationId: string, isApproved: boolean) => {
    setConfirmApproval({ id: validationId, isApproved });
  };

  const confirmApprovalAction = async () => {
    if (!confirmApproval) return;
    try {
      await updateApprovalMutation.mutateAsync({ id: confirmApproval.id, isApproved: confirmApproval.isApproved });
      toast.success(`Validação ${confirmApproval.isApproved ? 'aprovada' : 'reprovada'} com sucesso!`);
    } catch (error) {
      console.error('Error updating validation approval:', error);
      toast.error('Erro ao atualizar status da validação');
    }
    setConfirmApproval(null);
  };

  const handleDeleteValidation = async () => {
    if (!deletingValidation) return;

    try {
      await deleteMutation.mutateAsync(deletingValidation.id);
      setDeletingValidation(null);
      toast.success('Validação excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting validation:', error);
      const message = parseApiError(error);
      if (message.includes('Cannot delete validation with associated reports')) {
        toast.error('Remova ou arquive os relatórios antes de excluir esta validação.', 8000);
      } else {
        toast.error(message || 'Erro ao excluir validação');
      }
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
    return formatBRShort(dateString);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleGenerateReport = async (validation: Validation) => {
    setSelectedValidationForReport(validation);
  };

  const handleTemplateSelected = async (templateId: string) => {
    if (!selectedValidationForReport) return;

    try {
      setGeneratingReport(selectedValidationForReport.id);

      // Use reports generation endpoint which saves the PDF server-side and returns a download URL
      const timeout = Number((import.meta as any).env?.VITE_REPORT_GENERATION_TIMEOUT) || 120000;

      const resp = await apiService.api.post(
        `/reports/generate/${selectedValidationForReport.id}`,
        {},
        { params: { templateId }, timeout }
      );

      const data = resp.data?.data;
      if (data && data.downloadUrl) {
        // Auto-download generated PDF once created, but keep record on server
        try {
          // Strip /api prefix if present, as apiService.api already adds it
          const downloadUrl = data.downloadUrl.startsWith('/api') ? data.downloadUrl.substring(4) : data.downloadUrl;
          const dlResp = await apiService.api.get(downloadUrl, { responseType: 'blob', timeout: 60000 });
          const blob = dlResp.data as Blob;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename || `laudo_${selectedValidationForReport.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (dlErr) {
          // If download failed, still notify success and provide URL
          console.warn('Generated but failed to auto-download:', dlErr);
          toast.info('Laudo gerado — use o botão de download para baixar o arquivo.');
        }

        toast.success('PDF gerado com sucesso!');
      } else {
        toast.error('Resposta inesperada do servidor ao gerar PDF');
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      const message = error?.response?.data?.message || error?.message || 'Erro ao gerar PDF';
      toast.error(message);
    } finally {
      setGeneratingReport(null);
      setSelectedValidationForReport(null);
    }
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
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined, page: 1 })}
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
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.validations.map((validation) => (
                    <tr key={validation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{validation.name}</div>
                          { (validation._count?.reports || 0) > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Laudo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{validation.client?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(validation)}`}>
                          {getStatusText(validation)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(validation.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleGenerateReport(validation)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                            disabled={(validation._count?.sensorData || 0) === 0 || generatingReport === validation.id}
                            title="Gerar relatório"
                          >
                            {generatingReport === validation.id ? '⏳' : <FileText className="h-4 w-4" />}
                          </button>
                          {(validation._count?.reports || 0) > 0 && (
                            <button
                              onClick={async () => {
                                try {
                                  setGeneratingReport(validation.id);
                                  const resp = await apiService.api.get(`/reports`, { params: { validationId: validation.id, page: 1, limit: 1 } });
                                  const reports = resp.data?.data?.reports || [];
                                  if (reports.length === 0) { toast.error('Nenhum relatório encontrado'); return; }
                                  const report = reports[0];
                                  const dl = await apiService.api.get(`/reports/${report.id}/download`, { responseType: 'blob' });
                                  const blob = dl.data as Blob;
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a'); a.href = url; a.download = report.name?.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf'; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
                                } catch (err) { console.error('Erro ao baixar relatório:', err); toast.error('Erro ao baixar relatório'); } finally { setGeneratingReport(null); }
                              }}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                              title="Baixar último relatório"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => navigate(`/validations/${validation.id}/charts`)} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={(validation._count?.sensorData || 0) === 0} title="Gráficos">
                            <BarChart3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => navigate(`/validations/${validation.id}/details`)} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-slate-600 hover:bg-slate-700 text-white" title="Detalhes">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setEditingValidation(validation); setShowCreationModal(true); }} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white" title="Editar">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => navigate(`/import?validationId=${validation.id}&clientId=${validation.clientId}&suitcaseId=${validation.suitcase?.id || ''}`)} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-teal-600 hover:bg-teal-700 text-white" title="Importar dados">
                            <Upload className="h-4 w-4" />
                          </button>
                          {validation.isApproved === null && (
                            <>
                              <button onClick={() => handleApproveValidation(validation.id, true)} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white" title="Aprovar"><Check className="h-4 w-4" /></button>
                              <button onClick={() => handleApproveValidation(validation.id, false)} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white" title="Reprovar"><X className="h-4 w-4" /></button>
                            </>
                          )}
                          <button onClick={() => setDeletingValidation(validation)} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden divide-y divide-gray-200">
              {data?.validations.map((validation) => (
                <div key={validation.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{validation.name}</h3>
                      <div className="text-sm text-gray-500">{validation.client?.name} • {validation.suitcase?.name}</div>
                      <div className="mt-1 text-sm"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(validation)}`}>{getStatusText(validation)}</span></div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGenerateReport(validation)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={(validation._count?.sensorData || 0) === 0 || generatingReport === validation.id}
                        title="Gerar relatório"
                      >
                        {generatingReport === validation.id ? '⏳' : <FileText className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditingValidation(validation)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
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
          onClose={() => { setShowCreationModal(false); setEditingValidation(null); }}
          onSubmit={handleCreateValidation}
          isLoading={createMutation.isLoading}
          initialData={editingValidation ? {
            clientId: editingValidation.clientId,
            equipmentId: editingValidation.equipmentId,
            certificateNumber: editingValidation.validationNumber,
            name: editingValidation.name,
            description: editingValidation.description || undefined,
            minTemperature: editingValidation.minTemperature,
            maxTemperature: editingValidation.maxTemperature,
            minHumidity: editingValidation.minHumidity ?? undefined,
            maxHumidity: editingValidation.maxHumidity ?? undefined,
          } : undefined}
          isEdit={!!editingValidation}
        />
      )}

      {/* Template Selection Modal */}
      {selectedValidationForReport && (
        <TemplateSelectionModal
          isOpen={!!selectedValidationForReport}
          onClose={() => setSelectedValidationForReport(null)}
          onSelectTemplate={handleTemplateSelected}
          isLoading={generatingReport === selectedValidationForReport.id}
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

      {/* Approval Confirmation Modal */}
      {confirmApproval && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar {confirmApproval.isApproved ? 'aprovação' : 'reprovação'}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Tem certeza que deseja {confirmApproval.isApproved ? 'aprovar' : 'reprovar'} esta validação?
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={confirmApprovalAction}
                disabled={updateApprovalMutation.isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateApprovalMutation.isLoading ? 'Confirmando...' : (confirmApproval.isApproved ? 'Aprovar' : 'Reprovar')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmApproval(null)}
                disabled={updateApprovalMutation.isLoading}
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