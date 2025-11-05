import { useMutation, useQuery, useQueryClient } from 'react-query';
import { templateService } from '../services/templateService';
import {
  CreateTemplateData,
  UpdateTemplateData,
  UploadTemplateData,
  TemplateQueryParams,
} from '../types/template';
import { useNotification } from './useNotification';

export const useTemplates = (params?: TemplateQueryParams) => {
  return useQuery({
    queryKey: ['templates', params],
    queryFn: () => templateService.getTemplates(params),
  });
};

export const useTemplate = (id: string) => {
  return useQuery({
    queryKey: ['template', id],
    queryFn: () => templateService.getTemplate(id),
    enabled: !!id,
  });
};

export const useActiveTemplates = () => {
  return useQuery({
    queryKey: ['templates', 'active'],
    queryFn: () => templateService.getActiveTemplates(),
  });
};

export const useTemplateVersions = (id: string) => {
  return useQuery({
    queryKey: ['template', id, 'versions'],
    queryFn: () => templateService.getTemplateVersions(id),
    enabled: !!id,
  });
};

export const useTemplatePreview = (id: string) => {
  return useQuery({
    queryKey: ['template', id, 'preview'],
    queryFn: () => templateService.previewTemplate(id),
    enabled: !!id,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: CreateTemplateData) => templateService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      showSuccess('Template criado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao criar template';
      showError(message);
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateData }) =>
      templateService.updateTemplate(id, data),
    onSuccess: (_, { id }: { id: string; data: UpdateTemplateData }) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      showSuccess('Template atualizado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao atualizar template';
      showError(message);
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (id: string) => templateService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      showSuccess('Template excluído com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao excluir template';
      showError(message);
    },
  });
};

export const useUploadTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: UploadTemplateData) => templateService.uploadTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      showSuccess('Template enviado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erro ao enviar template';
      showError(message);
    },
  });
};