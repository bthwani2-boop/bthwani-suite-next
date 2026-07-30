from pathlib import Path

path = Path("services/dsh/contracts/paths/refunds.paths.yaml")
source = path.read_text(encoding="utf-8")
old = '$ref: "#/components/'
new = '$ref: "../dsh.openapi.yaml#/components/'
count = source.count(old)
if count == 0:
    raise SystemExit("refund fragment contains no local component references to normalize")
source = source.replace(old, new)
path.write_text(source, encoding="utf-8")
print(f"refund fragment reference normalization: PASS ({count} refs)")
