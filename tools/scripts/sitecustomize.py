from __future__ import annotations

import atexit
import runpy
import sys
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
AUDIT_REPAIR = HERE / "apply-partner-team-audit-closure.py"
SELF = Path(__file__).resolve()
ERROR_LOG = ROOT / "artifacts/partner-journey-closure/python-repair-error.log"


def write_uncaught(exc_type, exc_value, exc_traceback) -> None:
    ERROR_LOG.parent.mkdir(parents=True, exist_ok=True)
    with ERROR_LOG.open("a", encoding="utf-8") as stream:
        stream.write(f"SCRIPT={Path(sys.argv[0]).as_posix()}\n")
        traceback.print_exception(exc_type, exc_value, exc_traceback, file=stream)
        stream.write("\n")
    sys.__excepthook__(exc_type, exc_value, exc_traceback)


sys.excepthook = write_uncaught

if AUDIT_REPAIR.exists():
    runpy.run_path(str(AUDIT_REPAIR), run_name="__main__")

if Path(sys.argv[0]).name == "apply-partner-settings-truth-closure.py":
    @atexit.register
    def remove_diagnostic_hook() -> None:
        if SELF.exists():
            SELF.unlink()
