import { AxiosResponse } from 'axios';
import { apiService } from './api';
import { ApiResponse } from '@/types/auth';
import { ProcessingJob, UploadResponse } from '@/types/fileProcessing';

class FileService {
  async uploadFiles(
    files: File[],
    suitcaseId: string
  ): Promise<AxiosResponse<ApiResponse<UploadResponse>>> {
    const formData = new FormData();
    
    // Add files to form data
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    // Add suitcase ID
    formData.append('suitcaseId', suitcaseId);

    return apiService['api'].post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes timeout for large uploads
    });
  }

  async getProcessingStatus(jobId: string): Promise<AxiosResponse<ApiResponse<ProcessingJob>>> {
    return apiService['api'].get(`/files/processing-status/${jobId}`);
  }

  async getProcessingHistory(): Promise<AxiosResponse<ApiResponse<{ jobs: ProcessingJob[] }>>> {
    return apiService['api'].get('/files/history');
  }
}

export const fileService = new FileService();