from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "services/dsh/frontend/shared/finance-wlt-link/finance/finance-hub-runtime.api.ts"
CONTROLLER = ROOT / "services/dsh/frontend/shared/finance-wlt-link/finance/finance.controller.ts"
PANEL = ROOT / "services/dsh/frontend/control-panel/finance/GovernedSettlementPanel.tsx"
FRONTEND = ROOT / "services/dsh/frontend"

symbols = [
    "upsertSettlementPolicy",
    "createSettlementFromDeliveredOrders",
    "SettlementPolicyInput",
    "GovernedSettlementInput",
    "SettlementActionResult",
]
allowed_consumers = {API, CONTROLLER, PANEL}
usage: dict[str, list[str]] = {symbol: [] for symbol in symbols}
for path in FRONTEND.rglob("*"):
    if path in allowed_consumers or path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
        continue
    source = path.read_text(encoding="utf-8")
    for symbol in symbols:
        if symbol in source:
            usage[symbol].append(str(path.relative_to(ROOT)))
active = {symbol: paths for symbol, paths in usage.items() if paths}
if active:
    raise RuntimeError(f"unowned settlement mutations have external consumers: {active}")

panel_consumers: list[str] = []
for path in FRONTEND.rglob("*"):
    if path == PANEL or path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
        continue
    if "GovernedSettlementPanel" in path.read_text(encoding="utf-8"):
        panel_consumers.append(str(path.relative_to(ROOT)))
if panel_consumers:
    raise RuntimeError(f"orphan settlement panel is still imported: {panel_consumers}")

source = API.read_text(encoding="utf-8")
type_pattern = re.compile(
    r"\nexport type SettlementPolicyInput = \{.*?\nexport type SettlementActionResult =\n"
    r"  \| \{ readonly ok: true; readonly data: unknown \}\n"
    r"  \| \{ readonly ok: false; readonly code: string; readonly message: string \};\n",
    re.DOTALL,
)
source, type_count = type_pattern.subn("\n", source, count=1)
if type_count != 1:
    raise RuntimeError(f"settlement mutation type block: expected one match, found {type_count}")
function_pattern = re.compile(
    r"\nexport async function upsertSettlementPolicy\(.*?\n\}\n\n"
    r"export async function createSettlementFromDeliveredOrders\(.*?\n\}\n",
    re.DOTALL,
)
source, function_count = function_pattern.subn("\n", source, count=1)
if function_count != 1:
    raise RuntimeError(f"settlement mutation function block: expected one match, found {function_count}")
API.write_text(source, encoding="utf-8")

controller = CONTROLLER.read_text(encoding="utf-8")
for line in [
    "  upsertSettlementPolicy,\n",
    "  createSettlementFromDeliveredOrders,\n",
    "  GovernedSettlementInput,\n",
    "  SettlementActionResult,\n",
    "  SettlementPolicyInput,\n",
]:
    count = controller.count(line)
    if count != 1:
        raise RuntimeError(f"controller cleanup expected one occurrence of {line.strip()}, found {count}")
    controller = controller.replace(line, "", 1)
for line in [
    "  upsertSettlementPolicy,\n",
    "  createSettlementFromDeliveredOrders,\n",
]:
    count = controller.count(line)
    if count != 1:
        raise RuntimeError(f"controller export cleanup expected one occurrence of {line.strip()}, found {count}")
    controller = controller.replace(line, "", 1)
CONTROLLER.write_text(controller, encoding="utf-8")

if not PANEL.exists():
    raise RuntimeError("orphan GovernedSettlementPanel is already missing")
PANEL.unlink()
print("unowned settlement mutation UI cleanup: PASS")
