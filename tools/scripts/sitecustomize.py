from __future__ import annotations

import runpy
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUDIT_REPAIR = HERE / "apply-partner-team-audit-closure.py"
SELF = Path(__file__).resolve()

if AUDIT_REPAIR.exists():
    runpy.run_path(str(AUDIT_REPAIR), run_name="__main__")

if SELF.exists():
    SELF.unlink()
