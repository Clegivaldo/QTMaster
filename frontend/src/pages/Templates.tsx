import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Download, Palette } from 'lucide-react';
import { apiService } from '../services/api';

interface Template {
  name: string;
  filename: string;
  type: string;
  lastModified: string;
  size: number;
}

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiService.api.get('/editor-templates');
      // API may return different shapes depending on backend; normalize defensively
      const payload = response?.data;
      let items: any[] = [];

      if (Array.isArray(payload)) {
        items = payload;
      } else if (Array.isArray(payload?.data)) {
        items = payload.data;
      } else if (Array.isArray(payload?.templates)) {
        items = payload.templates;
      }

      if (items.length > 0) {
        const templateData = items.map((template: any) => ({
          name: template.name || template.filename?.replace('-', ' ').toUpperCase() || 'Template',
          filename: template.filename || (template.name ? `${template.name}.hbs` : 'template.hbs'),
          type: 'Handlebars Template',
          lastModified: template.updatedAt || new Date().toLocaleDateString('pt-BR'),
          size: template.size || Math.floor(Math.random() * 50) + 10 // KB simulado
        }));
        setTemplates(templateData);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      // Fallback para dados mock se a API falhar
      const mockTemplates = [
        {
          name: 'RELATÓRIO PADRÃO',
          filename: 'relatorio-padrao.hbs',
          type: 'Handlebars Template',
          lastModified: new Date().toLocaleDateString('pt-BR'),
          size: 25
        },
        {
          name: 'RELATÓRIO AVANÇADO',
          filename: 'relatorio-avancado.hbs',
          type: 'Handlebars Template',
          lastModified: new Date().toLocaleDateString('pt-BR'),
          size: 45
        }
      ];
      setTemplates(mockTemplates);
    } finally {
      setLoading(false);
    }
  };

  const openTemplateEditor = (templateId?: string) => {
    // Navegar para a página de editor
    navigate(templateId ? `/editor-layout/${templateId}` : '/editor-layout');
  };

  const previewTemplate = async (templateName: string) => {
    try {
      // Usar timeout maior para geração de PDF
      // tentar rota nova (/editor-templates) e fallback para a rota antiga (/test/templates)
      let response;
      try {
        response = await apiService.api.get(`/editor-templates/${templateName}`, {
          responseType: 'blob',
          timeout: 30000 // 30 segundos
        });
      } catch (err) {
        response = await apiService.api.get(`/test/templates/${templateName}`, {
          responseType: 'blob',
          timeout: 30000 // 30 segundos
        });
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error: any) {
      console.error('Erro ao visualizar template:', error);
      if (error.code === 'ECONNABORTED') {
        alert('Timeout: A geração do PDF está demorando mais que o esperado. Tente novamente.');
      } else {
        alert('Erro ao visualizar template');
      }
    }
  };

  const downloadTemplate = async (templateName: string) => {
    try {
      // Usar timeout maior para geração de PDF
      let response;
      try {
        response = await apiService.api.get(`/editor-templates/${templateName}`, {
          responseType: 'blob',
          timeout: 30000 // 30 segundos
        });
      } catch (err) {
        response = await apiService.api.get(`/test/templates/${templateName}`, {
          responseType: 'blob',
          timeout: 30000 // 30 segundos
        });
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Template baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao baixar template:', error);
      if (error.code === 'ECONNABORTED') {
        alert('Timeout: A geração do PDF está demorando mais que o esperado. Tente novamente.');
      } else {
        alert('Erro ao baixar template');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de Relatórios</h1>
          <p className="text-gray-600 mt-1">
            Gerencie e crie templates personalizados para seus laudos
          </p>
        </div>
        <button
          onClick={() => openTemplateEditor()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Palette className="h-4 w-4" />
          Novo Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Template Icon */}
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>

            {/* Template Info */}
            <div className="space-y-2 mb-4">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500">{template.type}</p>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Modificado: {template.lastModified}</span>
                <span>{template.size} KB</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => previewTemplate(template.filename.replace('.hbs', ''))}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors"
                title="Visualizar"
              >
                <Eye className="h-4 w-4" />
                Ver
              </button>
              <button
                onClick={() => downloadTemplate(template.filename.replace('.hbs', ''))}
                className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors"
                title="Baixar PDF"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={() => openTemplateEditor(template.filename)}
                className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors"
                title="Editar no Editor Profissional"
              >
                <Palette className="h-4 w-4" />
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum template encontrado
          </h3>
          <p className="text-gray-500 mb-4">
            Comece criando seu primeiro template personalizado
          </p>
          <button
            onClick={() => openTemplateEditor()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <Palette className="h-4 w-4" />
            Criar Primeiro Template
          </button>
        </div>
      )}
    </div>
  );
};

export default Templates;