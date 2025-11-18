import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'react-query';
import { fileService } from '@/services/fileService';
// import { ProcessingJob } from '@/types/fileProcessing';

// Upload files mutation
export const useUploadFiles = () => {
  return useMutation({
    mutationFn: ({ files, suitcaseId, validationId }: { files: File[]; suitcaseId: string; validationId?: string }) =>
      fileService.uploadFiles(files, suitcaseId, validationId),
  });
};

// Get processing status
export const useProcessingStatus = (jobId: string | null, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['processing-status', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await fileService.getProcessingStatus(jobId);
      return response.data.data;
    },
    enabled: enabled && !!jobId,
    refetchInterval: (data) => {
      // Refetch every 2 seconds if still processing
      if (data?.status === 'processing' || data?.status === 'pending') {
        return 2000;
      }
      return false;
    },
    refetchIntervalInBackground: true,
  });
};

// Processing history
export const useProcessingHistory = () => {
  return useQuery({
    queryKey: ['processing-history'],
    queryFn: async () => {
      const response = await fileService.getProcessingHistory();
      return response.data.data?.jobs || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for managing file upload state
export const useFileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return ['xlsx', 'xls', 'csv'].includes(extension || '');
    });

    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = validFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });

    return {
      added: validFiles.length,
      invalid: fileArray.length - validFiles.length,
    };
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  return {
    selectedFiles,
    dragActive,
    addFiles,
    removeFile,
    clearFiles,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
};