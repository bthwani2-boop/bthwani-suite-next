# 06 — بوابات الصفر والتحقق والإغلاق

## 1. عدادات يجب أن تساوي صفرًا

```yaml
parallel_writable_sources: 0
duplicate_truth_owners: 0
duplicate_master_contract_indexes: 0
duplicate_method_paths: 0
duplicate_operation_ids: 0
manual_contract_registries: 0
manual_generated_clients: 0
contract_runtime_drift: 0
client_regeneration_diff: 0
unresolved_contract_refs: 0
universal_activation_codes: 0
silent_scope_or_tenant_fallbacks: 0
repair_after_incorrect_write: 0
role_permission_fallbacks: 0
untrusted_actor_or_scope_inputs: 0
legacy_runtime_routes: 0
legacy_read_fallbacks: 0
legacy_write_paths: 0
compatibility_layers_without_expiry: 0
financial_truth_outside_wlt: 0
direct_ledger_write_routes: 0
unbalanced_financial_transactions: 0
surface_business_logic: 0
raw_surface_api_calls: 0
surface_local_domain_enums: 0
ui_success_without_readback: 0
backend_effect_without_consumer: 0
runtime_reachable_mocks: 0
patch_preservation_tests: 0
unowned_permanent_files: 0
broken_governance_references: 0
unregistered_active_skills: 0
guards_with_parallel_truth_lists: 0
duplicate_or_unjustified_alias_commands: 0
stale_committed_evidence: 0
skipped_critical_checks: 0
failed_required_checks: 0
```

## 2. البوابات الإيجابية المطلوبة

```yaml
canonical_owner_proven: PASS
actor_and_scope_model_proven: PASS
authentication_proven: PASS
authorization_proven: PASS
session_and_device_lifecycle_proven: PASS
organization_and_data_isolation_proven: PASS
contract_runtime_parity: PASS
generated_client_reproducibility: PASS
database_migration_safety: PASS
financial_invariants: PASS
idempotency_and_concurrency: PASS
outbox_and_event_delivery: PASS
runtime_readiness: PASS
runtime_readback: PASS
multi_surface_consistency: PASS
governance_integrity: PASS
workflow_security: PASS
same_sha_ci: PASS
cleanup_residue_scan: PASS
```

## 3. طبقات التحقق

### Static

- typecheck/lint/build المتأثر.
- broken imports.
- dependency direction.
- dead files مع مراجعة الاستثناءات.

### Contracts

- Spectral/JSON Schema.
- bundle composition.
- uniqueness.
- runtime parity.
- generated client zero diff.

### Database

- fresh database.
- previous data.
- migration replay.
- partial failure and resume.
- constraints/indexes.
- read-after-write.
- backup/restore عند الانطباق.

### Security

- unauthenticated.
- expired/revoked session.
- wrong actor/surface/scope.
- privilege escalation.
- direct object identifier swapping.
- service impersonation.
- secrets/PII logging.

### Finance

- duplicate request.
- provider timeout/unknown result.
- provider success + local save failure.
- local save + response failure.
- refund full/partial.
- COD custody.
- settlement and reconciliation.
- cross-organization isolation.

### Runtime

- clean startup.
- health/readiness/liveness.
- dependencies unavailable.
- restart/recovery.
- no hidden seed or fallback.
- actual write and readback.

### Multi-surface

- action from the owning surface.
- backend persistence.
- readback in every affected surface.
- blocked and error states.
- no surface-specific truth drift.

### Governance and CI

- all AGENTS references exist.
- precedence and decision vocabulary validate.
- skill and guard registries match disk and package scripts.
- workflows are verification-only, least privilege, pinned, fail-closed.
- evidence belongs to final SHA.

## 4. exact-SHA

```text
Implemented SHA
= Reviewed SHA
= Tested SHA
= Runtime-proven SHA
= CI candidate SHA
```

إذا تحرك رأس الفرع بعد الدليل، يعاد التحقق المتأثر. لا تُستخدم نتائج فرع أو التزام سابق لإغلاق الرأس الجديد.

## 5. القرارات المسموحة

```text
FIX_REQUIRED
NEEDS_EVIDENCE
BLOCKED_EXTERNAL
READY_FOR_OWNER_REVIEW
CLOSED_WITH_EVIDENCE
```

الحالة الافتراضية `FIX_REQUIRED`.

لا يستخدم `CLOSED_WITH_EVIDENCE` عند:

- بقاء أي عداد حرج أكبر من صفر.
- فشل Check إلزامي.
- غياب Runtime proof لنطاق تشغيلي.
- غياب مراجعة مالية/أمنية مستقلة عند تغير نطاق محمي.
- اختلاف SHA بين الاختبار والمرشح.

## 6. معيار النجاح الحقيقي

لا يكفي:

- كثرة الملفات المحذوفة.
- نجاح Build أو Typecheck.
- مرور Regex guard.
- ظهور رسالة نجاح في UI.
- وجود وثيقة أو Product Truth.
- تشغيل Mock أو Seed.

النجاح هو:

```text
مالك واحد
→ كتابة صحيحة
→ عقد مطابق
→ بيانات محفوظة بقيود صحيحة
→ قراءة راجعة
→ ظهور صحيح في الأسطح
→ فشل ومنع واختبارات سلبية
→ Runtime حقيقي
→ صفر بقايا موازية
→ دليل على SHA النهائي
```