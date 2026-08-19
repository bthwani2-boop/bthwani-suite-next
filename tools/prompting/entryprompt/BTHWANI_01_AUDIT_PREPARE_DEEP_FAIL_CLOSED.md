@GitHub

**BRANCH:** `<الفرع>`
**TASK:** `<اسم المهمة>`
**OBJECTIVE:** `<الهدف>`
**PHASE:** `AUDIT_PREPARE`
**PLAN_FILE:** `NONE — يُنشأ فقط بعد اكتمال التدقيق وحسم القرارات`

# ABSOLUTE PURPOSE

هذا أمر `AUDIT_PREPARE` حصريًا.

الهدف هو تنفيذ أعمق وأكمل:

`AUDIT + INSPECT + DIAGNOSE + ANALYZE + ROOT-CAUSE PROOF + CANONICAL TARGET DESIGN + EXECUTION PLANNING`

دون أي Target-System mutation.

القانون المطلق:

`AUDIT_PREPARE = READ-ONLY TARGET SYSTEM`

ممنوع أثناء هذا الأمر تنفيذ العلاج الفعلي أو تعديل النظام المستهدف.

المسموح في نهاية المرحلة فقط هو إنشاء:

`plans/diagnose-implementing/<TASK>.md`

كـ:

`TEMPORARY EXECUTION RECORD — NOT SOURCE OF TRUTH`.

الخطة تسجل الحقيقة والعلاج المطلوب فقط؛ لا تعتبر تنفيذًا ولا إغلاقًا.
**أمر إلزامي: الخطة الناتجة من هذا الأمر تعتبر سجل تنفيذ فقط، ولا يجب للخطة أن تطلب تحديثاً لها.**

> `DOCUMENTATION RECORDS THE REQUIRED FIX; IT NEVER SUBSTITUTES FOR THE FIX.`


# READ-ONLY MUTATION BOUNDARY — ABSOLUTE

`AUDIT_PREPARE` يمنع أي تغيير في Target System أو حالته التشغيلية، وليس فقط منع تعديل الملفات.

ممنوع في هذه المرحلة، ما لم يكن الإجراء Read-Only مثبتًا:

`Source/Contract/Data mutation`
`DB write / migration apply / backfill / seed`
`Start/Stop/Restart/Rebuild runtime for the purpose of changing system state`
`External provider/financial mutation`
`Deploy/Release/Merge/Tag`
`Secret/Key rotation`
`Governance mutation`
`Target branch/ref mutation`.

يسمح فقط بالملاحظة/الاستعلام Read-Only عندما تكون آمنة ومطلوبة لإثبات الحقيقة، مع تسجيل حدود الدليل وعدم اعتبار أي تشغيل يغيّر الحالة "تدقيقًا فقط".

الكتابة الوحيدة المسموح بها في نهاية المرحلة هي `PLAN_FILE` المؤقتة المطلوبة صراحةً، وبعد اكتمال بوابة القرارات والحقيقة التنفيذية.

---

# GOVERNING AUTHORITY

