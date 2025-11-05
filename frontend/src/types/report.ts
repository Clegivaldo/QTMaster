export type ReportStatus = 'DRAFT' | 'VALIDATED' | 'FINALIZED';

export interface Report {
  id: string;
  validationId: string;
  templateId: string;
  userId: string;
  clientId: string;
  name: string;
  status: ReportStatus;
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  };
  validation: {
    id: string;
    name: string;
    isApproved?: boolean;
  };
  template: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
}

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
  reports?: Array<{
    id: string;
    name: string;
    status: ReportStatus;
    createdAt: string;
    client: {
      id: string;
      name: string;
    };
  }>;
}

export interface ReportStatistics {
  total: number;
  byStatus: {
    draft: number;
    validated: number;
    finalized: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    name: string;
    status: ReportStatus;
    clientName: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface CreateReportData {
  validationId: string;
  templateId: string;
  name: string;
}

export interface UpdateReportData {
  name?: string;
  status?: ReportStatus;
}

export interface CreateReportTemplateData {
  name: string;
  description?: string;
  templatePath: string;
}

export interface UpdateReportTemplateData {
  name?: string;
  description?: string;
  templatePath?: string;
  isActive?: boolean;
}

export interface ReportFilters {
  search?: string;
  clientId?: string;
  status?: ReportStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReportTemplateFilters {
  search?: string;
  isActive?: boolean;
}

export interface PaginatedReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginatedReportTemplatesResponse {
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