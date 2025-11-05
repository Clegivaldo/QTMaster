import { apiService } from './api';
import {
  ReportTemplate,
  CreateTemplateData,
  UpdateTemplateData,
  UploadTemplateData,
  TemplateVersion,
  TemplatePreview,
  TemplateListResponse,
  TemplateQueryParams,
} from '../types/template';

export class TemplateService {
  private baseUrl = '/api/report-templates';

  async getTemplates(params?: TemplateQueryParams): Promise<TemplateListResponse> {
    const response = await apiService.api.get(this.baseUrl, { params });
    return response.data.data;
  }

  async getTemplate(id: string): Promise<ReportTemplate> {
    const response = await apiService.api.get(`${this.baseUrl}/${id}`);
    return response.data.data.template;
  }

  async getActiveTemplates(): Promise<ReportTemplate[]> {
    const response = await apiService.api.get(`${this.baseUrl}/active`);
    return response.data.data.templates;
  }

  async createTemplate(data: CreateTemplateData): Promise<ReportTemplate> {
    const response = await apiService.api.post(this.baseUrl, data);
    return response.data.data.template;
  }

  async updateTemplate(id: string, data: UpdateTemplateData): Promise<ReportTemplate> {
    const response = await apiService.api.put(`${this.baseUrl}/${id}`, data);
    return response.data.data.template;
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiService.api.delete(`${this.baseUrl}/${id}`);
  }

  async uploadTemplate(data: UploadTemplateData): Promise<ReportTemplate> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('template', data.file);

    const response = await apiService.api.post(`${this.baseUrl}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.template;
  }

  async previewTemplate(id: string): Promise<TemplatePreview> {
    const response = await apiService.api.get(`${this.baseUrl}/${id}/preview`);
    return response.data.data;
  }

  async getTemplateVersions(id: string): Promise<TemplateVersion[]> {
    const response = await apiService.api.get(`${this.baseUrl}/${id}/versions`);
    return response.data.data.versions;
  }
}

export const templateService = new TemplateService();