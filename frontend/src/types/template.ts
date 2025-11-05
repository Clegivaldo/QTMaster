export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  templatePath: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    reports: number;
  };
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  templatePath: string;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  templatePath?: string;
  isActive?: boolean;
}

export interface UploadTemplateData {
  name: string;
  description?: string;
  file: File;
}

export interface TemplateVersion {
  id: string;
  version: string;
  templateId: string;
  templatePath: string;
  createdAt: string;
  isActive: boolean;
  changes: string;
}

export interface TemplatePreview {
  template: ReportTemplate;
  preview: {
    message: string;
    templateExists: boolean;
  };
}

export interface TemplateListResponse {
  templates: ReportTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TemplateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}