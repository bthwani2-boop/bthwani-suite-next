-- DSH-1005: forward-fix seed visibility from dsh-1004.
-- PostgreSQL data-modifying CTE writes were not visible to the sibling SELECT,
-- so template headers existed without items. Seed from committed headers here.

INSERT INTO dsh_readiness_checklist_template_items
  (template_id, check_type, label_ar, required, critical, evidence_required, display_order)
SELECT template.id, item.check_type, item.label_ar, TRUE, item.critical, TRUE, item.display_order
FROM dsh_readiness_checklist_templates template
CROSS JOIN (VALUES
  ('location_verified',      'التحقق من الموقع',             TRUE,  10),
  ('documents_uploaded',     'رفع المستندات المطلوبة',       TRUE,  20),
  ('product_list_submitted', 'تقديم قائمة المنتجات',         FALSE, 30),
  ('equipment_checked',      'فحص التجهيزات',                FALSE, 40),
  ('safety_compliant',       'الالتزام بمتطلبات السلامة',    TRUE,  50),
  ('hygiene_compliant',      'الالتزام بمتطلبات النظافة',    TRUE,  60)
) AS item(check_type, label_ar, critical, display_order)
WHERE template.operator_context_id = 'system-default'
ON CONFLICT (template_id, check_type) DO NOTHING;

INSERT INTO dsh_visit_checklist_requirements
  (visit_id, template_id, template_version, business_vertical_id, check_type,
   label_ar, required, critical, evidence_required, display_order)
SELECT visit.id, template.id, template.version, template.business_vertical_id,
       item.check_type, item.label_ar, item.required, item.critical,
       item.evidence_required, item.display_order
FROM dsh_field_visits visit
JOIN dsh_stores store ON store.id = visit.store_id
LEFT JOIN dsh_partners partner ON partner.id = store.partner_id
JOIN LATERAL (
  SELECT candidate.*
  FROM dsh_readiness_checklist_templates candidate
  WHERE candidate.operator_context_id = 'system-default'
    AND candidate.business_vertical_id IN (
      COALESCE(partner.business_vertical_id, store.catalog_domain_id, 'default'),
      'default'
    )
  ORDER BY CASE WHEN candidate.business_vertical_id = COALESCE(partner.business_vertical_id, store.catalog_domain_id, '') THEN 0 ELSE 1 END
  LIMIT 1
) template ON TRUE
JOIN dsh_readiness_checklist_template_items item ON item.template_id = template.id
ON CONFLICT (visit_id, check_type) DO NOTHING;
