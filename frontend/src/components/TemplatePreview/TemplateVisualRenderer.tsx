import React, { useRef, useState } from 'react';
import { EditorTemplate } from '../../types/editor';
import './TemplateVisualRenderer.css';

interface TemplateVisualRendererProps {
  template: EditorTemplate;
}

/**
 * Renderiza um template visualmente e permite exportar como PDF
 * Simula o layout final do documento com elementos posicionados
 */
export const TemplateVisualRenderer: React.FC<TemplateVisualRendererProps> = ({ template }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState<number>(0);

  const pages = template.pages && template.pages.length > 0 ? template.pages : [{ id: 'p-1', elements: template.elements || [], pageSettings: null, header: null, footer: null } as any];
  const currentPage = pages[pageIndex];

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
        // content may be a string (url) or an object { src, url }
        const src = typeof content === 'string' ? content : (content && (content.src || content.url));
        return (
          <div key={idx} className="template-element template-image" style={elementStyle}>
            {src ? <img src={src} alt="Template" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
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

  // Export removed: handled by external flow

  return (
    <div className="template-visual-renderer">
      {/* Export removed from visual renderer - exports are handled elsewhere */}

      {/* Preview do template */}
      <div className="template-preview-controls px-4 py-2 border-b bg-gray-50 flex items-center gap-2">
        <button onClick={() => setPageIndex(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0} className="btn-page">‹</button>
        <div className="text-sm">Página {pageIndex + 1} / {pages.length}</div>
        <button onClick={() => setPageIndex(Math.min(pages.length - 1, pageIndex + 1))} disabled={pageIndex === pages.length - 1} className="btn-page">›</button>
      </div>

      <div ref={previewRef} className="template-preview">
        <div
          className="template-page"
          style={{
            backgroundColor: template.globalStyles?.backgroundColor || '#ffffff',
            fontFamily: template.globalStyles?.fontFamily || 'Arial',
            color: template.globalStyles?.color || '#000000'
          }}
        >
          {/* Renderizar header region if any */}
          {currentPage.header && Array.isArray(currentPage.header.elements) && (
            <div className="template-header" style={{ position: 'relative' }}>
              {currentPage.header.elements.map((el: any, i: number) => renderElement(el, i))}
            </div>
          )}

          {/* Renderizar elementos da página */}
          <div className="template-content">
            {template.elements && template.elements.length > 0 ? (
              template.elements.filter((el: any) => !el.pageId || el.pageId === currentPage.id).map((element, idx) => renderElement(element, idx))
            ) : (
              <div className="template-empty-state">
                <p>Nenhum elemento no template</p>
              </div>
            )}
          </div>

          {/* Renderizar footer region if any */}
          {currentPage.footer && Array.isArray(currentPage.footer.elements) && (
            <div className="template-footer" style={{ position: 'relative' }}>
              {currentPage.footer.elements.map((el: any, i: number) => renderElement(el, i))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateVisualRenderer;
