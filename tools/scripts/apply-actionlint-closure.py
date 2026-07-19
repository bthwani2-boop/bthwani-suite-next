from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(relative: str, old: str, new: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if old not in text:
        if new in text:
            return
        raise RuntimeError(f"missing actionlint repair anchor: {relative}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    ".github/workflows/design-system.yml",
    "          exit $code",
    "          exit \"$code\"",
)
replace_once(
    ".github/workflows/lian-final-closure-gate.yml",
    "          test -f artifacts/lian-runtime-closure-evidence.json && cat artifacts/lian-runtime-closure-evidence.json || true",
    "          if test -f artifacts/lian-runtime-closure-evidence.json; then\n            cat artifacts/lian-runtime-closure-evidence.json\n          fi",
)
replace_once(
    ".github/workflows/lian-full-runtime-evidence.yml",
    "            test -f artifacts/lian-runtime-closure-evidence.json && cat artifacts/lian-runtime-closure-evidence.json || true",
    "            if test -f artifacts/lian-runtime-closure-evidence.json; then\n              cat artifacts/lian-runtime-closure-evidence.json\n            fi",
)

for relative in [
    ".github/workflows/lian-error-context-probe-v2.yml",
    "tools/scripts/apply-actionlint-closure.py",
]:
    path = ROOT / relative
    if path.exists():
        path.unlink()
