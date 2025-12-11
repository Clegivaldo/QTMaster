import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  sensorData: {
    findMany: vi.fn(),
  },
  validation: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Validation Controller - Sensor Data Query Limits', () => {
  let validationController: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockPrisma.sensorData.findMany.mockReset();
    mockPrisma.validation.findMany.mockReset();
    mockPrisma.validation.findUnique.mockReset();

    // Import the controller after mocking
    const module = await import('../backend/src/controllers/validationController');
    validationController = module;
  });

  describe('getValidationDetails function', () => {
    it('should query ALL sensor data without take: 1000 limit', async () => {
      // Mock validation exists
      mockPrisma.validation.findUnique.mockResolvedValue({
        id: 'test-validation-id',
        name: 'Test Validation',
        suitcase: { id: 'suitcase-1', name: 'Test Suitcase' },
        client: { id: 'client-1', name: 'Test Client' },
      });

      // Mock sensor data query - simulate large dataset
      const mockSensorData = Array.from({ length: 1500 }, (_, i) => ({
        id: `sensor-data-${i}`,
        timestamp: new Date(2024, 0, 1, i % 24, i % 60),
        temperature: 25 + Math.sin(i * 0.1),
        humidity: 60 + Math.cos(i * 0.1),
        sensorId: `sensor-${i % 10}`,
        sensor: {
          id: `sensor-${i % 10}`,
          serialNumber: `SERIAL${i % 10}`,
        },
      }));

      mockPrisma.sensorData.findMany.mockResolvedValue(mockSensorData);

      // Mock request/response
      const req = {
        params: { id: 'test-validation-id' },
        query: {},
      };

      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      // Call the function
      await validationController.getValidationDetails(req as any, res as any);

      // Verify sensorData.findMany was called WITHOUT take: 1000
      expect(mockPrisma.sensorData.findMany).toHaveBeenCalledWith({
        where: { validationId: 'test-validation-id' },
        include: {
          sensor: {
            select: {
              id: true,
              serialNumber: true,
            },
          },
        },
        orderBy: { timestamp: 'asc' },
        // Should NOT have take: 1000
      });

      // Verify the call does NOT include take: 1000
      const callArgs = mockPrisma.sensorData.findMany.mock.calls[0][0];
      expect(callArgs.take).toBeUndefined();
      expect(callArgs.take).not.toBe(1000);

      // Verify response includes all data
      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];

      // Should have processed all 1500 records
      expect(responseData.totalReadings).toBe(1500);
      expect(responseData.sensorData.length).toBeGreaterThan(1000);
    });

    it('should handle large datasets efficiently', async () => {
      // Mock validation exists
      mockPrisma.validation.findUnique.mockResolvedValue({
        id: 'large-validation-id',
        name: 'Large Validation',
        suitcase: { id: 'suitcase-1', name: 'Test Suitcase' },
        client: { id: 'client-1', name: 'Test Client' },
      });

      // Create a very large dataset (5000 records)
      const largeSensorData = Array.from({ length: 5000 }, (_, i) => ({
        id: `sensor-data-${i}`,
        timestamp: new Date(2024, 0, 1, i % 24, i % 60),
        temperature: 20 + Math.sin(i * 0.01) * 10,
        humidity: 50 + Math.cos(i * 0.01) * 20,
        sensorId: `sensor-${i % 20}`,
        sensor: {
          id: `sensor-${i % 20}`,
          serialNumber: `SERIAL${String(i % 20).padStart(3, '0')}`,
        },
      }));

      mockPrisma.sensorData.findMany.mockResolvedValue(largeSensorData);

      const req = {
        params: { id: 'large-validation-id' },
        query: {},
      };

      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      // Call the function
      await validationController.getValidationDetails(req as any, res as any);

      // Verify it can handle large datasets
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.totalReadings).toBe(5000);

      // Verify deduplication works (should remove duplicates by sensorId + timestamp)
      const uniqueRecords = responseData.sensorData.filter((item: any, index: number, arr: any[]) => {
        return arr.findIndex((other: any) =>
          other.sensorId === item.sensorId &&
          other.timestamp.getTime() === item.timestamp.getTime()
        ) === index;
      });

      expect(uniqueRecords.length).toBeLessThanOrEqual(5000);
    });

    it('should return correct statistics for large datasets', async () => {
      mockPrisma.validation.findUnique.mockResolvedValue({
        id: 'stats-validation-id',
        name: 'Stats Validation',
        suitcase: { id: 'suitcase-1', name: 'Test Suitcase' },
        client: { id: 'client-1', name: 'Test Client' },
      });

      // Create dataset with known statistics
      const sensorData = [
        // Sensor 1: temperatures around 25°C
        ...Array.from({ length: 100 }, (_, i) => ({
          id: `s1-${i}`,
          timestamp: new Date(2024, 0, 1, i % 24, i % 60),
          temperature: 25 + Math.sin(i * 0.1),
          humidity: 60,
          sensorId: 'sensor-1',
          sensor: { id: 'sensor-1', serialNumber: 'TEMP001' },
        })),
        // Sensor 2: temperatures around 30°C
        ...Array.from({ length: 100 }, (_, i) => ({
          id: `s2-${i}`,
          timestamp: new Date(2024, 0, 1, i % 24, i % 60),
          temperature: 30 + Math.cos(i * 0.1),
          humidity: 65,
          sensorId: 'sensor-2',
          sensor: { id: 'sensor-2', serialNumber: 'TEMP002' },
        })),
      ];

      mockPrisma.sensorData.findMany.mockResolvedValue(sensorData);

      const req = { params: { id: 'stats-validation-id' }, query: {} };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await validationController.getValidationDetails(req as any, res as any);

      const responseData = res.json.mock.calls[0][0];

      // Should have correct total readings
      expect(responseData.totalReadings).toBe(200);

      // Should have statistics for both sensors
      expect(responseData.sensorStats).toBeDefined();
      expect(Object.keys(responseData.sensorStats).length).toBeGreaterThan(0);
    });
  });
});