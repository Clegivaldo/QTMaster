BEGIN;
UPDATE reports SET "editorTemplateId" = NULL WHERE "editorTemplateId" IS NOT NULL AND "editorTemplateId" <> 'e7f52dab-f73d-4411-9e60-ca52675707d3';
DELETE FROM editor_templates WHERE id <> 'e7f52dab-f73d-4411-9e60-ca52675707d3';
COMMIT;
