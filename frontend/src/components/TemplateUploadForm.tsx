import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useUploadTemplate } from '../hooks/useTemplates';

interface TemplateUploadFormData {
  name: string;
  description: string;
  file: FileList;
}

interface TemplateUploadFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TemplateUploadForm: React.FC<TemplateUploadFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const uploadTemplate = useUploadTemplate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TemplateUploadFormData>();

  const selectedFile = watch('file')?.[0];

  const onSubmit = async (data: TemplateUploadFormData) => {
    if (!data.file?.[0]) {
      return;
    }

    try {
      await uploadTemplate.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        file: data.file[0],
      });
      reset();
      onSuccess?.();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Check file extension
      const allowedExtensions = ['.frx', '.fr3'];
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(extension)) {
        alert('Apenas arquivos FastReport (.frx, .fr3) são permitidos');
        return;
      }

      // Create a new FileList-like object
      const dt = new DataTransfer();
      dt.items.add(file);
      setValue('file', dt.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setValue('file', e.target.files);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Enviar Template FastReport</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Template Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Template *
          </label>
          <input
            type="text"
            id="name"
            {...register('name', { required: 'Nome é obrigatório' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite o nome do template"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descrição opcional do template"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arquivo do Template *
          </label>
          
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              {...register('file', { required: 'Arquivo é obrigatório' })}
              onChange={handleFileSelect}
              accept=".frx,.fr3"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-2">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              
              {selectedFile ? (
                <div>
                  <p className="text-sm text-gray-600">Arquivo selecionado:</p>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">
                    Arraste um arquivo FastReport aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos suportados: .frx, .fr3 (máx. 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {errors.file && (
            <p className="text-red-500 text-sm mt-1">{errors.file.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={uploadTemplate.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadTemplate.isLoading ? 'Enviando...' : 'Enviar Template'}
          </button>
        </div>
      </form>
    </div>
  );
};