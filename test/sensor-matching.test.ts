import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  sensor: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  sensorType: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  suitcaseSensor: {
    create: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Mock XLSX
const mockXLSX = {
  readFile: vi.fn(),
};

vi.mock('xlsx', () => ({
  readFile: mockXLSX.readFile,
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Enhanced File Processor Service - Sensor Matching', () => {
  let fileProcessorService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockPrisma.sensor.findFirst.mockReset();
    mockPrisma.sensor.create.mockReset();
    mockPrisma.sensorType.findFirst.mockReset();
    mockPrisma.sensorType.create.mockReset();
    mockPrisma.suitcaseSensor.create.mockReset();
    mockXLSX.readFile.mockReset();

    // Import the service after mocking
    const module = await import('../backend/src/services/enhancedFileProcessorService');
    fileProcessorService = module.EnhancedFileProcessorService;
  });

  describe('matchFileToSensor method', () => {
    const mockSuitcase = {
      id: 'suitcase-123',
      sensors: [
        {
          sensor: {
            id: 'existing-sensor-1',
            serialNumber: 'EXISTING001',
          },
        },
        {
          sensor: {
            id: 'existing-sensor-2',
            serialNumber: 'EXISTING002',
          },
        },
      ],
    };

    it('should extract serial from Excel Resumo sheet B6 cell', async () => {
      // Mock Excel file with serial in B6
      const mockWorkbook = {
        SheetNames: ['Resumo', 'Dados'],
        Sheets: {
          Resumo: {
            B6: { v: 'EXCEL001', w: 'EXCEL001' },
          },
        },
      };

      mockXLSX.readFile.mockReturnValue(mockWorkbook);

      const mockFile = {
        originalname: 'test_data.xlsx',
        path: '/tmp/test.xlsx',
      };

      const service = new fileProcessorService();
      const result = await service.matchFileToSensor(mockFile as any, mockSuitcase, '/tmp/test.xlsx');

      // Should have tried to read the Excel file
      expect(mockXLSX.readFile).toHaveBeenCalledWith('/tmp/test.xlsx');

      // Should create new sensor since EXCEL001 doesn't match existing sensors
      expect(mockPrisma.sensor.create).toHaveBeenCalledWith({
        data: {
          serialNumber: 'EXCEL001',
          model: 'Auto-detected',
          typeId: expect.any(String),
        },
      });
    });

    it('should match existing sensor when serial is found in Excel', async () => {
      // Mock Excel file with serial that matches existing sensor
      const mockWorkbook = {
        SheetNames: ['Resumo', 'Dados'],
        Sheets: {
          Resumo: {
            B6: { v: 'EXISTING001', w: 'EXISTING001' },
          },
        },
      };

      mockXLSX.readFile.mockReturnValue(mockWorkbook);

      const mockFile = {
        originalname: 'existing_sensor.xlsx',
        path: '/tmp/existing.xlsx',
      };

      const service = new fileProcessorService();
      const result = await service.matchFileToSensor(mockFile as any, mockSuitcase, '/tmp/existing.xlsx');

      // Should return the existing sensor match, not create a new one
      expect(mockPrisma.sensor.create).not.toHaveBeenCalled();
      expect(result).toBe(mockSuitcase.sensors[0]); // First sensor with EXISTING001
    });

    it('should create new sensor when no serial found in Excel', async () => {
      // Mock Excel file without serial in B6
      const mockWorkbook = {
        SheetNames: ['Resumo', 'Dados'],
        Sheets: {
          Resumo: {
            A1: { v: 'Some other data', w: 'Some other data' },
            // No B6 cell
          },
        },
      };

      mockXLSX.readFile.mockReturnValue(mockWorkbook);

      // Mock sensor type creation
      mockPrisma.sensorType.findFirst.mockResolvedValue(null);
      mockPrisma.sensorType.create.mockResolvedValue({
        id: 'sensor-type-123',
        name: 'Generic Logger',
      });

      // Mock sensor creation
      mockPrisma.sensor.create.mockResolvedValue({
        id: 'new-sensor-123',
        serialNumber: 'test_data_123456789',
        model: 'Auto-detected',
        typeId: 'sensor-type-123',
      });

      // Mock suitcase sensor association
      mockPrisma.suitcaseSensor.create.mockResolvedValue({
        id: 'suitcase-sensor-123',
        suitcaseId: 'suitcase-123',
        sensorId: 'new-sensor-123',
        sensor: {
          id: 'new-sensor-123',
          serialNumber: 'test_data_123456789',
          type: { id: 'sensor-type-123', name: 'Generic Logger' },
        },
      });

      const mockFile = {
        originalname: 'test_data.xlsx',
        path: '/tmp/test.xlsx',
      };

      const service = new fileProcessorService();
      const result = await service.matchFileToSensor(mockFile as any, mockSuitcase, '/tmp/test.xlsx');

      // Should create sensor type if not exists
      expect(mockPrisma.sensorType.findFirst).toHaveBeenCalledWith({
        where: { name: 'Generic Logger' },
      });

      expect(mockPrisma.sensorType.create).toHaveBeenCalled();

      // Should create new sensor with generated serial
      expect(mockPrisma.sensor.create).toHaveBeenCalledWith({
        data: {
          serialNumber: expect.stringContaining('test_data_'),
          model: 'Auto-detected',
          typeId: 'sensor-type-123',
        },
      });

      // Should associate with suitcase
      expect(mockPrisma.suitcaseSensor.create).toHaveBeenCalledWith({
        data: {
          suitcaseId: 'suitcase-123',
          sensorId: 'new-sensor-123',
        },
        include: {
          sensor: {
            include: {
              type: true,
            },
          },
        },
      });
    });

    it('should extract serial from filename when Excel reading fails', async () => {
      // Mock Excel reading failure
      mockXLSX.readFile.mockImplementation(() => {
        throw new Error('Excel read error');
      });

      // Mock sensor type and sensor creation
      mockPrisma.sensorType.findFirst.mockResolvedValue({
        id: 'sensor-type-123',
        name: 'Generic Logger',
      });

      mockPrisma.sensor.create.mockResolvedValue({
        id: 'new-sensor-123',
        serialNumber: 'EF7216103539',
        model: 'Auto-detected',
        typeId: 'sensor-type-123',
      });

      mockPrisma.suitcaseSensor.create.mockResolvedValue({
        id: 'suitcase-sensor-123',
        suitcaseId: 'suitcase-123',
        sensorId: 'new-sensor-123',
        sensor: {
          id: 'new-sensor-123',
          serialNumber: 'EF7216103539',
          type: { id: 'sensor-type-123', name: 'Generic Logger' },
        },
      });

      const mockFile = {
        originalname: 'data_EF7216103539.xlsx', // Contains serial in filename
        path: '/tmp/data.xlsx',
      };

      const service = new fileProcessorService();
      const result = await service.matchFileToSensor(mockFile as any, mockSuitcase, '/tmp/data.xlsx');

      // Should extract serial from filename
      expect(mockPrisma.sensor.create).toHaveBeenCalledWith({
        data: {
          serialNumber: 'EF7216103539',
          model: 'Auto-detected',
          typeId: 'sensor-type-123',
        },
      });
    });

    it('should handle different Excel sheet name variations', async () => {
      // Test different sheet name cases
      const testCases = [
        { sheetName: 'resumo', expected: true },
        { sheetName: 'Resumo', expected: true },
        { sheetName: 'RESUMO', expected: true },
        { sheetName: 'Resumo Geral', expected: true },
        { sheetName: 'Summary', expected: false },
        { sheetName: 'Dados', expected: false },
      ];

      for (const testCase of testCases) {
        const mockWorkbook = {
          SheetNames: [testCase.sheetName, 'Dados'],
          Sheets: {
            [testCase.sheetName]: {
              B6: { v: 'EXCEL001', w: 'EXCEL001' },
            },
          },
        };

        mockXLSX.readFile.mockReturnValue(mockWorkbook);

        const mockFile = {
          originalname: 'test.xlsx',
          path: '/tmp/test.xlsx',
        };

        const service = new fileProcessorService();
        await service.matchFileToSensor(mockFile as any, mockSuitcase, '/tmp/test.xlsx');

        if (testCase.expected) {
          expect(mockPrisma.sensor.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                serialNumber: 'EXCEL001',
              }),
            })
          );
        }
      }
    });

    it('should handle .xls files by skipping serial extraction', async () => {
      const mockFile = {
        originalname: 'legacy_data.xls',
        path: '/tmp/legacy.xls',
      };

      // Mock sensor creation for .xls files
      mockPrisma.sensorType.findFirst.mockResolvedValue({
        id: 'sensor-type-123',
        name: 'Generic Logger',
      });

      mockPrisma.sensor.create.mockResolvedValue({
        id: 'new-sensor-123',
        serialNumber: 'legacy_data_123456789',
        model: 'Auto-detected',
        typeId: 'sensor-type-123',
      });

      mockPrisma.suitcaseSensor.create.mockResolvedValue({
        id: 'suitcase-sensor-123',
        suitcaseId: 'suitcase-123',
        sensorId: 'new-sensor-123',
        sensor: {
          id: 'new-sensor-123',
          serialNumber: 'legacy_data_123456789',
          type: { id: 'sensor-type-123', name: 'Generic Logger' },
        },
      });

      const service = new fileProcessorService();
      const result = await service.matchFileToSensor(mockFile as any, mockSuitcase, '/tmp/legacy.xls');

      // Should NOT try to read Excel file for .xls
      expect(mockXLSX.readFile).not.toHaveBeenCalled();

      // Should create sensor with generated serial
      expect(mockPrisma.sensor.create).toHaveBeenCalled();
    });
  });
});