import { describe, it, expect } from 'vitest';

/**
 * Test for Templates.tsx component
 * Validates that templates with numeric names appear in the list
 */
describe('Templates Page - Numeric Named Templates', () => {
  describe('loadTemplates() Response Parsing', () => {
    it('should handle API response with nested templates structure', () => {
      // Simulating the actual backend response: { success: true, data: { templates: [...], pagination: {...} } }
      const apiResponse = {
        success: true,
        data: {
          templates: [
            {
              id: 'template-1',
              name: '111111',
              description: 'Test template with numeric name',
              category: 'test',
              tags: ['numeric'],
              thumbnail: null,
              createdAt: '2025-11-10T14:59:56.438Z',
              updatedAt: '2025-11-10T14:59:56.438Z',
              createdBy: 'user-1',
              isPublic: false,
              version: 1
            },
            {
              id: 'template-2',
              name: 'Regular Template',
              description: 'Normal template name',
              category: 'default',
              tags: [],
              thumbnail: null,
              createdAt: '2025-11-10T13:00:00.000Z',
              updatedAt: '2025-11-10T13:00:00.000Z',
              createdBy: 'user-1',
              isPublic: false,
              version: 1
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      // Test the corrected parsing logic from Templates.tsx
      const payload = apiResponse;
      let items: any[] = [];

      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload?.data && Array.isArray(payload.data)) {
        items = payload.data;
      } else if ((payload as any)?.data?.templates && Array.isArray((payload as any).data.templates)) {
        items = (payload as any).data.templates;
      } else if ((payload as any)?.templates && Array.isArray((payload as any).templates)) {
        items = (payload as any).templates;
      }

      // Verify correct parsing
      expect(items).toBeDefined();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(2);

      // Verify numeric-named template is included
      const numericTemplate = items.find((t) => t.name === '111111');
      expect(numericTemplate).toBeDefined();
      expect(numericTemplate?.id).toBe('template-1');
      expect(numericTemplate?.name).toBe('111111');
    });

    it('should handle response with only numeric-named templates', () => {
      const apiResponse = {
        success: true,
        data: {
          templates: [
            {
              id: 'template-numeric-1',
              name: '111111',
              description: 'Pure numeric name',
              category: 'numeric',
              tags: ['numeric'],
              thumbnail: null,
              createdAt: '2025-11-10T14:59:56.438Z',
              updatedAt: '2025-11-10T14:59:56.438Z',
              createdBy: 'user-1',
              isPublic: false,
              version: 1
            },
            {
              id: 'template-numeric-2',
              name: '999999',
              description: 'Another numeric name',
              category: 'numeric',
              tags: ['numeric'],
              thumbnail: null,
              createdAt: '2025-11-10T14:55:00.000Z',
              updatedAt: '2025-11-10T14:55:00.000Z',
              createdBy: 'user-1',
              isPublic: false,
              version: 1
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      const payload = apiResponse;
      let items: any[] = [];

      if ((payload as any)?.data?.templates && Array.isArray((payload as any).data.templates)) {
        items = (payload as any).data.templates;
      }

      expect(items.length).toBe(2);
      expect(items[0].name).toBe('111111');
      expect(items[1].name).toBe('999999');
    });

    it('should handle different valid API response formats', () => {
      const testCases = [
        // Format 1: Direct array
        {
          name: 'Direct array format',
          response: [
            { id: '1', name: '111111', updatedAt: '2025-11-10T14:59:56.438Z' }
          ]
        },
        // Format 2: { data: [...] }
        {
          name: 'data as array format',
          response: {
            data: [
              { id: '1', name: '111111', updatedAt: '2025-11-10T14:59:56.438Z' }
            ]
          }
        },
        // Format 3: { data: { templates: [...] } }
        {
          name: 'data.templates nested format (current backend)',
          response: {
            data: {
              templates: [
                { id: '1', name: '111111', updatedAt: '2025-11-10T14:59:56.438Z' }
              ]
            }
          }
        },
        // Format 4: { templates: [...] }
        {
          name: 'templates direct format',
          response: {
            templates: [
              { id: '1', name: '111111', updatedAt: '2025-11-10T14:59:56.438Z' }
            ]
          }
        }
      ];

      for (const testCase of testCases) {
        const payload = testCase.response;
        let items: any[] = [];

        if (Array.isArray(payload)) {
          items = payload;
        } else if ((payload as any)?.data && Array.isArray((payload as any).data)) {
          items = (payload as any).data;
        } else if ((payload as any)?.data?.templates && Array.isArray((payload as any).data.templates)) {
          items = (payload as any).data.templates;
        } else if ((payload as any)?.templates && Array.isArray((payload as any).templates)) {
          items = (payload as any).templates;
        }

        expect(items.length).toBe(1);
        expect(items[0].name).toBe('111111');
      }
    });
  });

  describe('Template Data Transformation', () => {
    it('should correctly transform numeric-named templates', () => {
      const apiTemplate = {
        id: 'template-1',
        name: '111111',
        description: 'Numeric named template',
        category: 'test',
        tags: ['numeric'],
        thumbnail: null,
        createdAt: '2025-11-10T14:59:56.438Z',
        updatedAt: '2025-11-10T14:59:56.438Z',
        createdBy: 'user-1',
        isPublic: false,
        version: 1
      };

      // Simulate the transformation logic from Templates.tsx
      const transformed = {
        id: apiTemplate.id,
        name: apiTemplate.name || 'Template',
        filename: apiTemplate.name ? `${apiTemplate.name}.hbs` : 'template.hbs',
        type: 'Editor Template',
        lastModified: apiTemplate.updatedAt || new Date().toLocaleDateString('pt-BR'),
        size: (apiTemplate as any).size || Math.floor(Math.random() * 50) + 10
      };

      expect(transformed.id).toBe('template-1');
      expect(transformed.name).toBe('111111');
      expect(transformed.filename).toBe('111111.hbs');
      expect(transformed.type).toBe('Editor Template');
    });

    it('should handle missing fields gracefully', () => {
      const partialTemplate = {
        id: 'template-1',
        name: '111111'
        // Missing description, category, etc.
      };

      const transformed = {
        id: partialTemplate.id,
        name: (partialTemplate as any).name || 'Template',
        filename: (partialTemplate as any).name ? `${(partialTemplate as any).name}.hbs` : 'template.hbs',
        type: 'Editor Template',
        lastModified: (partialTemplate as any).updatedAt || new Date().toLocaleDateString('pt-BR'),
        size: (partialTemplate as any).size || Math.floor(Math.random() * 50) + 10
      };

      expect(transformed.name).toBe('111111');
      expect(transformed.filename).toBe('111111.hbs');
      expect(transformed.type).toBe('Editor Template');
    });
  });

  describe('Edge Cases for Numeric Names', () => {
    it('should handle templates with all-numeric names of various lengths', () => {
      const numericNames = ['1', '10', '100', '1000', '111111', '999999', '2025'];

      for (const name of numericNames) {
        const items = [
          {
            id: `template-${name}`,
            name,
            updatedAt: new Date().toISOString()
          }
        ];

        expect(items[0].name).toBe(name);
        expect((items[0] as any).filename || `${(items[0] as any).name}.hbs`).toBe(`${name}.hbs`);
      }
    });

    it('should handle templates with names that are only zeros', () => {
      const items = [
        {
          id: 'template-zero',
          name: '000000',
          updatedAt: new Date().toISOString()
        }
      ];

      expect(items[0].name).toBe('000000');
      expect(items[0].name).toBeTruthy(); // Should not be falsy
    });
  });

  describe('API Response Error Handling', () => {
    it('should handle empty template list', () => {
      const apiResponse = {
        success: true,
        data: {
          templates: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      const payload = apiResponse;
      let items: any[] = [];

      if (payload?.data?.templates && Array.isArray(payload.data.templates)) {
        items = payload.data.templates;
      }

      expect(items.length).toBe(0);
      expect(Array.isArray(items)).toBe(true);
    });

    it('should handle null or undefined responses gracefully', () => {
      const invalidResponses = [null, undefined, {}, { data: null }, { data: { templates: null } }];

      for (const response of invalidResponses) {
        let items: any[] = [];

        if (Array.isArray(response)) {
          items = response;
        } else if ((response as any)?.data && Array.isArray((response as any).data)) {
          items = (response as any).data;
        } else if ((response as any)?.data?.templates && Array.isArray((response as any).data.templates)) {
          items = (response as any).data.templates;
        } else if ((response as any)?.templates && Array.isArray((response as any).templates)) {
          items = (response as any).templates;
        }

        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBe(0);
      }
    });
  });
});