استخدم حصريًا:

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`

على أحدث HEAD الحقيقي للفرع المحدد.

طبّق كامل Goal-Driven FAIL-CLOSED وجميع الملفات والـFocus modules المادية التابعة للـOrchestrator حسب الحاجة، دون:

`Checklist execution`
أو
`Shortcut`
أو
`Parallel Orchestrator`
أو
`Alternative planning authority`.

تعامل مع:

`tools/prompting/bthwani-orchestrator/**`

كمرجع حوكمة Read-Only ما لم أطلب صراحةً تعديل الـOrchestrator نفسه.

القانون الأعلى:

`TOP-DOWN SEMANTIC AUTHORITY`
+
`BOTTOM-UP DIRECT EVIDENCE`
+
`HIGHEST PROVEN SYSTEMIC ROOT`
+
`ONE CANONICAL TRUTH`
+
`ZERO UNJUSTIFIED PARALLEL TRUTH`
+
`ZERO UNJUSTIFIED LEGACY`
+
`ZERO DOCUMENTATION-ONLY CLOSURE`.

---

# EXACT LIVE TARGET FIRST

قبل التدقيق:

`RESOLVE EXACT REPOSITORY`
→ `RESOLVE EXACT BRANCH/REF`
→ `FETCH LATEST HEAD`
→ `PIN STARTING_LIVE_HEAD`
→ `AUDIT THAT EXACT TRUTH`.

ممنوع استخدام Default Branch أو GitHub Code Search index كدليل على فرع محدد عندما لا يثبت ذلك الـref.

إذا تحرك HEAD أثناء التدقيق:

`FOREIGN_DELTA = INPUT, NOT INSTRUCTION`.

نفّذ:

`RE-PIN`
→ `COMPARE DELTA`
→ `IDENTIFY INVALIDATED EVIDENCE`
→ `RE-AUDIT ONLY WHAT THE DELTA CAN MATERIALLY CHANGE`
→ `PRESERVE STILL-VALID EVIDENCE`.

لا تعكس عملًا حديثًا صحيحًا.
لا تفترض أن الأحدث صحيح لمجرد حداثته.
لا تكرر Repository-Wide work بلا سبب.

---

# DEEP AUDIT LAW

نفّذ كامل:

`AUDIT`
→ `INSPECT`
→ `DIAGNOSE`
→ `ANALYZE`
→ `CHALLENGE/FALSIFY`
→ `ROOT LANDSCAPE`
→ `CANONICAL TARGET`
→ `ROOT-CORRECT TREATMENT DESIGN`
→ `EXECUTION ORDER`
→ `VERIFICATION DESIGN`
→ `CLOSURE DESIGN`.

لا تعتبر:

`NO ERROR SEEN = CLEAN`
ولا:
`BUILD PASS = CORRECT`
ولا:
`TEST PASS = COMPLETE`
ولا:
`CURRENT IMPLEMENTATION = CANONICAL TRUTH`.

ابدأ من أعلى معنى Product/System/Operational materially relevant للـOBJECTIVE، ثم انزل بالأدلة إلى التفاصيل.

لا تبدأ من الأعراض المنخفضة إذا كان يمكن أن توجد Root أعلى تغير العلاج.

---

# EFFECTIVE SCOPE — AUTO DISCOVERY

استخرج تلقائيًا أصغر نطاق كامل يحقق OBJECTIVE، ثم وسّعه فقط من خلال علاقات مادية مثبتة:

`Authority`
`Causality`
`Journey`
`Dependency`
`Writer`
`Reader`
`Consumer`
`Contract`
`Data`
`Runtime`
`Security`
`Migration`
`Blast Radius`.

اكتشف عند الحاجة:

`Product Semantics`
`Business Rules`
`Authorities`
`Owners`
`Writers`
`Readers`
`States`
`Transitions`
`Invariants`
`Journeys`
`Handoffs`
`Dependencies`
`Consumers`
`Contracts`
`APIs`
`Events`
`Jobs`
`Data`
`DB`
`Schemas`
`Migrations`
`Runtime`
`Config`
`Packages`
`Exports`
`Generated Artifacts`
`Native Boundaries`
`Infrastructure`
`CI`
`Security Boundaries`
`Authorization`
`Isolation`
`Surfaces`
`Governance Impact`.

لا تجعل عبارة "كل شيء" ترخيصًا لمسح عشوائي غير مرتبط بالهدف؛ لكن لا تستبعد أي علاقة مادية مثبتة لمجرد أنها خارج المجلد الأولي.

---


# SCOPE / EXCLUSION CLASSIFICATION — NO SILENT GAPS

كل Candidate Area مادي يجب أن ينتهي إلى حالة واحدة فقط:

`IN_SCOPE`
`READ_ONLY`
`NOT_AFFECTED_WITH_REASON`
`NOT_APPLICABLE_WITH_PROOF`
`FORBIDDEN_BY_HUMAN_OR_SAFETY`.

`UNKNOWN ≠ NOT_APPLICABLE_WITH_PROOF`.
`NOT_INSPECTED ≠ CLEAN`.
`NO_SEARCH_RESULT ≠ ABSENT`.

إذا كان OBJECTIVE Repository-wide، فلا يجوز استبعاد Domain/Surface/Foundation مادية دون Current Non-Impact Proof. وإذا كان OBJECTIVE محدودًا، لا يجوز إعلان Project-Wide Closure من Scope محدود.

# MATERIAL DEFECT ACCOUNTING

احصر وتتبع إلى أعلى Root مثبتة كل:

`Gap`
`Contradiction`
`Missing`
`Wrong Semantic`
`Wrong Owner`
`Parallel Truth`
`Duplicate Authority`
`Multiple Writers`
`Legacy`
`Duplicate`
`Dead`
`Stale`
`Unused`
`Orphan`
`Misplaced`
`Incorrect Naming`
`Broken Contract`
`Contract Drift`
`Generated Drift`
`Runtime Drift`
`Data Drift`
`Missing Consumer`
`Partial Migration`
`Half Cutover`
`Hidden Fallback`
`Silent Fallback`
`Workaround`
`Symptom Fix`
`Compatibility Shim`
`Incorrect State`
`Invalid Transition`
`Security Gap`
`Authorization Gap`
`Isolation Gap`
`Reliability Gap`
`Data Integrity Gap`
`Financial Integrity Gap`
`Performance Root`
`Unjustified Complexity`.

لا تعد كل symptom Root مستقلة.


استخدم vocabulary حالة واحدة متوافقة مع الـOrchestrator للـFindings:

`OPEN | EVIDENCE/HOLD | FIXED_PENDING_VERIFY | PROVEN_CLOSED | NOT_APPLICABLE_WITH_PROOF`.

ولا تنشئ حالات موازية جديدة تؤدي إلى Parallel Truth في accounting.

لكل Finding أثبت:

`Observed Evidence`
→ `Why it is wrong`
→ `Correct Authority`
→ `Causal Chain`
→ `Highest Proven Root Cause`
→ `Affected Cone`
→ `Canonical Target`
→ `Root-Correct Treatment`.

---

# ROOT PROOF AND RANKING

رتب الجذور وفق:

`Semantic Authority`
`Causal Height`
`Systemic Leverage`
`Blast Radius`
`Security/Data/Financial Risk`
`Number of Descendant Findings`
`Ability to eliminate parallel truth`
`Ability to simplify system`.

لا تعتمد على severity المحلية فقط.

إذا كانت Finding مجرد descendant لجذر أعلى:
لا تخطط لها كترقيع مستقل.

الهدف:

`FIX HIGHEST PROVEN SYSTEMIC ROOT FIRST`.

ابنِ dependency graph بين الجذور وحدد:

`Parent Root`
`Descendant`
`Independent Root`
`Blocked Root`
`Decision-Dependent Root`
`Parallelizable Root`.

---

# CANONICAL TRUTH / OWNER LAW

لكل Durable Fact أو Business/System Decision أثبت:

`Correct Owner`
+
`Authoritative Writer`
+
`Readers/Consumers`
+
`Storage/Contract`
+
`Lifecycle`.

القانون:

`ONE DURABLE FACT = ONE CANONICAL OWNER + ONE AUTHORITATIVE WRITE PATH`.

ممنوع اقتراح:

`Dual Writer`
`Parallel Authority`
`Local Shadow Truth`
`Frontend Business Authority`
`Cache-as-Authority`
`Projection-as-Writer`
`Compatibility Truth`
`Implicit fallback authority`.

إذا كانت Authority الصحيحة موجودة:
استخدمها ولا تنشئ بديلًا.

---

# CANONICAL TARGET

لا تكتفِ بقول "هناك مشكلة".

لكل Root ثبت الحالة الصحيحة المطلوبة End-to-End:

`Product/System Meaning`
`Owner`
`Invariants`
`States`
`Transitions`
`Contracts`
`Data`
`API`
`Runtime`
`Consumers`
`Failure Semantics`
`Unavailable Semantics`
`Recovery`
`Security`
`Cleanup`
`Final Negative Space`.

فرّق دائمًا بين:

`BUSINESS_DENIED`
و
`DEPENDENCY_UNAVAILABLE`
و
`SYSTEM_ERROR`
و
`NOT_CONFIGURED`
و
`NOT_AUTHORIZED`

عندما تكون هذه الفروق مادية.

لا تسمح بتحويل outage إلى business block أو العكس.

---

# ROOT-CORRECT TREATMENT DESIGN

صمم العلاج الجذري الكامل، لا patch.

ممنوع اقتراح:

`Patch`
`Workaround`
`Silent Fallback`
`Symptom Fix`
`Half Migration`
`Partial Cutover`
`Permanent Compatibility Shim`
`Dual Write`
`Dual Read Truth`
`Implicit First-Match Selection`
`Keep Legacy Just In Case`.

العلاج المقترح يجب أن يصل إلى كل ما يتأثر ماديًا عبر:

`Code`
`Contracts`
`Data`
`DB`
`Migrations`
`Runtime`
`Config`
`APIs`
`Jobs`
`Events`
`Generated Artifacts`
`Packages`
`Exports`
`Consumers`
`Surfaces`
`Infrastructure`
`CI`
`Security`
`Governance when authorized`.

---

# ROOT-CORRECTNESS + SIMPLICITY + CONTINUITY

اختر **أبسط تصميم مثبت الصحة** يحافظ على:

`Product Semantics`
`Invariants`
`Security`
`Authorization`
`Isolation`
`Reliability`
`Data Integrity`
`Financial Integrity`
`Performance`
`Operational Continuity`.

القوانين:

`WORKING ≠ JUSTIFIED`
`COMPLEX ≠ ROBUST`
`MORE LAYERS ≠ SAFER`
`MORE FILES ≠ BETTER DESIGN`
`LOCAL FIX ≠ SYSTEM FIX`
`ONE SURFACE PASS ≠ END-TO-END PASS`
`CANONICAL CHANGE WITHOUT ALL MATERIAL CONSUMERS MIGRATED = INCOMPLETE`.

حدد في الخطة ما يجب:

`Simplify`
`Merge`
`Move`
`Rename`
`Replace`
`Delete`

إذا لم يعد له Proven Value.

لكن لا تحذف قبل إثبات الـBlast Radius والـconsumers والهجرة المطلوبة.

---

# FULL BLAST-RADIUS MAPPING

لكل Root، يجب أن تتضمن الخطة Inventory واضحًا لكل materially affected:

`Owner`
→ `Writers`
→ `Readers`
→ `Consumers`
→ `Contracts`
→ `Generated Clients`
→ `APIs`
→ `Data`
→ `DB/Migrations`
→ `Jobs`
→ `Events`
→ `Runtime`
→ `Config`
→ `Packages/Exports`
→ `Surfaces`
→ `Tests`
→ `CI`
→ `Security`
→ `Governance Impact`.

حدد كل consumer يجب ترحيله قبل حذف المسار القديم.

ممنوع Plan تعتمد على:

`change owner now, consumers later`.

---

# GOVERNANCE FAIL-CLOSED

أدخل:

`governance/**`

دائمًا في Impact Analysis عندما يكون له صلة بالنطاق.

لكن:

`GOVERNANCE ≠ AUTOMATIC TRUTH`
`CURRENT CODE ≠ GOVERNANCE UPDATE AUTHORITY`
`UNCERTAINTY = NO GOVERNANCE WRITE`.

لا تقترح أو تنفذ:

`UPDATE`
`ADD`
`DELETE`
`MERGE`
`MOVE`
`RENAME`
`RESTRUCTURE`

في Governance قبل إثبات:

`Canonical Product/System Truth`
+
`Root Cause`
+
`Impact`
+
`Blast Radius`
+
`No material DECISION_REQUIRED`.

صنف الـGovernance evidence إلى ما يناسب:

`CONFIRMED`
`STALE`
`WRONG`
`CONFLICTING`
`INCOMPLETE`
`EVIDENCE/HOLD`
`DECISION_REQUIRED`.

لا تجعل Current Code سببًا كافيًا لتغيير Governance.

---


# EVIDENCE PROVENANCE + INVALIDATION

لكل Evidence مادية يعتمد عليها PLAN_FILE، سجّل بقدر يلزم:

`Claim/Root`
`Exact source identity / HEAD / candidate when applicable`
`Path/command/run/runtime/data source`
`Environment/profile when material`
`What it proves`
`What it does NOT prove`
`Freshness/provenance`
`Invalidation trigger`.

الهدف أن يبدأ EXECUTE_CLOSE من Evidence قابلة لإعادة الاستخدام بدل إعادة Audit من الصفر.

`VALID EVIDENCE → REUSE`.
`INVALIDATED EVIDENCE → REACQUIRE AFFECTED PROOF ONLY`.

# EXTERNAL RESEARCH

استخدم الحقيقة الداخلية أولًا.

إذا كانت حقيقة تقنية/Platform/Framework/Protocol/Standard مادية ولا يمكن حسمها من المستودع:

ابحث في **المصادر الرسمية/الأولية** المناسبة.

لا تستخدم External Research لاختراع Product Truth خاصة ببثواني.

فرّق في الخطة بين:

`Repository Evidence`
`Runtime/Data Evidence`
`Official External Technical Evidence`
`Inference`
`Human Product Decision`.

---


# CAPABILITY / TOOL DISCIPLINE

لكل Claim مادية:

`CLAIM → REQUIRED EVIDENCE → REQUIRED CAPABILITY → AVAILABLE? → ACQUISITION PATH → PROOF LIMIT`.

استخدم الأدوات/الـskills/الـintegrations المتاحة عندما تضيف دليلًا ماديًا، ولا تستخدمها لمجرد توفرها.

`MISSING REQUIRED CAPABILITY ≠ PASS`.

إذا تعذر دليل تقني/بيئي مطلوب فعليًا، سجله كـ`EXTERNAL_EVIDENCE_GAP` أو `EXTERNAL_BLOCKER` مع مسار الإثبات المطلوب، لا كنجاح مفترض.

# DECISION_REQUIRED — FAIL CLOSED

إذا وجدت قرار Product/Business/Semantic/Architectural جوهريًا لا يمكن اشتقاقه بأمان من الأدلة، وكان يمكن أن يغير:

`Canonical Target`
أو
`Treatment`
أو
`Data`
أو
`Contract`
أو
`Migration`
أو
`Security`
أو
`Governance`

فلا تخترع القرار.

**توقف قبل إنشاء PLAN_FILE.**

اجمع القرارات المادية — ويفضل دفعة واحدة — لكل قرار بصيغة:

`المشكلة`
+
`ما الذي يحتاج حسمًا`
+
`الخيارات`
+
`توصيتك`
+
`سبب التوصية`
+
`أثر كل خيار`
+
`مخاطر كل خيار`.

بعد قراري:

`PROPAGATE DECISION`
→ `RE-AUDIT ONLY AFFECTED CONE`
→ `UPDATE ROOT/TARGET/TREATMENT`
→ `CONTINUE AUDIT_PREPARE`.

لا تعيد كل التدقيق من الصفر إذا كان القرار يؤثر على Cone محددة فقط.

---

# MAXIMUM-SAFE PARALLEL AUDIT

استخدم أقصى توازي آمن للتدقيق عندما يمكن فصل أعمال discovery/evidence بوضوح.

قسم العمل حسب:

`Authority`
`Journey`
`Root Candidate`
`Independent Evidence Cone`

وليس عشوائيًا حسب الملفات فقط.

يجب أن تبقى هناك **Single Canonical Integration Authority** واحدة تجمع:

`Evidence`
`Root Landscape`
`Conflicts`
`Decisions`
`Ranking`
`Canonical Targets`
`Final Plan`.

لا تسمح لوكلاء متعددين بإنشاء Canonical Targets متعارضة لنفس الحقيقة.

`VALID EVIDENCE → REUSE`
`INVALIDATED EVIDENCE → REACQUIRE AFFECTED PROOF ONLY`.

ممنوع تكرار نفس التحقيق بواسطة أكثر من وكيل بلا سبب.

---


# PLAN_FILE WRITE / COLLISION / HEAD SAFETY

قبل كتابة PLAN_FILE:

`RE-RESOLVE LIVE HEAD`
→ `COMPARE WITH LAST AUDITED HEAD`
→ `REVALIDATE ONLY INVALIDATED MATERIAL ASSUMPTIONS`
→ `CONFIRM NO NEW MATERIAL DECISION_REQUIRED`
→ `WRITE ONE PLAN RECORD`.

لا تكتب فوق ملف موجود عميانيًا. إذا كان المسار موجودًا لنفس TASK:
افحصه وحدد هل هو نفس Temporary Execution Record المراد تحديثه، ثم حدّثه فقط بعد reconciliation. إذا كان ملفًا مختلف الغرض/الملكية، لا تستبدله أو تحذفه.

لا تنشئ ملفات plans/reports/status إضافية لنفس المهمة بلا ضرورة مادية؛ المطلوب Authority record مؤقت واحد فقط.

أي كتابة PLAN_FILE لا تغيّر حقيقة Target System ولا تُعتبر treatment.

# EXECUTION PLAN REQUIREMENTS

بعد حسم جميع DECISION_REQUIRED المادية اللازمة للتنفيذ، أنشئ خطة واحدة فقط:

`plans/diagnose-implementing/<TASK>.md`

يجب أن تكون الخطة **Execution-Ready** وليست مجرد تقرير.

يجب أن تحتوي على الأقل على:

1. Repository / Branch / audited HEAD.
2. Objective.
3. Effective Scope.
4. Explicit exclusions مع إثباتها إن كانت مادية.
5. Authority/Owner matrix.
6. Journey/State/Invariant model.
7. Evidence inventory.
8. Findings inventory.
9. Root Cause landscape.
10. Root dependency graph.
11. Root ranking.
12. Decisions and their propagation.
13. Canonical Target لكل Root.
14. Root-Correct Treatment لكل Root.
15. Exact Blast Radius.
16. Writers/Readers/Consumers inventory.
17. Contracts/API/Data/DB/Migration effects.
18. Runtime/Config/Infrastructure/CI effects.
19. Package/Generated artifact effects.
20. Surface effects.
21. Security/Authorization/Isolation effects.
22. Migration sequence.
23. Canonical Cutover sequence.
24. Legacy/Parallel path retirement sequence.
25. Simplification plan.
26. Cleanup/Delete/Move/Merge/Rename plan.
27. Governance disposition.
28. Verification matrix.
29. Positive/Negative/Failure/Recovery tests.
30. Runtime/DB/Integration evidence required.
31. Exact-candidate proof requirements.
32. Parallelization opportunities and collision constraints.
33. Root execution order.
34. Closure criteria.
35. Known external blockers, if any.
36. Negative-space verification requirements.
37. Adversarial final re-check requirements.
38. Evidence provenance + invalidation triggers اللازمة لإعادة الاستخدام في التنفيذ.
39. Exact pre-write/branch-race reconciliation requirements.
40. Protected/irreversible-operation gates إن كانت المعالجة قد تمس Production/Data/Secrets/Providers/Deploy/Financial external state.
41. Temporary compatibility contract إن كانت mixed-version rollout حاجة حقيقية: owner/consumers/observability/expiry/removal condition/one semantic authority.
42. Repository-platform/live GitHub evidence المطلوبة فقط عندما تعتمد claim على checks/rulesets/reviews/settings.
43. Review provenance المطلوبة فقط عندما تفرض policy/risk مراجعة مستقلة.
44. Performance before→after proof إذا كان Root متعلقًا بالبطء/tooling/CI/orchestration، مع إثبات عدم فقدان assurance أو نقل التكلفة فقط.
45. Execution start gate واضح يحدد أول `HIGHEST ACTIONABLE PROVEN ROOT` كي لا يبدأ EXECUTE_CLOSE بإعادة التخطيط.

لا تكتب مجرد:
`investigate`
أو
`review later`
أو
`fix as needed`

عندما يمكن تحديد العلاج الآن.

الخطة يجب أن تخبر EXECUTE_CLOSE:

`WHAT`
`WHY`
`WHERE`
`OWNER`
`ORDER`
`MIGRATION`
`CUTOVER`
`DELETE`
`VERIFY`
`CLOSE`.

---

# CLEANUP & FINISHING DESIGN — ZERO TOLERANCE

يجب أن تشمل الخطة Cleanup حتى مستوى:

`line`
→ `branch`
→ `function`
→ `symbol`
→ `file`
→ `file-group`
→ `folder`
→ `module/package`
→ `service/surface`
→ `domain`
→ `affected system cone`.

احصر ما يجب التخلص منه ضمن النطاق من:

`Dead`
`Stale`
`Duplicate`
`Legacy`
`Unused`
`Orphan`
`Misplaced`
`Incorrectly Named`
`Deprecated`
`Shadow Authority`
`Parallel Path`
`Old Import/Export`
`Old Reference`
`Alias without value`
`TODO`
`FIXME`
`HACK`
`Fallback`
`Workaround`
`Temporary Compatibility Path`
`Obsolete Config`
`Obsolete Script`
`Unused Dependency`
`Stale Doc`
`Orphan File/Folder`.

كل عنصر متأثر يجب تقييمه وفق:

`Necessary Purpose`
+
`Correct Owner`
+
`Real Consumer`
+
`Current Requirement`
+
`Proven Value`
+
`Correct Placement`.

وإذا فشل:
خطط لـ:
`Simplify / Merge / Move / Rename / Replace / Delete`.

---


# PROTECTED / IRREVERSIBLE ACTION DESIGN

إذا كان العلاج المخطط يمكن أن يتضمن:

`Production data mutation`
`Destructive backfill`
`Secret/key rotation`
`External financial/provider mutation`
`Deploy/Release/Merge/Tag`
`Infrastructure destruction`

فيجب أن تحدد الخطة مسبقًا:

`Exact authority`
`Exact environment/target`
`Scope`
`Candidate/change binding`
`Rollback/compensation where possible`
`Verification/readback`
`Human/safety gate if required`.

لا تجعل تنفيذًا عالي الخطورة قابلًا للتأويل أو الإطلاق على بيئة غير مثبتة.

# VERIFICATION DESIGN

لا تعتبر Build/Test واحدًا كافيًا.

صمم Verification مناسبة لكل claim من:

`Focused Test`
`Unit`
`Integration`
`Contract`
`OpenAPI`
`Generated Drift`
`Typecheck`
`Build`
`DB`
`Migration`
`Runtime`
`Smoke`
`Journey`
`Positive`
`Negative`
`Failure`
`Recovery`
`Security`
`Authorization`
`IDOR`
`Tenant/Actor Isolation`
`Adversarial`
`Negative Space`
`CI`
`Native/Device evidence when materially required`.

حدد ما يحتاج exact-candidate provenance:

`Source SHA`
`Container/Image`
`Migration Ledger`
`Generated Artifacts`
`CI`
`Runtime`.

أي دليل لا يمكن الحصول عليه في البيئة الحالية:
سجله بوضوح ولا تحول غياب الدليل إلى PASS.


اختبارات/Guards صحيحة لا تُضعف أو تُعطل أو تُغيّر توقعاتها لتطابق Implementation خاطئة. إذا كان test/guard نفسه قديمًا، أثبت أولًا الـCanonical Semantics ثم صححه مع إثبات أنه ما زال قادرًا على كشف السلوك المكسور.

`MOCK PASS ≠ REAL RUNTIME/PROVIDER PROOF` عندما تكون claim تشغيلية حقيقية.

---

# AUDIT_PREPARE CLOSURE

لا تعتبر مرحلة التخطيط مكتملة ما دام هناك:

`Unresolved material Root ambiguity`
`Unknown Canonical Target`
`Unknown material Blast Radius`
`Missing material Consumer`
`Unresolved material Decision`
`Unknown migration/cutover`
`Unspecified cleanup`
`Unspecified verification`
`Contradictory authority model`

يمكن حسمه ضمن هذه المرحلة.

لكن لا تحول التدقيق إلى حلقة بلا تقدم.

إذا اكتمل إثبات التنفيذ المطلوب:
أنشئ PLAN_FILE وانتهِ.

ممنوع Target-System mutation.

ممنوع تنفيذ العلاج.

ممنوع إعلان النظام `CLOSED`.

النهاية الوحيدة الصحيحة هي:

`AUDIT_PREPARE COMPLETE`
`TARGET_SYSTEM_MUTATION: NONE`
`READY_FOR_EXECUTION`
`PLAN_FILE: plans/diagnose-implementing/<TASK>.md`

ثم STOP.
