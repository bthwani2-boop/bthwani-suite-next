from pathlib import Path

CONTRACT = Path("services/wlt/contracts/wlt.openapi.yaml")
INVALID = '#/components/responses/InvalidRequest'
VALID = '#/components/responses/BadRequest'

text = CONTRACT.read_text(encoding="utf-8")
count = text.count(INVALID)
if count == 0:
    raise SystemExit("no unresolved InvalidRequest response references found")
text = text.replace(INVALID, VALID)
CONTRACT.write_text(text, encoding="utf-8")
print(f"repaired {count} unresolved WLT response reference(s)")
