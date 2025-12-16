
const { editorTemplateRenderer } = require('../dist/services/editorTemplateRenderer.js');

// Mock data
const mockData = {
  client: { name: 'Test Client' },
  validation: { id: 'val-123' },
  sensorData: [
    { timestamp: new Date(), temperature: 25.5, humidity: 60, sensorId: 's1' },
    { timestamp: new Date(), temperature: 26.0, humidity: 62, sensorId: 's1' }
  ],
  report: { generatedAt: new Date(), generatedBy: 'Tester' }
};

// Mock prisma
jest.mock('../dist/lib/prisma.js', () => ({
  prisma: {
    editorTemplate: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tpl-broken-table',
        pageSettings: { width: 210, height: 297 },
        globalStyles: {},
        pages: [], // Use root elements
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
            // Broken table element (missing columns, missing dataSource)
            {
                id: 'el-broken-table',
                type: 'table',
                position: { x: 0, y: 50 },
                size: { width: 200, height: 100 },
                content: {
                    // Empty content to simulate "just added" state
                },
                styles: {}
            }
        ]
      })
    }
  }
}));

async function runTest() {
  try {
    console.log('--- Starting Table Renderer Test ---');
    const html = await editorTemplateRenderer.renderToHTML('tpl-broken-table', mockData);
    console.log('Successfully rendered HTML (length):', html.length);
    if (!html.includes('editor-table')) {
        console.error('FAIL: Output does not contain table element');
        process.exit(1);
    }
    console.log('PASS: Rendered broken table without crashing');
  } catch (error) {
    console.error('FAIL: Test crashed', error);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
    runTest();
}
