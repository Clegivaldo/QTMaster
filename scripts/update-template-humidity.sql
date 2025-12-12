WITH updated AS (
  SELECT id, jsonb_agg(
    CASE WHEN elem->>'id' = 'chart-1765464065974-354neypsn'
      THEN jsonb_set(
        elem,
        '{content}',
        (elem->'content') || '{"dataSource": {"field":"humidity"}}'::jsonb,
        true
      )
    ELSE elem END
  ) AS new_elements
  FROM editor_templates, jsonb_array_elements(elements::jsonb) as arr(elem)
  WHERE id = 'e7f52dab-f73d-4411-9e60-ca52675707d3'
  GROUP BY id
)
UPDATE editor_templates
SET elements = updated.new_elements
FROM updated
WHERE editor_templates.id = updated.id;
