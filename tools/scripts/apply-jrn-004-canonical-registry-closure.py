from pathlib import Path

path = Path("governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md")
source = path.read_text(encoding="utf-8")

old_row = "| JRN-004 | اكتشاف المتاجر وسياقها وحوكمتها | DSH | NEEDS_EVIDENCE |"
new_row = "| JRN-004 | اكتشاف المتاجر وسياقها وحوكمتها | DSH | READY_FOR_REVIEW |"
if source.count(old_row) != 1:
    raise SystemExit(f"expected one JRN-004 NEEDS_EVIDENCE row, found {source.count(old_row)}")
source = source.replace(old_row, new_row)

anchor = "- سجل تدقيق المتجر وقراءة أثر القرار في كل سطح.\n"
addition = """

حالة التنفيذ الحالية: `READY_FOR_REVIEW`.

- سجل الشرائح: `services/dsh/contracts/jrn-004-slice-verification-registry.json`.
- Product Truth: `governance/product-truth/JRN-004_STORE_DISCOVERY_CONTEXT_GOVERNANCE.md`.
- دليل التنفيذ: `governance/evidence/JRN-004_SLICE_EXECUTION_LOG.md`.
- بوابة نفس الالتزام: `journeys/jrn-004/fullstack-slices`.
- جميع الشرائح الوظيفية و`FS-01..FS-18` مغلقة داخليًا؛ الموافقات المستقلة فقط متبقية قبل `CLOSED_WITH_EVIDENCE`.
"""
if "services/dsh/contracts/jrn-004-slice-verification-registry.json" not in source:
    if source.count(anchor) != 1:
        raise SystemExit(f"expected one JRN-004 audit anchor, found {source.count(anchor)}")
    source = source.replace(anchor, anchor + addition)

path.write_text(source, encoding="utf-8")
