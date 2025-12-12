/**
 * Testes de Integração para o Template Editor
 * Testa o fluxo completo do editor de templates
 */

import { TemplateEditorController } from '../src/controllers/templateEditorController';
import { ReportGenerationService } from '../src/services/reportGenerationService';
import { mockRequest, mockResponse, mockTemplateLayout } from './setup';
import fs from 'fs';
import path from 'path';

// Mocks
jest.mock('fs');
jest.mock('path');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  }))
}));
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      setDefaultTimeout: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      waitForTimeout: jest.fn().mockResolvedValue(undefined)
    }),
    close: jest.fn().mockResolvedValue(undefined)
  })
}));
jest.mock('../src/services/reportGenerationService', () => ({
  ReportGenerationService: jest.fn().mockImplementation(() => ({
    generatePDFFromHTML: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    templateService: {
      reloadTemplates: jest.fn()
    }
  }))
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('Template Editor - Testes de Integração', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = mockRequest();
    mockRes = mockResponse();
    
    // Setup padrão dos mocks
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({
      images: [
        { name: 'LOGO EMPRESA', filename: 'logo-empresa.svg', url: '/public/images/gallery/logo-empresa.svg' },
        { name: 'SELO APROVADO', filename: 'selo-aprovado.svg', url: '/public/images/gallery/selo-aprovado.svg' }
      ],
      total: 2
    }));
    mockedPath.join.mockImplementation((...args) => args.join('/'));
  });

  describe('Fluxo Completo: Criar → Salvar → Preview', () => {
    it('deve executar fluxo completo com sucesso', async () => {
      // 1. Carregar o editor
      await TemplateEditorController.getEditor(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalled();
      
      // Reset mocks para próxima chamada
      jest.clearAllMocks();
      mockRes = mockResponse();

      // 2. Salvar template
      mockReq.body = mockTemplateLayout;
      await TemplateEditorController.saveTemplate(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Template salvo com sucesso',
        data: expect.objectContaining({
          templateName: 'Template de Teste',
          fileName: 'template-de-teste'
        })
      });

      // Reset mocks para próxima chamada
      jest.clearAllMocks();
      mockRes = mockResponse();

      // 3. Gerar preview (com fallback HTML)
      const mockReportService = new ReportGenerationService() as jest.Mocked<ReportGenerationService>;
      mockReportService.generatePDFFromHTML = jest.fn().mockRejectedValue(new Error('Puppeteer error'));

      await TemplateEditorController.previewTemplate(mockReq, mockRes);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('Validação de Elementos do Editor', () => {
    it('deve incluir todos os tipos de elementos suportados', async () => {
      await TemplateEditorController.getEditor(mockReq, mockRes);
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      
      // Verificar elementos na paleta
      const expectedElements = ['text', 'header', 'image', 'table', 'chart', 'signature', 'footer'];
      expectedElements.forEach(elementType => {
        expect(htmlContent).toContain(`data-type="${elementType}"`);
      });
    });

    it('deve incluir controles de formatação', async () => {
      await TemplateEditorController.getEditor(mockReq, mockRes);
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      
      // Verificar controles de formatação
      expect(htmlContent).toContain('toggleBold()');
      expect(htmlContent).toContain('toggleItalic()');
      expect(htmlContent).toContain('toggleUnderline()');
      expect(htmlContent).toContain('setAlignment(');
    });

    it('deve incluir controles de imagem específicos', async () => {
      await TemplateEditorController.getEditor(mockReq, mockRes);
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      
      // Verificar controles específicos de imagem
      expect(htmlContent).toContain('id="imageWidth"');
      expect(htmlContent).toContain('id="imageHeight"');
      expect(htmlContent).toContain('id="imageFit"');
      expect(htmlContent).toContain('id="imageControls"');
    });

    it('deve incluir controles de margem da página', async () => {
      await TemplateEditorController.getEditor(mockReq, mockRes);
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      
      // Verificar controles de margem
      expect(htmlContent).toContain('id="pageMarginTop"');
      expect(htmlContent).toContain('id="pageMarginBottom"');
      expect(htmlContent).toContain('id="pageMarginLeft"');
      expect(htmlContent).toContain('id="pageMarginRight"');
    });
  });

  describe('Conversão de Layout para HTML', () => {
    it('deve converter template com todos os tipos de elementos', async () => {
      const complexTemplate = {
        ...mockTemplateLayout,
        elements: [
          {
            id: 'header-1',
            type: 'header' as const,
            content: 'RELATÓRIO COMPLETO',
            styles: { fontSize: '28px', fontWeight: 'bold', textAlign: 'center' as const, color: '#2563eb' }
          },
          {
            id: 'text-1',
            type: 'text' as const,
            content: 'Este é um parágrafo de texto normal com formatação.',
            styles: { fontSize: '14px', color: '#333333', marginBottom: '15px' }
          },
          {
            id: 'image-1',
            type: 'image' as const,
            content: 'Logo da Empresa',
            styles: { width: '150px', height: '100px', border: '1px solid #ddd' },
            data: { imageUrl: '/gallery/logo.svg' }
          },
          {
            id: 'table-1',
            type: 'table' as const,
            content: 'Tabela de Dados',
            styles: { width: '100%', border: '1px solid #ccc' }
          },
          {
            id: 'chart-1',
            type: 'chart' as const,
            content: 'Gráfico de Resultados',
            styles: { width: '400px', height: '300px' }
          },
          {
            id: 'signature-1',
            type: 'signature' as const,
            content: 'Área de Assinatura',
            styles: { height: '80px', border: '1px dashed #999' }
          },
          {
            id: 'footer-1',
            type: 'footer' as const,
            content: 'Rodapé - Página {pageNumber}',
            styles: { fontSize: '12px', textAlign: 'center' as const, borderTop: '1px solid #ccc' }
          }
        ]
      };

      const html = await (TemplateEditorController as any).convertLayoutToHTML(complexTemplate);

      // Verificar estrutura HTML
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="pt-BR">');
      expect(html).toContain('<title>Template de Teste</title>');

      // Verificar elementos convertidos
      expect(html).toContain('<h1 style="font-size: 28px; font-weight: bold; text-align: center; color: #2563eb">RELATÓRIO COMPLETO</h1>');
      expect(html).toContain('<div style="font-size: 14px; color: #333333; margin-bottom: 15px">Este é um parágrafo de texto normal com formatação.</div>');
      expect(html).toContain('🖼️ Logo da Empresa');
      expect(html).toContain('📊 Tabela de Dados');
      expect(html).toContain('📈 Gráfico de Resultados');
      expect(html).toContain('✍️ Área de Assinatura');
      expect(html).toContain('🦶 Rodapé - Página {pageNumber}');

      // Verificar estilos globais
      expect(html).toContain('font-family: Arial, sans-serif');
      expect(html).toContain('background-color: #ffffff');
      expect(html).toContain('size: A4');
      expect(html).toContain('margin: 20mm 15mm 20mm 15mm');
    });

    it('deve aplicar estilos CSS corretamente', async () => {
      const styledTemplate = {
        ...mockTemplateLayout,
        elements: [{
          id: 'styled-text',
          type: 'text' as const,
          content: 'Texto com estilos',
          styles: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontStyle: 'italic',
            textDecoration: 'underline',
            color: '#ff0000',
            backgroundColor: '#f0f0f0',
            textAlign: 'center' as const,
            padding: '10px',
            margin: '20px',
            border: '2px solid #000',
            borderRadius: '5px'
          }
        }]
      };

      const html = await (TemplateEditorController as any).convertLayoutToHTML(styledTemplate);

      // Verificar conversão de estilos camelCase para kebab-case
      expect(html).toContain('font-size: 18px');
      expect(html).toContain('font-weight: bold');
      expect(html).toContain('font-style: italic');
      expect(html).toContain('text-decoration: underline');
      expect(html).toContain('color: #ff0000');
      expect(html).toContain('background-color: #f0f0f0');
      expect(html).toContain('text-align: center');
      expect(html).toContain('padding: 10px');
      expect(html).toContain('margin: 20px');
      expect(html).toContain('border: 2px solid #000');
      expect(html).toContain('border-radius: 5px');
    });
  });

  describe('Galeria de Imagens', () => {
    it('deve carregar galeria com imagens padrão', async () => {
      await TemplateEditorController.getImageGallery(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              name: 'LOGO EMPRESA',
              filename: 'logo-empresa.svg',
              url: '/public/images/gallery/logo-empresa.svg'
            }),
            expect.objectContaining({
              name: 'SELO APROVADO',
              filename: 'selo-aprovado.svg',
              url: '/public/images/gallery/selo-aprovado.svg'
            })
          ]),
          total: 2
        })
      });
    });

    it('deve criar índice automaticamente se não existir', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([
        'logo-empresa.svg',
        'selo-aprovado.svg',
        'termometro-icon.svg',
        'documento.txt' // Este deve ser filtrado
      ] as any);

      await TemplateEditorController.getImageGallery(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.success).toBe(true);
      expect(response.data.images).toHaveLength(3); // Apenas arquivos de imagem
      expect(response.data.total).toBe(3);
      
      // Verificar se arquivo .txt foi filtrado
      const filenames = response.data.images.map((img: any) => img.filename);
      expect(filenames).not.toContain('documento.txt');
      expect(filenames).toContain('logo-empresa.svg');
      expect(filenames).toContain('selo-aprovado.svg');
      expect(filenames).toContain('termometro-icon.svg');
    });
  });

  describe('Validação de Entrada', () => {
    it('deve validar template sem elementos', async () => {
      mockReq.body = { ...mockTemplateLayout, elements: [] };

      await TemplateEditorController.previewTemplate(mockReq, mockRes);

      // Deve processar mesmo com elementos vazios
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    });

    it('deve validar template sem nome', async () => {
      mockReq.body = { ...mockTemplateLayout, name: '' };

      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Nome do template é obrigatório'
      });
    });

    it('deve sanitizar nomes de arquivo perigosos', async () => {
      mockReq.body = {
        ...mockTemplateLayout,
        name: '../../../etc/passwd<script>alert("xss")</script>'
      };

      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Template salvo com sucesso',
        data: expect.objectContaining({
          fileName: 'etcpasswdscriptalertxssscript' // Caracteres perigosos removidos
        })
      });
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erro de sistema de arquivos graciosamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Disco cheio');
      });

      mockReq.body = mockTemplateLayout;
      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro ao salvar template',
        details: 'Disco cheio'
      });

      consoleErrorSpy.mockRestore();
    });

    it('deve tratar erro de permissão de diretório', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simular que o diretório não existe para forçar mkdirSync
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permissão negada');
      });

      mockReq.body = mockTemplateLayout;
      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro ao salvar template',
        details: 'Permissão negada'
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance e Otimização', () => {
    it('deve processar template grande sem problemas', async () => {
      const largeTemplate = {
        ...mockTemplateLayout,
        elements: Array.from({ length: 100 }, (_, i) => ({
          id: `element-${i}`,
          type: 'text' as const,
          content: `Elemento de texto número ${i + 1} com conteúdo extenso para testar performance`,
          styles: {
            fontSize: '14px',
            color: '#333333',
            marginBottom: '10px'
          }
        }))
      };

      const startTime = Date.now();
      const html = await (TemplateEditorController as any).convertLayoutToHTML(largeTemplate);
      const endTime = Date.now();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Elemento de texto número 1');
      expect(html).toContain('Elemento de texto número 100');
      
      // Deve processar em menos de 1 segundo
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('deve lidar com conteúdo HTML complexo', async () => {
      const complexContent = `
        <div class="complex">
          <h1>Título com <em>ênfase</em> e <strong>negrito</strong></h1>
          <p>Parágrafo com <a href="http://example.com">link</a></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2 com <code>código</code></li>
          </ul>
          <table>
            <tr><td>Célula 1</td><td>Célula 2</td></tr>
          </table>
        </div>
      `;

      const complexTemplate = {
        ...mockTemplateLayout,
        elements: [{
          id: 'complex-content',
          type: 'text' as const,
          content: complexContent,
          styles: { fontSize: '14px' }
        }]
      };

      const html = await (TemplateEditorController as any).convertLayoutToHTML(complexTemplate);

      expect(html).toContain(complexContent);
      expect(html).toContain('<!DOCTYPE html>');
    });
  });
});