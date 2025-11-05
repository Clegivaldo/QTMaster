/**
 * Testes Unitários para o Template Editor Controller
 */

import { TemplateEditorController } from '../src/controllers/templateEditorController';
import { ReportGenerationService } from '../src/services/reportGenerationService';
import { mockRequest, mockResponse, mockTemplateLayout, mockFs } from './setup';
import fs from 'fs';
import path from 'path';

// Mocks
jest.mock('fs');
jest.mock('path');
jest.mock('../src/services/reportGenerationService');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('TemplateEditorController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockReportService: jest.Mocked<ReportGenerationService>;

  beforeEach(() => {
    mockReq = mockRequest();
    mockRes = mockResponse();
    mockReportService = new ReportGenerationService() as jest.Mocked<ReportGenerationService>;
    
    // Setup mocks
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({
      images: [
        { name: 'test-image', filename: 'test.svg', url: '/test.svg' }
      ]
    }));
    mockedFs.readdirSync.mockReturnValue(['test.svg'] as any);
    mockedPath.join.mockImplementation((...args) => args.join('/'));
  });

  describe('getEditor', () => {
    it('deve retornar a interface HTML do editor', async () => {
      await TemplateEditorController.getEditor(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(mockRes.send).toHaveBeenCalled();
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      expect(htmlContent).toContain('Editor Visual de Templates');
      expect(htmlContent).toContain('canvas');
      expect(htmlContent).toContain('element-palette');
    });

    it('deve incluir todos os elementos na paleta', async () => {
      await TemplateEditorController.getEditor(mockReq, mockRes);
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      expect(htmlContent).toContain('data-type="text"');
      expect(htmlContent).toContain('data-type="header"');
      expect(htmlContent).toContain('data-type="image"');
      expect(htmlContent).toContain('data-type="table"');
      expect(htmlContent).toContain('data-type="chart"');
      expect(htmlContent).toContain('data-type="signature"');
      expect(htmlContent).toContain('data-type="footer"');
    });

    it('deve incluir controles de propriedades', async () => {
      await TemplateEditorController.getEditor(mockReq, mockRes);
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      expect(htmlContent).toContain('id="fontSize"');
      expect(htmlContent).toContain('id="textColor"');
      expect(htmlContent).toContain('id="backgroundColor"');
      expect(htmlContent).toContain('id="imageWidth"');
      expect(htmlContent).toContain('id="imageHeight"');
      expect(htmlContent).toContain('id="pageMarginTop"');
    });

    it('deve incluir scripts JavaScript necessários', async () => {
      await TemplateEditorController.getEditor(mockReq, mockRes);
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      expect(htmlContent).toContain('function createElement');
      expect(htmlContent).toContain('function updateElementCount');
      expect(htmlContent).toContain('function saveTemplate');
      expect(htmlContent).toContain('function previewTemplate');
    });

    it('deve tratar erros adequadamente', async () => {
      const errorMock = jest.spyOn(console, 'error').mockImplementation();
      mockRes.send.mockImplementation(() => {
        throw new Error('Erro de teste');
      });

      await TemplateEditorController.getEditor(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro ao carregar editor',
        details: expect.any(String)
      });

      errorMock.mockRestore();
    });
  });

  describe('previewTemplate', () => {
    beforeEach(() => {
      mockReq.body = mockTemplateLayout;
      mockReportService.generatePDFFromHTML = jest.fn().mockResolvedValue(Buffer.from('pdf-content'));
    });

    it('deve gerar preview em PDF com sucesso', async () => {
      await TemplateEditorController.previewTemplate(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="preview-template.pdf"');
      expect(mockRes.send).toHaveBeenCalledWith(Buffer.from('pdf-content'));
    });

    it('deve validar se o layout do template é obrigatório', async () => {
      mockReq.body = null;

      await TemplateEditorController.previewTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Layout do template é obrigatório'
      });
    });

    it('deve validar se os elementos são obrigatórios', async () => {
      mockReq.body = { ...mockTemplateLayout, elements: null };

      await TemplateEditorController.previewTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Layout do template é obrigatório'
      });
    });

    it('deve retornar HTML fallback quando PDF falha', async () => {
      mockReportService.generatePDFFromHTML = jest.fn().mockRejectedValue(new Error('Puppeteer error'));

      await TemplateEditorController.previewTemplate(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(mockRes.send).toHaveBeenCalled();
      
      const htmlContent = mockRes.send.mock.calls[0][0];
      expect(htmlContent).toContain('Preview: Template de Teste');
      expect(htmlContent).toContain('Modo Preview HTML');
    });

    it('deve tratar erros gerais adequadamente', async () => {
      const errorMock = jest.spyOn(console, 'error').mockImplementation();
      mockReq.body = mockTemplateLayout;
      
      // Simular erro na conversão HTML
      jest.spyOn(TemplateEditorController as any, 'convertLayoutToHTML').mockImplementation(() => {
        throw new Error('Erro na conversão');
      });

      await TemplateEditorController.previewTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro ao gerar preview',
        details: 'Erro na conversão'
      });

      errorMock.mockRestore();
    });
  });

  describe('saveTemplate', () => {
    beforeEach(() => {
      mockReq.body = mockTemplateLayout;
    });

    it('deve salvar template com sucesso', async () => {
      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockedFs.mkdirSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2); // .hbs e .json
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Template salvo com sucesso',
        data: expect.objectContaining({
          templateName: 'Template de Teste',
          fileName: 'template-de-teste'
        })
      });
    });

    it('deve validar se o nome do template é obrigatório', async () => {
      mockReq.body = { ...mockTemplateLayout, name: null };

      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Nome do template é obrigatório'
      });
    });

    it('deve criar diretório se não existir', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('templates'),
        { recursive: true }
      );
    });

    it('deve sanitizar nome do arquivo', async () => {
      mockReq.body = { ...mockTemplateLayout, name: 'Template com Espaços & Caracteres!' };

      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Template salvo com sucesso',
        data: expect.objectContaining({
          fileName: 'template-com-espacos-caracteres'
        })
      });
    });

    it('deve tratar erros de escrita de arquivo', async () => {
      const errorMock = jest.spyOn(console, 'error').mockImplementation();
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Erro de escrita');
      });

      await TemplateEditorController.saveTemplate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro ao salvar template',
        details: 'Erro de escrita'
      });

      errorMock.mockRestore();
    });
  });

  describe('getImageGallery', () => {
    it('deve retornar galeria de imagens do índice', async () => {
      const mockGalleryData = {
        images: [
          { name: 'Logo', filename: 'logo.svg', url: '/gallery/logo.svg' },
          { name: 'Icon', filename: 'icon.png', url: '/gallery/icon.png' }
        ],
        total: 2
      };
      
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockGalleryData));

      await TemplateEditorController.getImageGallery(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockGalleryData
      });
    });

    it('deve criar índice básico se não existir', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue(['test1.svg', 'test2.png'] as any);

      await TemplateEditorController.getImageGallery(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              name: 'TEST1',
              filename: 'test1.svg',
              type: 'svg'
            })
          ]),
          total: 2
        })
      });
    });

    it('deve filtrar apenas arquivos de imagem', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue(['image.svg', 'document.txt', 'photo.jpg', 'data.json'] as any);

      await TemplateEditorController.getImageGallery(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.images).toHaveLength(2); // apenas .svg e .jpg
      expect(response.data.images.map((img: any) => img.filename)).toEqual(['image.svg', 'photo.jpg']);
    });

    it('deve tratar erros de leitura de diretório', async () => {
      const errorMock = jest.spyOn(console, 'error').mockImplementation();
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error('Erro de leitura');
      });

      await TemplateEditorController.getImageGallery(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro ao carregar galeria de imagens',
        details: 'Erro de leitura'
      });

      errorMock.mockRestore();
    });
  });

  describe('convertLayoutToHTML', () => {
    it('deve converter layout para HTML válido', () => {
      const html = (TemplateEditorController as any).convertLayoutToHTML(mockTemplateLayout);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="pt-BR">');
      expect(html).toContain('<title>Template de Teste</title>');
      expect(html).toContain('font-family: Arial, sans-serif');
      expect(html).toContain('CABEÇALHO DE TESTE');
      expect(html).toContain('Texto de teste para validação');
    });

    it('deve aplicar estilos globais corretamente', () => {
      const html = (TemplateEditorController as any).convertLayoutToHTML(mockTemplateLayout);

      expect(html).toContain('margin: 20mm 15mm 20mm 15mm');
      expect(html).toContain('size: A4');
      expect(html).toContain('background-color: #ffffff');
    });

    it('deve converter diferentes tipos de elementos', () => {
      const testLayout = {
        ...mockTemplateLayout,
        elements: [
          { id: '1', type: 'text', content: 'Texto', styles: { color: 'red' } },
          { id: '2', type: 'header', content: 'Cabeçalho', styles: { fontSize: '24px' } },
          { id: '3', type: 'image', content: 'Imagem', styles: { width: '100px' } },
          { id: '4', type: 'table', content: 'Tabela', styles: { border: '1px solid' } },
          { id: '5', type: 'chart', content: 'Gráfico', styles: { height: '200px' } },
          { id: '6', type: 'signature', content: 'Assinatura', styles: { padding: '10px' } },
          { id: '7', type: 'footer', content: 'Rodapé', styles: { textAlign: 'center' } }
        ]
      };

      const html = (TemplateEditorController as any).convertLayoutToHTML(testLayout);

      expect(html).toContain('<div style="color: red">Texto</div>');
      expect(html).toContain('<h1 style="font-size: 24px">Cabeçalho</h1>');
      expect(html).toContain('🖼️ Imagem');
      expect(html).toContain('📊 Tabela');
      expect(html).toContain('📈 Gráfico');
      expect(html).toContain('✍️ Assinatura');
      expect(html).toContain('🦶 Rodapé');
    });

    it('deve converter estilos CSS corretamente', () => {
      const testLayout = {
        ...mockTemplateLayout,
        elements: [{
          id: '1',
          type: 'text',
          content: 'Teste',
          styles: {
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: '#f0f0f0'
          }
        }]
      };

      const html = (TemplateEditorController as any).convertLayoutToHTML(testLayout);

      expect(html).toContain('font-size: 16px');
      expect(html).toContain('font-weight: bold');
      expect(html).toContain('text-align: center');
      expect(html).toContain('background-color: #f0f0f0');
    });
  });
});