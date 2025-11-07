import React, { useState, useEffect } from 'react';
import { Save, Tag, FolderOpen, Globe, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import ResponsiveModal from '../../../ResponsiveModal';
import { EditorTemplate } from '../../../../types/editor';
import { useTemplateStorage } from '../../../../hooks/useTemplateStorage';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: EditorTemplate;
  onSave: (savedTemplate: EditorTemplate) => void;
}

interface FormData {
  name: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
}

const CATEGORIES = [
  { value: 'default', label: 'Padrão' },
  { value: 'report', label: 'Relatório' },
  { value: 'invoice', label: 'Fatura' },
  { value: 'certificate', label: 'Certificado' },
  { value: 'letter', label: 'Carta' },
  { value: 'form', label: 'Formulário' },
  { value: 'other', label: 'Outro' }
];

const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
  onSave
}) => {
  const { saveTemplate, isLoading, error, clearError } = useTemplateStorage();
  
  const [formData, setFormData] = useState<FormData>({
    name: template.name || 'Novo Template',
    description: template.description || '',
    category: template.category || 'default',
    tags: template.tags || [],
    isPublic: template.isPublic || false
  });
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveAttempts, setSaveAttempts] = useState(0);
  
  // Resetar form quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: template.name || 'Novo Template',
        description: template.description || '',
        category: template.category || 'default',
        tags: template.tags || [],
        isPublic: template.isPublic || false
      });
      setTagInput('');
      setErrors({});
      setSaveSuccess(false);
      setSaveAttempts(0);
      clearError();
    }
  }, [isOpen, template, clearError]);
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Nome deve ter no máximo 100 caracteres';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Descrição deve ter no máximo 500 caracteres';
    }
    
    // Validar template
    if (!template.elements || template.elements.length === 0) {
      newErrors.template = 'Template deve conter pelo menos um elemento';
    }
    
    // Validar tags
    if (formData.tags.length > 10) {
      newErrors.tags = 'Máximo de 10 tags permitidas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaveAttempts(prev => prev + 1);
    
    try {
      const savedTemplate = await saveTemplate(template, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        tags: formData.tags,
        isPublic: formData.isPublic
      });
      
      setSaveSuccess(true);
      onSave(savedTemplate);
      
      // Fechar modal após 1.5 segundos para mostrar sucesso
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      // O erro já foi tratado pelo hook useTemplateStorage
    }
  };
  
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Salvar Template"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Nome do Template */}
        <div>
          <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Template *
          </label>
          <input
            id="template-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Digite o nome do template"
            maxLength={100}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>
        
        {/* Descrição */}
        <div>
          <label htmlFor="template-description" className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            id="template-description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Descreva o propósito deste template (opcional)"
            maxLength={500}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.description.length}/500 caracteres
          </p>
        </div>
        
        {/* Categoria */}
        <div>
          <label htmlFor="template-category" className="block text-sm font-medium text-gray-700 mb-2">
            <FolderOpen className="inline h-4 w-4 mr-1" />
            Categoria
          </label>
          <select
            id="template-category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {CATEGORIES.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="inline h-4 w-4 mr-1" />
            Tags
          </label>
          
          {/* Tags existentes */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Input para nova tag */}
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite uma tag e pressione Enter"
              maxLength={30}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Tags ajudam a organizar e encontrar templates
          </p>
        </div>
        
        {/* Visibilidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Visibilidade
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="visibility"
                checked={!formData.isPublic}
                onChange={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <div className="flex items-center">
                  <Lock className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-sm font-medium text-gray-700">Privado</span>
                </div>
                <p className="text-sm text-gray-500">Apenas você pode ver e usar este template</p>
              </div>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="visibility"
                checked={formData.isPublic}
                onChange={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <div className="flex items-center">
                  <Globe className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-sm font-medium text-gray-700">Público</span>
                </div>
                <p className="text-sm text-gray-500">Outros usuários podem ver e usar este template</p>
              </div>
            </label>
          </div>
        </div>
        
        {/* Validação de template */}
        {errors.template && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-700">{errors.template}</p>
            </div>
          </div>
        )}

        {/* Sucesso */}
        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <p className="text-sm text-green-700">Template salvo com sucesso!</p>
            </div>
          </div>
        )}

        {/* Erro da API */}
        {error && !saveSuccess && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-600">{error.message}</p>
                {saveAttempts > 1 && (
                  <p className="text-xs text-red-500 mt-1">
                    Tentativa {saveAttempts} - Verifique sua conexão
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saveSuccess ? 'Fechar' : 'Cancelar'}
          </button>
          
          {!saveSuccess && (
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Template
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default SaveTemplateModal;