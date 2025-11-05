import { useQuery, useMutation, useQueryClient } from 'react-query';
import { reportService } from '../services/reportService';
import {
  CreateReportData,
  UpdateReportData,
  CreateReportTemplateData,
  UpdateReportTemplateData,
  ReportFilters,
  ReportTemplateFilters,
} from '../types/report';
import { useNotification } from './useNotification';

// Report hooks
export function useReports(
  page: number = 1,
  limit: number = 10,
  filters: ReportFilters = {}
) {
  return useQuery(
    ['reports', page, limit, filters],
    () => reportService.getReports(page, limit, filters),
    { keepPreviousData: true }
  );
}

export function useReport(id: string) {
  return useQuery(
    ['report', id],
    () => reportService.getReport(id),
    { enabled: !!id }
  );
}

export function useReportStatistics() {
  return useQuery(
    ['report-statistics'],
    () => reportService.getReportStatistics()
  );
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation(
    (data: CreateReportData) => reportService.createReport(data),
    {
      onSuccess: (report: any) => {
        queryClient.invalidateQueries(['reports']);
        queryClient.invalidateQueries(['report-statistics']);
        showSuccess(`Relatório "${report.name}" criado com sucesso!`);
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao criar relatório');
      },
    }
  );
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation(
    ({ id, data }: { id: string; data: UpdateReportData }) =>
      reportService.updateReport(id, data),
    {
      onSuccess: (report: any) => {
        queryClient.invalidateQueries(['reports']);
        queryClient.invalidateQueries(['report', report.id]);
        queryClient.invalidateQueries(['report-statistics']);
        showSuccess(`Relatório "${report.name}" atualizado com sucesso!`);
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao atualizar relatório');
      },
    }
  );
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation(
    (id: string) => reportService.deleteReport(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reports']);
        queryClient.invalidateQueries(['report-statistics']);
        showSuccess('Relatório excluído com sucesso!');
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao excluir relatório');
      },
    }
  );
}

// Report template hooks
export function useReportTemplates(
  page: number = 1,
  limit: number = 10,
  filters: ReportTemplateFilters = {}
) {
  return useQuery(
    ['report-templates', page, limit, filters],
    () => reportService.getReportTemplates(page, limit, filters),
    { keepPreviousData: true }
  );
}

export function useActiveReportTemplates() {
  return useQuery(
    ['report-templates', 'active'],
    () => reportService.getActiveReportTemplates()
  );
}

export function useReportTemplate(id: string) {
  return useQuery(
    ['report-template', id],
    () => reportService.getReportTemplate(id),
    { enabled: !!id }
  );
}

export function useCreateReportTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation(
    (data: CreateReportTemplateData) => reportService.createReportTemplate(data),
    {
      onSuccess: (template: any) => {
        queryClient.invalidateQueries(['report-templates']);
        showSuccess(`Template "${template.name}" criado com sucesso!`);
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao criar template');
      },
    }
  );
}

export function useUpdateReportTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation(
    ({ id, data }: { id: string; data: UpdateReportTemplateData }) =>
      reportService.updateReportTemplate(id, data),
    {
      onSuccess: (template: any) => {
        queryClient.invalidateQueries(['report-templates']);
        queryClient.invalidateQueries(['report-template', template.id]);
        showSuccess(`Template "${template.name}" atualizado com sucesso!`);
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao atualizar template');
      },
    }
  );
}

export function useDeleteReportTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation(
    (id: string) => reportService.deleteReportTemplate(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['report-templates']);
        showSuccess('Template excluído com sucesso!');
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao excluir template');
      },
    }
  );
}

// Utility hooks
export function useSearchReports(query: string, limit: number = 10) {
  return useQuery(
    ['search-reports', query, limit],
    () => reportService.searchReports(query, limit),
    { enabled: query.length > 2 }
  );
}

export function useReportsByClient(clientId: string, limit?: number) {
  return useQuery(
    ['reports-by-client', clientId, limit],
    () => reportService.getReportsByClient(clientId, limit),
    { enabled: !!clientId }
  );
}

export function useReportsByStatus(status: string, limit?: number) {
  return useQuery(
    ['reports-by-status', status, limit],
    () => reportService.getReportsByStatus(status, limit),
    { enabled: !!status }
  );
}

// PDF generation hooks
export function useGeneratePdf() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation(
    (id: string) => reportService.generatePdf(id),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['report', data.reportId]);
        showSuccess('PDF gerado com sucesso!');
      },
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao gerar PDF');
      },
    }
  );
}

export function usePreviewPdf() {
  const { showError } = useNotification();

  return useMutation(
    (id: string) => reportService.previewPdf(id),
    {
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao gerar preview');
      },
    }
  );
}

export function useDownloadReport() {
  const { showError } = useNotification();

  return useMutation(
    async (id: string) => {
      const blob = await reportService.downloadReport(id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    {
      onError: (error: any) => {
        showError(error.response?.data?.error || 'Erro ao baixar relatório');
      },
    }
  );
}