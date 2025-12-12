import { useState } from 'react';
import { 
  Plus as PlusIcon, 
  Search as SearchIcon, 
  Filter as FunnelIcon,
  FileText as DocumentTextIcon,
  Eye as EyeIcon,
  Edit as PencilIcon,
  Trash2 as TrashIcon,
  Download as ArrowDownTrayIcon,
  BarChart3 as ChartBarIcon,
  FileText as DocumentIcon,
  Printer as PrinterIcon,
} from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';
import { parseToDate, formatDisplayTime } from '@/utils/parseDate';
import { useReports, useDeleteReport, useReportStatistics, useGeneratePdf, usePreviewPdf, useDownloadReport } from '../hooks/useReports';
import { useClients } from '../hooks/useClients';
import { Report, ReportFilters, ReportStatus } from '../types/report';
import { ReportForm } from '../components/ReportForm';
import { ReportDetailsModal } from '../components/ReportDetailsModal';
import { ReportStatisticsCard } from '../components/ReportStatisticsCard';

const statusColors: Record<ReportStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  VALIDATED: 'bg-yellow-100 text-yellow-800',
  FINALIZED: 'bg-green-100 text-green-800',
};

const statusLabels: Record<ReportStatus, string> = {
  DRAFT: 'Rascunho',
  VALIDATED: 'Validado',
  FINALIZED: 'Finalizado',
};

export default function Reports() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: reportsData, isLoading, error } = useReports(page, 10, filters);
  const { data: clientsData } = useClients({});
  const { data: statisticsData } = useReportStatistics();
  const deleteReportMutation = useDeleteReport();
  const generatePdfMutation = useGeneratePdf();
  const previewPdfMutation = usePreviewPdf();
  const downloadReportMutation = useDownloadReport();

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setPage(1);
  };

  const handleFilterChange = (newFilters: Partial<ReportFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
    setShowFilters(false);
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const handleEditReport = (report: Report) => {
    setSelectedReport(report);
    setShowCreateForm(true);
  };

  const handleDeleteReport = (report: Report) => {
    setReportToDelete(report);
    setShowDeleteModal(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      await deleteReportMutation.mutateAsync(reportToDelete.id);
      setShowDeleteModal(false);
      setReportToDelete(null);
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  const handleDownloadReport = async (report: Report) => {
    await downloadReportMutation.mutateAsync(report.id);
  };

  const handleGeneratePdf = async (report: Report) => {
    if (report.status === 'DRAFT') {
      alert('Não é possível gerar PDF para relatórios em rascunho. Valide o relatório primeiro.');
      return;
    }
    await generatePdfMutation.mutateAsync(report.id);
  };

  const handlePreviewPdf = async (report: Report) => {
    try {
      const result = await previewPdfMutation.mutateAsync(report.id);
      // In a real implementation, this would open the preview in a modal or new tab
      alert(`Preview gerado: ${result.previewPath}`);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const formatDate = (dateString: string) => {
    return formatDisplayTime(parseToDate(dateString));
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Erro ao carregar relatórios. Tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Gerencie relatórios e laudos de qualificação térmica"
        actions={
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Novo Relatório
          </button>
        }
      />

      {/* Statistics Cards */}
      {statisticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportStatisticsCard
            title="Total de Relatórios"
            value={statisticsData.total}
            icon={DocumentTextIcon}
            color="blue"
          />
          <ReportStatisticsCard
            title="Rascunhos"
            value={statisticsData.byStatus.draft}
            icon={PencilIcon}
            color="gray"
          />
          <ReportStatisticsCard
            title="Validados"
            value={statisticsData.byStatus.validated}
            icon={EyeIcon}
            color="yellow"
          />
          <ReportStatisticsCard
            title="Finalizados"
            value={statisticsData.byStatus.finalized}
            icon={ChartBarIcon}
            color="green"
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar relatórios..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="input w-full pl-10"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700'
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            Filtros
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <select
                  value={filters.clientId || ''}
                  onChange={(e) => handleFilterChange({ clientId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os clientes</option>
                  {clientsData?.clients?.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange({ status: e.target.value as ReportStatus || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os status</option>
                  <option value="DRAFT">Rascunho</option>
                  <option value="VALIDATED">Validado</option>
                  <option value="FINALIZED">Finalizado</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Criação
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando relatórios...</p>
          </div>
        ) : reportsData?.reports.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum relatório encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportsData?.reports.map((report: any) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.client.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.validation.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[report.status as ReportStatus]}`}>
                        {statusLabels[report.status as ReportStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizar"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {report.status !== 'FINALIZED' && (
                          <button
                            onClick={() => handleEditReport(report)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {report.status !== 'DRAFT' && !report.pdfPath && (
                          <button
                            onClick={() => handleGeneratePdf(report)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Gerar PDF"
                            disabled={generatePdfMutation.isLoading}
                          >
                            <DocumentIcon className="h-4 w-4" />
                          </button>
                        )}
                        {report.status !== 'DRAFT' && (
                          <button
                            onClick={() => handlePreviewPdf(report)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Preview PDF"
                            disabled={previewPdfMutation.isLoading}
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </button>
                        )}
                        {report.pdfPath && (
                          <button
                            onClick={() => handleDownloadReport(report)}
                            className="text-green-600 hover:text-green-900"
                            title="Download PDF"
                            disabled={downloadReportMutation.isLoading}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReport(report)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {reportsData && reportsData.pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!reportsData.pagination.hasPrev}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!reportsData.pagination.hasNext}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">
                      {(page - 1) * 10 + 1}
                    </span>{' '}
                    até{' '}
                    <span className="font-medium">
                      {Math.min(page * 10, reportsData.pagination.total)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{reportsData.pagination.total}</span>{' '}
                    resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!reportsData.pagination.hasPrev}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!reportsData.pagination.hasNext}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateForm && (
        <ReportForm
          report={selectedReport}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedReport(null);
          }}
        />
      )}

      {showDetailsModal && selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReport(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && reportToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar Exclusão
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Tem certeza que deseja excluir o relatório "{reportToDelete.name}"?
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={confirmDeleteReport}
                disabled={deleteReportMutation.isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteReportMutation.isLoading ? 'Excluindo...' : 'Excluir'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setReportToDelete(null);
                }}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}