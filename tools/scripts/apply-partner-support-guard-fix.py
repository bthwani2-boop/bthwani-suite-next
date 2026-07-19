from pathlib import Path

root = Path(__file__).resolve().parents[2]
target = root / "tools/guards/partner/partner-support-truth-gate.mjs"
source = target.read_text(encoding="utf-8")
old = 'from "../../_guard-utils.mjs";'
new = 'from "../_guard-utils.mjs";'
if old in source:
    target.write_text(source.replace(old, new, 1), encoding="utf-8")
elif new not in source:
    raise RuntimeError("partner support guard import anchor is missing")
Path(__file__).unlink()
