/**
 * Setup de testes para o Template Editor
 */

// Mock do Puppeteer para testes
export const mockPuppeteer = {
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
};

// Mock do Express Request/Response
export const mockRequest = (body: any = {}, params: any = {}, query: any = {}) => ({
  body,
  params,
  query,
  headers: {},
  method: 'POST',
  url: '/test'
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

// Mock do File System
export const mockFs = {
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('mock file content'),
  readdirSync: jest.fn().mockReturnValue(['test-file.svg'])
};

// Template de teste padrão
export const mockTemplateLayout = {
  id: 'test-template-123',
  name: 'Template de Teste',
  description: 'Template para testes unitários',
  elements: [
    {
      id: 'header-1',
      type: 'header' as const,
      content: 'CABEÇALHO DE TESTE',
      styles: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#2563eb',
        textAlign: 'center' as const
      },
      data: {}
    },
    {
      id: 'text-1',
      type: 'text' as const,
      content: 'Texto de teste para validação',
      styles: {
        fontSize: '14px',
        color: '#333333'
      },
      data: {}
    },
    {
      id: 'image-1',
      type: 'image' as const,
      content: 'Imagem de teste',
      styles: {
        width: '200px',
        height: '150px',
        border: '1px solid #ddd'
      },
      data: {
        imageUrl: '/test/image.jpg'
      }
    }
  ],
  globalStyles: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#ffffff',
    pageSize: 'A4',
    margins: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

// Configuração global do Jest
beforeEach(() => {
  jest.clearAllMocks();
});