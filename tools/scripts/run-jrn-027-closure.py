#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Concurrent journey executions share sambassam. Restore only files that are
# absent, from the exact commits that originally introduced them. Existing
# files are never overwritten, so newer compatible work remains authoritative.
RESTORE_SOURCES: dict[str, str] = {
    "services/dsh/backend/internal/http/subscription_lifecycle_governed.go": "ac0c27fc97f080262122a5090779f8844a40ccf1",
    "services/dsh/backend/internal/wlt/subscription_lifecycle.go": "f04df3ebde3f07a45659ed0a8db9a19d8364e5fe",
    "services/dsh/backend/internal/wlt/commercial.go": "5fc129e493802985b9c05b04aabe9a2925eb4f52",
    "services/wlt/backend/internal/commercial/subscription_lifecycle.go": "b7afc7c0db913e76549a8498d7429302f3a517e4",
    "services/wlt/database/migrations/wlt-033_jrn027_subscription_lifecycle.sql": "928c5f0f96b777723475e05af9bd8975a5a74344",
    "services/dsh/database/migrations/dsh-103_jrn_027_subscription_lifecycle.sql": "619c1b1c3c0b9f5e77b0f4d7efac3639c19a7813",
    "governance/product/contracts/jrn-027-subscriptions-commercial-benefits.product-truth.json": "a569e7a630cf581dcf51d5b7bbdd0120fde8c9e7",
}


def restore_missing(path: str, commit: str) -> None:
    target = ROOT / path
    if target.exists():
        return
    content = subprocess.check_output(
        ["git", "show", f"{commit}:{path}"],
        cwd=ROOT,
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    print(f"restored missing JRN-027 file: {path} from {commit}")


for relative_path, source_commit in RESTORE_SOURCES.items():
    restore_missing(relative_path, source_commit)

subprocess.run(
    ["python3", "tools/scripts/close-jrn-027-remaining-slices.py"],
    cwd=ROOT,
    check=True,
)
