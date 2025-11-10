import React, { useRef } from 'react';
import { EditorTemplate } from '../../types/editor';
import html2pdf from 'html2pdf.js';
import './TemplateVisualRenderer.css';

interface TemplateVisualRendererProps {
  template: EditorTemplate;
  onExport?: (status: 'success' | 'error', message?: string) => void;
}

/**
 * Renderiza um template visualmente e permite exportar como PDF
 * Simula o layout final do documento com elementos posicionados
 */
export const TemplateVisualRenderer: React.FC<TemplateVisualRendererProps> = ({
  template,
  onExport
}) => {
  const previewRef = useRef<HTMLDivElement>(null);

  // Renderizar elemento conforme seu tipo
  const renderElement = (element: any, idx: number) => {
    const { type, content, style, size, position } = element;

    // Estilos base de posicionamento
    const elementStyle: React.CSSProperties = {
      position: 'absolute',
      left: position?.x || 0,
      top: position?.y || 0,
      width: size?.width || 200,
      height: size?.height || 40,
      ...style
    };

    switch (type) {
      case 'text':
        return (
          <div key={idx} className="template-element template-text" style={elementStyle}>
            {content}
          </div>
        );

      case 'heading':
        return (
          <h2 key={idx} className="template-element template-heading" style={elementStyle}>
            {content || `Título ${idx + 1}`}
          </h2>
        );

      case 'paragraph':
        return (
          <p key={idx} className="template-element template-paragraph" style={elementStyle}>
            {content || `Parágrafo ${idx + 1}`}
          </p>
        );

      case 'image':
        return (
          <div key={idx} className="template-element template-image" style={elementStyle}>
            <img src={content} alt="Template" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        );

      case 'rectangle':
        return (
          <div key={idx} className="template-element template-shape template-rectangle" style={elementStyle} />
        );

      case 'circle':
        return (
          <div key={idx} className="template-element template-shape template-circle" style={elementStyle} />
        );

      case 'line':
        return (
          <div key={idx} className="template-element template-line" style={elementStyle} />
        );

      case 'table':
        return (
          <div key={idx} className="template-element template-table" style={elementStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Array.from({ length: 3 }).map((_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 3 }).map((_, col) => (
                      <td key={col} style={{ border: '1px solid #ccc', padding: '8px' }}>
                        Célula {row + 1},{col + 1}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div key={idx} className="template-element template-default" style={elementStyle}>
            [{type}] {content}
          </div>
        );
    }
  };

  // Exportar como PDF
  const handleExportPDF = async () => {
    if (!previewRef.current) {
      onExport?.('error', 'Preview não encontrado');
      return;
    }

    try {
      const element = previewRef.current;
      const opt = {
        margin: 10,
        filename: `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any }
      };

      await html2pdf().set(opt).from(element).save();
      onExport?.('success', 'PDF exportado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      onExport?.('error', `Erro ao exportar: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    }
  };

  return (
    <div className="template-visual-renderer">
      {/* Botão de exportação */}
      <div className="renderer-toolbar">
        <button onClick={handleExportPDF} className="btn-export-pdf">
          📥 Download PDF
        </button>
      </div>

      {/* Preview do template */}
      <div ref={previewRef} className="template-preview">
        <div
          className="template-page"
          style={{
            backgroundColor: template.globalStyles?.backgroundColor || '#ffffff',
            fontFamily: template.globalStyles?.fontFamily || 'Arial',
            color: template.globalStyles?.color || '#000000'
          }}
        >
          {/* Renderizar elementos */}
          <div className="template-content">
            {template.elements && template.elements.length > 0 ? (
              template.elements.map((element, idx) => renderElement(element, idx))
            ) : (
              <div className="template-empty-state">
                <p>Nenhum elemento no template</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateVisualRenderer;
