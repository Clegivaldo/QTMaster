import { apiService } from './api';
import {
  Report,
  ReportTemplate,
  ReportStatistics,
  CreateReportData,
  UpdateReportData,
  CreateReportTemplateData,
  UpdateReportTemplateData,
  ReportFilters,
  ReportTemplateFilters,
  PaginatedReportsResponse,
  PaginatedReportTemplatesResponse,
} from '../types/report';

export class ReportService {
  // Report management
  async getReports(
    page: number = 1,
    limit: number = 10,
    filters: ReportFilters = {}
  ): Promise<PaginatedReportsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.clientId) params.append('clientId', filters.clientId);
    if (filters.status) params.append('status', filters.status);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await apiService.api.get(`/reports?${params.toString()}`);
    return response.data.data;
  }

  async getReport(id: string): Promise<Report> {
    const response = await apiService.api.get(`/reports/${id}`);
    return response.data.data.report;
  }

  async createReport(data: CreateReportData): Promise<Report> {
    const response = await apiService.api.post('/reports', data);
    return response.data.data.report;
  }

  async updateReport(id: string, data: UpdateReportData): Promise<Report> {
    const response = await apiService.api.put(`/reports/${id}`, data);
    return response.data.data.report;
  }

  async deleteReport(id: string): Promise<void> {
    await apiService.api.delete(`/reports/${id}`);
  }

  async getReportStatistics(): Promise<ReportStatistics> {
    const response = await apiService.api.get('/reports/statistics');
    return response.data.data.statistics;
  }

  async downloadReport(id: string): Promise<Blob> {
    const response = await apiService.api.get(`/reports/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async generatePdf(id: string): Promise<{ reportId: string; pdfPath: string }> {
    const response = await apiService.api.post(`/reports/${id}/generate-pdf`);
    return response.data.data;
  }

  async previewPdf(id: string): Promise<{ reportId: string; previewPath: string }> {
    const response = await apiService.api.get(`/reports/${id}/preview`);
    return response.data.data;
  }

  // Report template management
  async getReportTemplates(
    page: number = 1,
    limit: number = 10,
    filters: ReportTemplateFilters = {}
  ): Promise<PaginatedReportTemplatesResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());

    const response = await apiService.api.get(`/report-templates?${params.toString()}`);
    return response.data.data;
  }

  async getActiveReportTemplates(): Promise<ReportTemplate[]> {
    const response = await apiService.api.get('/report-templates/active');
    return response.data.data.templates;
  }

  async getReportTemplate(id: string): Promise<ReportTemplate> {
    const response = await apiService.api.get(`/report-templates/${id}`);
    return response.data.data.template;
  }

  async createReportTemplate(data: CreateReportTemplateData): Promise<ReportTemplate> {
    const response = await apiService.api.post('/report-templates', data);
    return response.data.data.template;
  }

  async updateReportTemplate(id: string, data: UpdateReportTemplateData): Promise<ReportTemplate> {
    const response = await apiService.api.put(`/report-templates/${id}`, data);
    return response.data.data.template;
  }

  async deleteReportTemplate(id: string): Promise<void> {
    await apiService.api.delete(`/report-templates/${id}`);
  }

  // Utility methods
  async searchReports(query: string, limit: number = 10): Promise<Report[]> {
    const response = await this.getReports(1, limit, { search: query });
    return response.reports;
  }

  async getReportsByClient(clientId: string, limit?: number): Promise<Report[]> {
    const response = await this.getReports(1, limit || 10, { clientId });
    return response.reports;
  }

  async getReportsByStatus(status: string, limit?: number): Promise<Report[]> {
    const response = await this.getReports(1, limit || 10, { status: status as any });
    return response.reports;
  }
}

export const reportService = new ReportService();