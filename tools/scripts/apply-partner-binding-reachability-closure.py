from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "governance/guards/frontend-binding-registry.json"

payload = json.loads(REGISTRY.read_text(encoding="utf-8"))
matched = False
for entry in payload.get("entries", []):
    if entry.get("id") != "partner.orders-inbox":
        continue
    entry["screen"] = "services/dsh/frontend/app-partner/DshPartnerSurface.tsx"
    entry["controller"] = "services/dsh/frontend/app-partner/orders/usePartnerOrdersRuntime.ts"
    matched = True

if not matched:
    raise RuntimeError("partner.orders-inbox binding entry is missing")

REGISTRY.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
Path(__file__).unlink()
