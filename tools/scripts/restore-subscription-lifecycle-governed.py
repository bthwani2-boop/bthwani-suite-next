from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "services/dsh/backend/internal/http/subscription_lifecycle_governed.go"
BLOB = "7b9921970bac73acb651649b8dd222317506158e"

content = subprocess.check_output(["git", "cat-file", "blob", BLOB], cwd=ROOT).decode("utf-8")
old = "\treturn plan, product, nil\n"
if content.count(old) != 1:
    raise SystemExit("expected subscription pointer anchor exactly once")
TARGET.write_text(content.replace(old, "\treturn &plan, product, nil\n", 1), encoding="utf-8")

(ROOT / "tools/scripts/restore-subscription-lifecycle-governed.py").unlink(missing_ok=True)
(ROOT / ".github/workflows/tmp-restore-subscription-lifecycle.yml").unlink(missing_ok=True)
