
import { editorTemplateRenderer } from '../src/services/editorTemplateRenderer';
import { prisma } from '../src/lib/prisma';

// Mock values
const mockData = {
    client: { name: 'Test Client' },
    validation: { id: 'val-123' },
    sensorData: [
        { timestamp: new Date(), temperature: 25.5, humidity: 60, sensorId: 's1' },
        { timestamp: new Date(), temperature: 26.0, humidity: 62, sensorId: 's1' }
    ],
    report: { generatedAt: new Date(), generatedBy: 'Tester' },
    sensors: []
};

// Mock prisma
jest.mock('../src/lib/prisma', () => ({
    prisma: {
        editorTemplate: {
            findUnique: jest.fn().mockResolvedValue({
                id: 'tpl-broken-table',
                pageSettings: { width: 210, height: 297 },
                globalStyles: {},
                pages: [],
                elements: [
                    // Safe element
                    {
                        id: 'el-text',
                        type: 'text',
                        position: { x: 0, y: 0 },
                        size: { width: 100, height: 20 },
                        content: 'Hello World',
                        styles: {}
                    },
                    // Broken table element - Case 1: content is empty object (should use defaults)
                    {
                        id: 'el-table-empty',
                        type: 'table',
                        position: { x: 0, y: 50 },
                        size: { width: 200, height: 100 },
                        content: {},
                        styles: {}
                    },
                    // Broken table element - Case 2: columns is null which is fine, but what if it's an object?
                    {
                        id: 'el-table-bad-cols',
                        type: 'table',
                        position: { x: 0, y: 150 },
                        size: { width: 200, height: 100 },
                        content: {
                            columns: { foo: 'bar' } // Not an array!
                        },
                        styles: {}
                    }
                ]
            })
        }
    }
}));

// Mock logger to suppress noise
jest.mock('../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

describe('Table Renderer Fix', () => {
    it('should render broken table elements without crashing', async () => {
        try {
            const html = await editorTemplateRenderer.renderToHTML('tpl-broken-table', mockData as any);
            // console.log(html);
            expect(html).toContain('Hello World');
            expect(html).toContain('editor-table');
        } catch (error) {
            console.error('Rendering failed:', error);
            throw error;
        }
    });
});
