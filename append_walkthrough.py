import os

file_path = r"C:\Users\bassa\.gemini\antigravity-ide\brain\ca6921a1-358d-47e9-8cae-4f1cee82f003\walkthrough.md"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remove the last line if it's "Pushed -> origin/smsm"
if lines and "Pushed" in lines[-1]:
    lines = lines[:-1]

content = "".join(lines)
content += """Pushed → `origin/smsm`

---

# J009: Structural Mapping (Trusted Scope) — Walkthrough

## ما تم إنجازه

تنفيذ مبدأ **Trusted Scope Boundary** على جميع العمليات التي تقرأ `operatorContextId`. الهوية يجب أن تأتي من طبقة الـ `wlt` / `auth` (Identity Session) ولا يمكن الوثوق بأي قيمة قادمة من الـ Client عبر الـ URL Query Parameters. تم معالجة ثغرات الـ IDOR في `dispatch_governance_handlers.go`.

---

## التغييرات الجوهرية

### 1. DSH Backend — `dispatch_governance_handlers.go`
- حُذف استخدام `r.URL.Query().Get("operatorContextId")` من جميع الـ read handlers:
  - `handleListGovernedOperatorDispatchAssignments`
  - `handleListGovernedCaptainDispatchAssignments`
  - `handleListCaptainDispatchCandidates`
  - `handleListDispatchDecisions`
- تم استبداله بـ `wlt.OperatorContextIDFromContext(r.Context())` (أو من الـ actor مباشرة بالنسبة للـ captain) ليتم الاعتماد حصراً على الهوية الموثوقة من السيرفر.

### 2. الاختبارات — `dispatch_operator_context_boundary_test.go`
- أضيفت اختبارات حماية كاملة للتأكد من أن السيرفر يتجاهل الـ `operatorContextId` المُرسل في:
  - Query Params (`?operatorContextId=spoofed`)
  - Headers (`X-Operator-Context-ID: spoofed`)
  - Request Body
- أضيف اختبار للتأكد من فشل الطلب `403 Forbidden` في حال غياب السياق الموثوق (Missing trusted context fails closed).
- أضيفت وحدة اختبار (Unit-test) للـ Captain Handler للتأكد من أنه يقرأ الـ Operator Context من الـ Identity Session (actor.OperatorContextID) وليس من الـ Query.

### 3. إصلاحات مساندة للرحلة السابقة J008
- تم تحديث `media_upload_test.go` ليستبدل `Bearer operator-token` بـ `Bearer field-owner-token`، لأن تحميل الملفات أصبح يحتاج `field` أو `partner` (بعد إزالة دور الـ operator).
- تم تحديث `representative_finance_routes_test.go` لتمرير Permission صريح `FinancePermissionRead` بدلاً من دور `operator` الذي تم إلغاؤه.

---

## نتائج التحقق

| الاختبار | النتيجة |
|---|---|
| `go test ./internal/http/... -count=1` | ✅ PASS (101 Tests Passed) |
| `go build ./internal/http/...` | ✅ PASS |
| Dispatch Scope Isolation Tests (13 tests) | ✅ PASS |
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("done")
