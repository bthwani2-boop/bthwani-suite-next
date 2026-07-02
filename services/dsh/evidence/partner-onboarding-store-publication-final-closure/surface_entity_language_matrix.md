# surface_entity_language_matrix

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

```yaml
surface_entity_language_matrix:
  app-field:
    partner_labels_allowed: [ملف شريك, مسودة, وثائق, زيارة ميدانية, إرسال للمراجعة]
    store_labels_allowed: [بيانات المتجر الأول (draft), صور المتجر]
    forbidden_labels: [تفعيل, ظهور للعميل, نشر المتجر]
    allowed_partner_actions: [createFieldPartnerDraft, updateFieldPartnerDraft, uploadFieldPartnerDocument, createFieldPartnerVisit, submitFieldPartnerDraft]
    allowed_store_actions: [getFieldPartnerStore, updateFieldPartnerStore (draft only)]
    forbidden_actions: [transitionDshPartner, any client-visibility decision]
    verification_command: rg -n "transition|client_visible" services/dsh/frontend/app-field
  control-panel:
    partner_section_labels: [الشركاء, اعتماد الوثائق, مراجعة العمليات, تفعيل الشريك]
    store_section_labels: [المتاجر, بوابات النشر, إظهار المتجر للعميل, إخفاء المتجر]
    allowed_partner_decisions: [preliminary_accept, request_missing_documents, schedule_field_visit, approve_documents, start_ops_review, approve_ops, reject_partner, activate_partner, deactivate_partner]
    allowed_store_decisions: [show_store_to_client, hide_store_from_client, store governance (status/is_visible/serviceability/catalog/marketing)]
    forbidden_mixed_decisions: single button that activates partner AND publishes store — not present; activate_partner targets partner_active only (partner-activation.model.ts: "تفعيل الشريك دون إظهاره للعميل قبل اكتمال بوابات المتجر")
    verification_command: rg -n "activate_partner|show_store_to_client" services/dsh/frontend/shared/partner/partner-activation.model.ts
  app-partner:
    partner_status_labels: [حالة الانضمام, النواقص والجاهزية, الشريك نشط]
    store_management_labels: [المخزون والكتالوج, المتجر والفريق]
    forbidden_self_activation_labels: none present — hub shows "لا يمكن تفعيل الحساب ذاتيًا. تتم المراجعة والتفعيل من لوحة التحكم."; StoreReadinessGate toggle removed (read-only)
    partner_active_before_client_visible: banner "الشريك نشط داخليًا، المتجر غير ظاهر للعملاء حتى اكتمال بوابات النشر" + analytics/marketing section locked
    verification_command: rg -n "isInternalActiveOnly|لا يمكن تفعيل الحساب ذاتيًا" services/dsh/frontend/app-partner
  app-client:
    visible_entity: StoreOnly
    forbidden_partner_exposure: PASS  # client endpoints (listDshStores/getDshStore/getDshHomeDiscovery) return Store models filtered by publication gates; no partner routes in client namespace
    verification_command: rg -n "partner" services/dsh/frontend/app-client --ignore-case (no Partner entity rendering; store discovery only)
```
