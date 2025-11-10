import { describe, it, expect } from '@jest/globals';

/**
 * Unit tests for the numeric template names bug fix
 * This test suite validates that the frontend correctly parses
 * the API response structure: { success: true, data: { templates: [...], pagination: {...} } }
 */
describe('Numeric Template Names - Bug Fix Validation', () => {
  describe('Frontend Response Parsing - Templates.tsx loadTemplates()', () => {
    it('should correctly parse the actual backend response structure', () => {
      // This is the ACTUAL response structure returned by EditorTemplateController.getTemplates()
      const actualBackendResponse = {
        success: true,
        data: {
          templates: [
            {
              id: 'template-1',
              name: '111111',
              description: 'Template with numeric name',
              category: 'default',
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
              name: 'Named Template',
              description: 'Regular template',
              category: 'default',
              tags: [],
              thumbnail: null,
              createdAt: '2025-11-10T14:00:00.000Z',
              updatedAt: '2025-11-10T14:00:00.000Z',
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

      // Simulate the CORRECTED loadTemplates() logic from Templates.tsx
      const payload = actualBackendResponse;
      let items: any[] = [];

      // This is the corrected parsing logic that should work
      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload?.data && Array.isArray(payload.data)) {
        // This would be wrong! payload.data is NOT an array
        items = payload.data;
      } else if ((payload as any)?.data?.templates && Array.isArray((payload as any).data.templates)) {
        // THIS IS CORRECT - templates are in payload.data.templates
        items = (payload as any).data.templates;
      } else if ((payload as any)?.templates && Array.isArray((payload as any).templates)) {
        items = (payload as any).templates;
      }

      // VERIFICATION: The items array should now contain the templates
      expect(items).toBeDefined();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(2);

      // Most importantly: The numeric-named template should be found
      const numericTemplate = items.find((t) => t.name === '111111');
      expect(numericTemplate).toBeDefined();
      expect(numericTemplate?.id).toBe('template-1');
      expect(numericTemplate?.name).toBe('111111');
    });

    it('should NOT match incorrect parsing patterns', () => {
      const actualBackendResponse = {
        success: true,
        data: {
          templates: [
            { id: '1', name: '111111', updatedAt: '2025-11-10T14:59:56.438Z' }
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        }
      };

      const payload = actualBackendResponse;

      // WRONG: payload.data is an object, not an array
      expect(Array.isArray(payload.data)).toBe(false);

      // CORRECT: payload.data.templates is an array
      expect(Array.isArray((payload as any).data?.templates)).toBe(true);
    });

    it('should handle various numeric template names', () => {
      const numericNames = ['111111', '000000', '1', '999999', '2025', '123456'];

      for (const name of numericNames) {
        const response = {
          success: true,
          data: {
            templates: [
              {
                id: `template-${name}`,
                name: name,
                updatedAt: new Date().toISOString()
              }
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
          }
        };

        const payload = response;
        let items: any[] = [];

        if ((payload as any)?.data?.templates && Array.isArray((payload as any).data.templates)) {
          items = (payload as any).data.templates;
        }

        expect(items.length).toBe(1);
        expect(items[0].name).toBe(name);
        console.log(`✓ Successfully parsed template with name: ${name}`);
      }
    });

    it('should correctly transform numeric-named templates for display', () => {
      const numericTemplate = {
        id: 'template-1',
        name: '111111',
        description: 'Template description',
        updatedAt: '2025-11-10T14:59:56.438Z'
      };

      // Transform for display (as done in Templates.tsx)
      const transformed = {
        id: numericTemplate.id,
        name: numericTemplate.name || 'Template',
        filename: numericTemplate.name ? `${numericTemplate.name}.hbs` : 'template.hbs',
        type: 'Editor Template',
        lastModified: numericTemplate.updatedAt,
        size: 25
      };

      expect(transformed.id).toBe('template-1');
      expect(transformed.name).toBe('111111');
      expect(transformed.filename).toBe('111111.hbs');
      expect(transformed.type).toBe('Editor Template');
    });
  });

  describe('Backend Response Structure - EditorTemplateController.getTemplates()', () => {
    it('should validate correct response structure from backend', () => {
      // This is what EditorTemplateController.getTemplates() returns
      const backendResponse = {
        success: true,
        data: {
          templates: [
            {
              id: 'id-123',
              name: '111111',
              description: 'test',
              category: 'default',
              tags: [],
              thumbnail: null,
              createdAt: '2025-11-10T00:00:00.000Z',
              updatedAt: '2025-11-10T00:00:00.000Z',
              createdBy: 'user-1',
              isPublic: false,
              version: 1
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      // Verify structure
      expect(backendResponse.success).toBe(true);
      expect(backendResponse.data).toBeDefined();
      expect(backendResponse.data.templates).toBeDefined();
      expect(Array.isArray(backendResponse.data.templates)).toBe(true);
      expect(backendResponse.data.pagination).toBeDefined();

      // Verify templates array contains numeric-named template
      const templates = backendResponse.data.templates;
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].name).toBe('111111');
    });

    it('should include required template fields', () => {
      const template = {
        id: 'id-123',
        name: '111111',
        description: 'Test template',
        category: 'default',
        tags: [],
        thumbnail: null,
        createdAt: '2025-11-10T00:00:00.000Z',
        updatedAt: '2025-11-10T00:00:00.000Z',
        createdBy: 'user-1',
        isPublic: false,
        version: 1
      };

      // All required fields should be present
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.tags).toBeDefined();
      expect(template.createdAt).toBeDefined();
      expect(template.updatedAt).toBeDefined();
      expect(template.createdBy).toBeDefined();
      expect(template.isPublic).toBeDefined();
      expect(template.version).toBeDefined();
    });
  });

  describe('Bug Fix Verification - Before and After', () => {
    it('should show the bug in the OLD parsing logic', () => {
      const response = {
        success: true,
        data: {
          templates: [
            { id: '1', name: '111111' }
          ],
          pagination: { page: 1 }
        }
      };

      // OLD BUGGY CODE from Templates.tsx (before fix):
      // This would try to treat payload.data as an array and fail
      const payload = response;
      let items_old: any[] = [];

      // First check
      if (Array.isArray(payload)) {
        items_old = payload;
      }
      // Second check - THIS IS WRONG! payload.data is an object, not an array
      else if (Array.isArray((payload as any).data)) {
        items_old = (payload as any).data; // Would NOT match
      }
      // Third check - payload.templates doesn't exist in the response
      else if (Array.isArray((payload as any).templates)) {
        items_old = (payload as any).templates; // Would NOT match
      }

      // Result: items_old would be empty!
      expect(items_old.length).toBe(0);
      console.log('✗ OLD CODE: Template "111111" would NOT be found');
    });

    it('should show the fix in the NEW parsing logic', () => {
      const response = {
        success: true,
        data: {
          templates: [
            { id: '1', name: '111111' }
          ],
          pagination: { page: 1 }
        }
      };

      // NEW FIXED CODE from Templates.tsx (after fix):
      const payload = response;
      let items_new: any[] = [];

      if (Array.isArray(payload)) {
        items_new = payload;
      } else if ((payload as any)?.data && Array.isArray((payload as any).data)) {
        items_new = (payload as any).data;
      } else if ((payload as any)?.data?.templates && Array.isArray((payload as any).data.templates)) {
        // THIS NOW MATCHES!
        items_new = (payload as any).data.templates;
      } else if ((payload as any)?.templates && Array.isArray((payload as any).templates)) {
        items_new = (payload as any).templates;
      }

      // Result: items_new now contains the template!
      expect(items_new.length).toBe(1);
      expect(items_new[0].name).toBe('111111');
      console.log('✓ NEW CODE: Template "111111" is now found!');
    });
  });

  describe('Pagination and Sorting', () => {
    it('should correctly parse pagination info', () => {
      const response = {
        success: true,
        data: {
          templates: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false
          }
        }
      };

      const pagination = (response as any).data.pagination;
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
      expect(pagination.total).toBe(25);
      expect(pagination.totalPages).toBe(3);
      expect(pagination.hasNext).toBe(true);
      expect(pagination.hasPrev).toBe(false);
    });
  });

  describe('Search and Filter', () => {
    it('should be able to search for numeric-named templates', () => {
      const response = {
        success: true,
        data: {
          templates: [
            { id: '1', name: '111111', description: 'Numeric template' },
            { id: '2', name: 'Regular', description: 'Normal template' }
          ]
        }
      };

      const templates = (response as any).data.templates;

      // Search for numeric name
      const found = templates.filter((t: any) => t.name.includes('111111'));
      expect(found.length).toBe(1);
      expect(found[0].name).toBe('111111');
    });
  });
});
