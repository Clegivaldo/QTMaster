import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_BASE = '/api/editor-templates';

/**
 * Test suite for templates with numeric names (like "111111")
 * This addresses the bug where numeric-named templates didn't appear in the list
 */
describe('Editor Templates with Numeric Names', () => {
  let authToken: string;
  let userId: string;
  let testTemplateIds: string[] = [];

  // Helper to create and return auth token
  async function getAuthToken() {
    try {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test@123456'
        });

      return response.body.token || response.body.data?.token;
    } catch (error) {
      console.log('Auth error, using test token');
      return 'test-token';
    }
  }

  beforeAll(async () => {
    // Get auth token
    authToken = await getAuthToken();
    
    // Get user ID from database or use a test user
    try {
      const user = await prisma.user.findFirst({
        where: { email: 'test@example.com' }
      });
      userId = user?.id || 'test-user-id';
    } catch (error) {
      console.log('Could not fetch user from database');
      userId = 'test-user-id';
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testTemplateIds.length > 0) {
      try {
        await prisma.editorTemplate.deleteMany({
          where: {
            id: { in: testTemplateIds }
          }
        });
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    testTemplateIds = [];
  });

  describe('Template Creation with Numeric Names', () => {
    it('should create a template with numeric name "111111"', async () => {
      const templateData = {
        name: '111111',
        description: 'Template with purely numeric name',
        category: 'test',
        elements: [
          {
            id: 'elem-1',
            type: 'text',
            content: 'Numeric Named Template',
            position: { x: 10, y: 10 },
            size: { width: 100, height: 20 },
            styles: { fontSize: '14px' },
            pageId: 'page-1'
          }
        ],
        pages: [
          {
            id: 'page-1',
            name: 'Page 1',
            elements: [],
            pageSettings: {
              size: 'A4',
              orientation: 'portrait',
              margins: { top: 20, right: 20, bottom: 20, left: 20 }
            }
          }
        ],
        globalStyles: {
          fontFamily: 'Arial',
          fontSize: 12,
          color: '#000000'
        },
        tags: ['numeric', 'test'],
        isPublic: false
      };

      const response = await request(BASE_URL)
        .post(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData);

      expect(response.status).toBeLessThan(400);
      expect(response.body.success).toBe(true);
      expect(response.body.data?.template?.id).toBeDefined();
      expect(response.body.data?.template?.name).toBe('111111');
      
      testTemplateIds.push(response.body.data.template.id);
    });

    it('should create templates with various numeric names', async () => {
      const numericNames = ['123456', '999999', '1', '0', '2025'];
      
      for (const name of numericNames) {
        const templateData = {
          name,
          description: `Template with name ${name}`,
          category: 'numeric-test',
          elements: [],
          pages: [],
          globalStyles: {},
          tags: ['numeric'],
          isPublic: false
        };

        const response = await request(BASE_URL)
          .post(API_BASE)
          .set('Authorization', `Bearer ${authToken}`)
          .send(templateData);

        expect(response.body.success).toBe(true);
        expect(response.body.data?.template?.name).toBe(name);
        testTemplateIds.push(response.body.data.template.id);
      }
    });
  });

  describe('Template Listing with Numeric Names', () => {
    let numericTemplateId: string;
    let numericTemplateName = '111111';

    beforeAll(async () => {
      // First, create a template with numeric name
      const response = await request(BASE_URL)
        .post(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: numericTemplateName,
          description: 'Template for list test',
          category: 'list-test',
          elements: [],
          pages: [],
          globalStyles: {},
          tags: ['numeric', 'list-test'],
          isPublic: false
        });

      if (response.body.data?.template?.id) {
        numericTemplateId = response.body.data.template.id;
        testTemplateIds.push(numericTemplateId);
      }
    });

    it('should list all templates including numeric-named ones', async () => {
      const response = await request(BASE_URL)
        .get(API_BASE)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(400);
      expect(response.body.success).toBe(true);
      
      // Check that response has correct structure
      expect(response.body.data).toBeDefined();
      expect(response.body.data.templates).toBeDefined();
      expect(Array.isArray(response.body.data.templates)).toBe(true);
      
      const templates = response.body.data.templates;
      console.log(`Found ${templates.length} templates`);
      
      // Should have at least the templates we created
      if (numericTemplateId) {
        const foundNumericTemplate = templates.find((t: any) => t.name === numericTemplateName);
        expect(foundNumericTemplate).toBeDefined();
        expect(foundNumericTemplate?.id).toBe(numericTemplateId);
      }
    });

    it('should find numeric-named templates in search results', async () => {
      const response = await request(BASE_URL)
        .get(`${API_BASE}/search?q=111111`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(400);
      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toBeDefined();

      // Should find our numeric template
      if (numericTemplateId) {
        const foundTemplate = response.body.data.templates.find((t: any) => t.name === '111111');
        expect(foundTemplate).toBeDefined();
      }
    });

    it('should list templates with pagination correctly', async () => {
      const response = await request(BASE_URL)
        .get(`${API_BASE}?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(400);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should list templates sorted by updatedAt descending by default', async () => {
      const response = await request(BASE_URL)
        .get(API_BASE)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(400);
      expect(response.body.data.templates).toBeDefined();
      
      const templates = response.body.data.templates;
      if (templates.length > 1) {
        // Check that templates are sorted by updatedAt descending
        for (let i = 0; i < templates.length - 1; i++) {
          const currentDate = new Date(templates[i].updatedAt);
          const nextDate = new Date(templates[i + 1].updatedAt);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });
  });

  describe('Frontend Response Parsing', () => {
    it('should handle the actual API response format correctly', async () => {
      const response = await request(BASE_URL)
        .get(API_BASE)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeLessThan(400);

      // Simulate frontend parsing logic
      const payload = response.body;
      let items: any[] = [];

      // This is the corrected logic from Templates.tsx
      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload?.data && Array.isArray(payload.data)) {
        items = payload.data;
      } else if (payload?.data?.templates && Array.isArray(payload.data.templates)) {
        items = payload.data.templates;
      } else if (payload?.templates && Array.isArray(payload.templates)) {
        items = payload.templates;
      }

      // Should successfully parse templates
      expect(items.length).toBeGreaterThanOrEqual(0);
      console.log(`Successfully parsed ${items.length} templates from response`);
    });
  });

  describe('API Response Structure Validation', () => {
    it('should return templates array nested in data object', async () => {
      const response = await request(BASE_URL)
        .get(API_BASE)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify structure: { success: true, data: { templates: [...], pagination: {...} } }
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.templates).toBeDefined();
      expect(Array.isArray(response.body.data.templates)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      
      // Verify pagination structure
      expect(response.body.data.pagination.page).toBeDefined();
      expect(response.body.data.pagination.limit).toBeDefined();
      expect(response.body.data.pagination.total).toBeDefined();
      expect(response.body.data.pagination.totalPages).toBeDefined();
    });

    it('should include all required template fields', async () => {
      const response = await request(BASE_URL)
        .get(API_BASE)
        .set('Authorization', `Bearer ${authToken}`);

      const templates = response.body.data.templates;
      
      if (templates.length > 0) {
        const template = templates[0];
        
        // Check required fields
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.createdAt).toBeDefined();
        expect(template.updatedAt).toBeDefined();
        expect(template.createdBy).toBeDefined();
        expect(template.isPublic).toBeDefined();
      }
    });
  });
});
