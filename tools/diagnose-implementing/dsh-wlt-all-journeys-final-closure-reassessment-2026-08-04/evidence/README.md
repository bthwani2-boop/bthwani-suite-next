# فهرس الأدلة — dsh-wlt-all-journeys-final-closure-reassessment-2026-08-04

كل ملف هنا مشتق من Git Bundle الرسمي أو CI artifacts للرأس `f97dcbc3ecfbc19a130c4dbafef6cb7def9c3eb8`. لا توجد أسرار أو بيانات إنتاج.

## الجرد

- `tracked-files.csv`: كل الملفات المتتبعة مع الحجم والأسطر والبصمة والمالك والتصنيف.
- `dependency-edges-typescript.csv`, `dependency-edges-go.csv`, `package-scripts.csv`: الاستخدامات والاعتماديات والأوامر.
- `http-routes.csv`, `contract-operations.csv`, `contract-route-mismatches.csv`: النقل والعقود والتنفيذ.
- `surface-screens.csv`, `surface-controls-*.csv`, `screen-binding-warnings.csv`: الأسطح والشاشات والتحكمات.
- `journey-status-ledger.csv`, `journey-slice-ledger.csv`: 107 رحلات و2568 شريحة.
- `migration-manifest-ledger.csv`: ملفات manifests وحالة كل migration.
- `duplicate-content-groups.csv`, `large-text-files.csv`, `zero-byte-files.csv`, `gitkeep-candidates.csv`: التنظيف والمرشحون.

## CI والتشغيل

- `ci-status.csv`, `ci-job-step-matrix.csv`, `runtime-proof-summary.json`.
- `knip-findings.csv`, `framework-audit.csv`.

## القرار والربط

- `root-cause-matrix.csv`, `candidate-register.csv`, `authority-ledger.csv`, `package-file-manifest.csv`.

كل ادعاء حاكم مرتبط بمعرف Finding وTask وVerification داخل الملفات المركزية.

- `remote-head-and-ci.json`: current remote pin `f97dcbc3ecfbc19a130c4dbafef6cb7def9c3eb8`, official Git Bundle provenance, and current CI conclusions.
