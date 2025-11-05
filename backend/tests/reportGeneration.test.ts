/**
 * Testes Unitários para o Report Generation Service
 */

import { ReportGenerationService } from '../src/services/reportGenerationService';
import { mockPuppeteer } from './setup';
import puppeteer from 'puppeteer';

// Mock do Puppeteer
jest.mock('puppeteer');
const mockedPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    service = new ReportGenerationService();
    
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      setDefaultTimeout: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      waitForTimeout: jest.fn().mockResolvedValue(undefined)
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined)
    };

    mockedPuppeteer.launch.mockResolvedValue(mockBrowser as any);
  });

  describe('generatePDFFromHTML', () => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body><h1>Test Content</h1></body>
      </html>
    `;

    it('deve gerar PDF com sucesso usando configuração otimizada', async () => {
      const result = await service.generatePDFFromHTML(testHtml);

      expect(mockedPuppeteer.launch).toHaveBeenCalledWith({
        headless: 'new',
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--single-process'
        ]),
        executablePath: '/usr/bin/chromium-browser',
        timeout: 30000,
        protocolTimeout: 30000
      });

      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(30000);
      expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(30000);
      expect(mockPage.setContent).toHaveBeenCalledWith(testHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(500);
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        timeout: 30000
      });

      expect(result).toEqual(Buffer.from('mock-pdf-content'));
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('deve usar novo modo headless', async () => {
      await service.generatePDFFromHTML(testHtml);

      expect(mockedPuppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: 'new'
        })
      );
    });

    it('deve configurar timeouts adequados', async () => {
      await service.generatePDFFromHTML(testHtml);

      expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(30000);
      expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(30000);
      expect(mockPage.setContent).toHaveBeenCalledWith(
        testHtml,
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('deve aguardar renderização antes de gerar PDF', async () => {
      await service.generatePDFFromHTML(testHtml);

      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(500);
    });

    it('deve usar configurações de PDF otimizadas', async () => {
      await service.generatePDFFromHTML(testHtml);

      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        timeout: 30000
      });
    });

    it('deve fechar o browser mesmo em caso de erro', async () => {
      mockPage.setContent.mockRejectedValue(new Error('Erro de teste'));

      await expect(service.generatePDFFromHTML(testHtml)).rejects.toThrow();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('deve tratar erro de launch do Puppeteer', async () => {
      mockedPuppeteer.launch.mockRejectedValue(new Error('Erro no launch'));

      await expect(service.generatePDFFromHTML(testHtml)).rejects.toThrow('Erro na geração de PDF: Erro no launch');
    });

    it('deve tratar erro na criação de página', async () => {
      mockBrowser.newPage.mockRejectedValue(new Error('Erro na página'));

      await expect(service.generatePDFFromHTML(testHtml)).rejects.toThrow('Erro na geração de PDF: Erro na página');
    });

    it('deve tratar erro no setContent', async () => {
      mockPage.setContent.mockRejectedValue(new Error('Erro no conteúdo'));

      await expect(service.generatePDFFromHTML(testHtml)).rejects.toThrow('Erro na geração de PDF: Erro no conteúdo');
    });

    it('deve tratar erro na geração do PDF', async () => {
      mockPage.pdf.mockRejectedValue(new Error('Erro no PDF'));

      await expect(service.generatePDFFromHTML(testHtml)).rejects.toThrow('Erro na geração de PDF: Erro no PDF');
    });

    it('deve tratar erro no fechamento do browser graciosamente', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockBrowser.close.mockRejectedValue(new Error('Erro no fechamento'));

      const result = await service.generatePDFFromHTML(testHtml);

      expect(result).toEqual(Buffer.from('mock-pdf-content'));
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Erro ao fechar browser:', expect.any(Error));

      consoleWarnSpy.mockRestore();
    });

    it('deve usar executablePath correto para Docker', async () => {
      await service.generatePDFFromHTML(testHtml);

      expect(mockedPuppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          executablePath: '/usr/bin/chromium-browser'
        })
      );
    });

    it('deve incluir args específicos para Docker', async () => {
      await service.generatePDFFromHTML(testHtml);

      const launchArgs = mockedPuppeteer.launch.mock.calls[0][0].args;
      
      expect(launchArgs).toContain('--no-sandbox');
      expect(launchArgs).toContain('--disable-setuid-sandbox');
      expect(launchArgs).toContain('--disable-dev-shm-usage');
      expect(launchArgs).toContain('--disable-gpu');
      expect(launchArgs).toContain('--disable-web-security');
      expect(launchArgs).toContain('--single-process');
      expect(launchArgs).toContain('--disable-background-timer-throttling');
      expect(launchArgs).toContain('--disable-backgrounding-occluded-windows');
      expect(launchArgs).toContain('--disable-renderer-backgrounding');
      expect(launchArgs).toContain('--disable-ipc-flooding-protection');
    });

    it('deve processar HTML complexo corretamente', async () => {
      const complexHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <title>Template Complexo</title>
            <style>
              body { font-family: Arial; }
              .header { font-size: 24px; color: blue; }
              .content { margin: 20px; }
            </style>
          </head>
          <body>
            <div class="header">Cabeçalho</div>
            <div class="content">
              <p>Parágrafo com <strong>texto em negrito</strong></p>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
              </ul>
            </div>
          </body>
        </html>
      `;

      const result = await service.generatePDFFromHTML(complexHtml);

      expect(mockPage.setContent).toHaveBeenCalledWith(complexHtml, expect.any(Object));
      expect(result).toEqual(Buffer.from('mock-pdf-content'));
    });

    it('deve processar HTML vazio sem erro', async () => {
      const emptyHtml = '';

      const result = await service.generatePDFFromHTML(emptyHtml);

      expect(mockPage.setContent).toHaveBeenCalledWith(emptyHtml, expect.any(Object));
      expect(result).toEqual(Buffer.from('mock-pdf-content'));
    });

    it('deve processar HTML com caracteres especiais', async () => {
      const specialCharsHtml = `
        <html>
          <body>
            <h1>Título com acentos: ção, ã, é</h1>
            <p>Símbolos: © ® ™ € £ ¥</p>
            <p>Emojis: 🎨 📄 ✅</p>
          </body>
        </html>
      `;

      const result = await service.generatePDFFromHTML(specialCharsHtml);

      expect(mockPage.setContent).toHaveBeenCalledWith(specialCharsHtml, expect.any(Object));
      expect(result).toEqual(Buffer.from('mock-pdf-content'));
    });
  });

  describe('Configuração do Puppeteer', () => {
    it('deve usar configuração otimizada para ambiente Docker', async () => {
      await service.generatePDFFromHTML('<html><body>Test</body></html>');

      const launchConfig = mockedPuppeteer.launch.mock.calls[0][0];
      
      expect(launchConfig).toEqual({
        headless: 'new',
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection'
        ]),
        executablePath: '/usr/bin/chromium-browser',
        timeout: 30000,
        protocolTimeout: 30000
      });
    });

    it('deve configurar página com timeouts apropriados', async () => {
      await service.generatePDFFromHTML('<html><body>Test</body></html>');

      expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(30000);
      expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(30000);
    });
  });
});