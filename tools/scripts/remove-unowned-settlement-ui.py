from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "services/dsh/frontend/shared/finance-wlt-link/finance/finance-hub-runtime.api.ts"
FRONTEND = ROOT / "services/dsh/frontend"

symbols = [
    "upsertSettlementPolicy",
    "createSettlementFromDeliveredOrders",
    "SettlementPolicyInput",
    "GovernedSettlementInput",
    "SettlementActionResult",
]

usage: dict[str, list[str]] = {symbol: [] for symbol in symbols}
for path in FRONTEND.rglob("*"):
    if path == TARGET or path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
        continue
    source = path.read_text(encoding="utf-8")
    for symbol in symbols:
        if symbol in source:
            usage[symbol].append(str(path.relative_to(ROOT)))

active = {symbol: paths for symbol, paths in usage.items() if paths}
if active:
    raise RuntimeError(f"unowned settlement mutations still have frontend consumers: {active}")

source = TARGET.read_text(encoding="utf-8")
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

TARGET.write_text(source, encoding="utf-8")
print("unowned settlement mutation UI cleanup: PASS")
