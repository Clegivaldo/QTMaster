import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock app - você precisa exportar o app do seu server.ts
// Para este exemplo, vamos assumir que a app está rodando em http://localhost:3000
const BASE_URL = 'http://localhost:3000';
const API_BASE = '/api/editor-templates';

interface TestTemplate {
  id?: string;
  name: string;
  description?: string;
  category: string;
  elements: any[];
  pages: any[];
  globalStyles: any;
  tags?: string[];
  isPublic?: boolean;
}

describe('Editor Templates API', () => {
  let testTemplateId: string;
  const authToken = 'test-token'; // Você precisará implementar auth real
  
  const createTestTemplate = (): TestTemplate => ({
    name: `Template Test ${Date.now()}`,
    description: 'Template de teste',
    category: 'test',
    elements: [
      {
        id: 'elem-1',
        type: 'text',
        content: 'Test Content',
        position: { x: 10, y: 10 },
        size: { width: 100, height: 20 },
        styles: {},
        pageId: 'page-1'
      }
    ],
    pages: [
      {
        id: 'page-1',
        name: 'Página 1',
        elements: [],
        pageSettings: {
          size: 'A4',
          orientation: 'portrait',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          backgroundColor: '#ffffff',
          showMargins: true
        }
      }
    ],
    globalStyles: {
      fontFamily: 'Arial',
      fontSize: 12,
      color: '#000000',
      backgroundColor: '#ffffff',
      lineHeight: 1.4
    },
    tags: ['test'],
    isPublic: false
  });

  describe('POST /api/editor-templates', () => {
    it('should create a new template', async () => {
      const templateData = createTestTemplate();
      
      const response = await request(BASE_URL)
        .post(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template).toBeDefined();
      expect(response.body.data.template.id).toBeDefined();
      expect(response.body.data.template.name).toBe(templateData.name);
      
      testTemplateId = response.body.data.template.id;
    });

    it('should fail without required fields', async () => {
      const invalidData = { description: 'Missing name' };
      
      const response = await request(BASE_URL)
        .post(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/editor-templates/:id', () => {
    beforeEach(async () => {
      // Criar um template antes dos testes
      const templateData = createTestTemplate();
      const response = await request(BASE_URL)
        .post(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData);
      
      testTemplateId = response.body.data.template.id;
    });

    it('should get a template by id', async () => {
      const response = await request(BASE_URL)
        .get(`${API_BASE}/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.id).toBe(testTemplateId);
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(BASE_URL)
        .get(`${API_BASE}/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('não encontrado');
    });
  });

  describe('PUT /api/editor-templates/:id', () => {
    beforeEach(async () => {
      // Criar um template antes dos testes
      const templateData = createTestTemplate();
      const response = await request(BASE_URL)
        .post(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData);
      
      testTemplateId = response.body.data.template.id;
    });

    it('should update an existing template', async () => {
      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description',
        category: 'updated'
      };

      const response = await request(BASE_URL)
        .put(`${API_BASE}/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.template.name).toBe(updateData.name);
      expect(response.body.data.template.description).toBe(updateData.description);
      expect(response.body.data.template.version).toBe(2);
    });

    it('should fail to update non-existent template', async () => {
      const updateData = { name: 'New Name' };

      const response = await request(BASE_URL)
        .put(`${API_BASE}/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('não encontrado');
    });

    it('should fail without authentication', async () => {
      const updateData = { name: 'New Name' };

      const response = await request(BASE_URL)
        .put(`${API_BASE}/${testTemplateId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/editor-templates/:id', () => {
    beforeEach(async () => {
      const templateData = createTestTemplate();
      const response = await request(BASE_URL)
        .post(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData);
      
      testTemplateId = response.body.data.template.id;
    });

    it('should delete a template', async () => {
      const response = await request(BASE_URL)
        .delete(`${API_BASE}/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await request(BASE_URL)
        .get(`${API_BASE}/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Export endpoints', () => {
    beforeEach(async () => {
      const templateData = createTestTemplate();
      const response = await request(BASE_URL)
        .post(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData);
      
      testTemplateId = response.body.data.template.id;
    });

    it('should export template as JSON', async () => {
      const response = await request(BASE_URL)
        .get(`${API_BASE}/${testTemplateId}/export`)
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBeDefined();
    });

    it('should export template as FRX', async () => {
      const response = await request(BASE_URL)
        .get(`${API_BASE}/${testTemplateId}/export`)
        .query({ format: 'frx' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.type).toContain('xml');
    });
  });

  describe('List templates', () => {
    it('should list user templates', async () => {
      const response = await request(BASE_URL)
        .get(API_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.templates)).toBe(true);
    });

    it('should filter templates by category', async () => {
      const response = await request(BASE_URL)
        .get(API_BASE)
        .query({ category: 'test' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.templates)).toBe(true);
    });
  });
});
