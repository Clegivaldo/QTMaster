export interface ProcessingResult {
  fileName: string;
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  sensorId?: string;
  sensorSerialNumber?: string;
}

export interface ProcessingJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  statistics: {
    totalFiles: number;
    processedFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalRecords: number;
  };
  results: ProcessingResult[];
  createdAt: string;
  completedAt?: string;
}

export interface UploadResponse {
  jobId: string;
  filesCount: number;
  message: string;
}