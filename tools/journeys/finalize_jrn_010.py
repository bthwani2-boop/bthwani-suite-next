#!/usr/bin/env python3
"""Finalize JRN-010 technical closure metadata after same-content verification.

This tool never promotes the financial journey beyond READY_FOR_REVIEW. It
records that FS-01..FS-18 are technically implemented and preserves the
independent Product, QA, Security/Finance and Release/Production gates.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SLICE_PATH = ROOT / "services/dsh/contracts/jrn-010-slice-verification-registry.json"
EVIDENCE_PATH = ROOT / "governance/evidence/JRN-010_CHECKOUT_WLT_ALL_SLICES_CLOSURE.json"
REGISTRY_PATH = ROOT / "governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md"
STATUS_CONTEXT = "journeys/jrn-010/all-slices"


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def finalize_slice_registry(verified_commit: str, workflow_run_id: int) -> None:
    payload = json.loads(SLICE_PATH.read_text(encoding="utf-8"))
    slices = payload.get("slices", [])
    if payload.get("journeyId") != "JRN-010" or len(slices) != 18:
        raise RuntimeError("JRN-010 slice registry must contain exactly FS-01..FS-18")

    for index, item in enumerate(slices, start=1):
        expected = f"FS-{index:02d}"
        if item.get("id") != expected:
            raise RuntimeError(f"Unexpected slice order: {item.get('id')} != {expected}")
        if not item.get("evidence"):
            raise RuntimeError(f"{expected} has no implementation evidence")
        item["status"] = "IMPLEMENTED"

    payload["technicalClosure"] = "COMPLETE"
    payload["verifiedCommit"] = verified_commit
    payload["workflowRunId"] = workflow_run_id
    payload["statusContext"] = STATUS_CONTEXT
    payload["technicalOpenGaps"] = []
    write_json(SLICE_PATH, payload)


def finalize_evidence(verified_commit: str, workflow_run_id: int) -> None:
    payload = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
    if payload.get("journeyId") != "JRN-010":
        raise RuntimeError("Unexpected JRN-010 evidence file")

    payload["decision"] = "READY_FOR_REVIEW"
    payload["technicalClosure"] = "COMPLETE"
    payload["verifiedCommit"] = verified_commit
    payload["workflowRunId"] = workflow_run_id
    payload["statusContext"] = STATUS_CONTEXT
    payload["sameCommitStatus"] = "success"
    payload["verifiedAt"] = "2026-07-21"
    payload["openCodeGaps"] = []
    write_json(EVIDENCE_PATH, payload)


def finalize_central_registry(verified_commit: str, workflow_run_id: int) -> None:
    registry = REGISTRY_PATH.read_text(encoding="utf-8")

    index_pattern = re.compile(
        r"^\| JRN-010 \| Checkout وتسليم جلسة الدفع إلى WLT \| DSH \+ WLT \| [^|]+ \|$",
        re.MULTILINE,
    )
    registry, replacements = index_pattern.subn(
        "| JRN-010 | Checkout وتسليم جلسة الدفع إلى WLT | DSH + WLT | READY_FOR_REVIEW |",
        registry,
        count=1,
    )
    if replacements != 1:
        raise RuntimeError("Could not update the JRN-010 index row")

    heading = "### JRN-010 — Checkout وتسليم جلسة الدفع إلى WLT"
    surfaces = "الأسطح المرشحة: `app-client`, `control-panel` مع WLT."
    heading_pos = registry.find(heading)
    surfaces_pos = registry.find(surfaces, heading_pos)
    if heading_pos < 0 or surfaces_pos < 0:
        raise RuntimeError("JRN-010 registry section is incomplete")

    metadata = f"""tracking_status: READY_FOR_REVIEW
 decision: READY_FOR_REVIEW
 last_verified_commit: `{verified_commit}`
 workflow_run_id: `{workflow_run_id}`
 status_context: `{STATUS_CONTEXT}`
 technical_slices: `FS-01..FS-18 COMPLETE`
 owner_services: `DSH`, `WLT`
 required_surfaces: `app-client`, `control-panel`, `dsh-backend`, `dsh-postgresql`, `wlt-boundary`
 excluded_surfaces: `app-partner`, `app-captain`, `app-field`, `website` — ليست مالكة لحقيقة Checkout قبل إنشاء الطلب.
 applicable_evidence_scopes: `product`, `static`, `database`, `backend`, `contract`, `frontend`, `runtime`, `security`, `finance-boundary`, `accessibility`, `ci`, `release`
 open_code_gaps: `[]`
 independent_review_pending: Product Owner؛ QA/device/accessibility؛ Security/Finance؛ Release/Production.

""".replace("\n ", "\n")

    section_prefix_end = heading_pos + len(heading)
    registry = registry[:section_prefix_end] + "\n\n" + metadata + registry[surfaces_pos:]

    row_identity = "JRN-010 | FS-01..FS-18 technical implementation and same-commit verification"
    if row_identity not in registry:
        log_row = (
            f"| 2026-07-21 | JRN-010 | FS-01..FS-18 technical implementation and same-commit verification | "
            f"sambassam | `{verified_commit}` / workflow `{workflow_run_id}` | app-client, control-panel, "
            f"DSH backend/PostgreSQL, WLT boundary | READY_FOR_REVIEW | Independent Product, QA/device/"
            f"accessibility, Security/Finance and Release/Production approvals pending |\n"
        )
        marker = "## قالب إضافة رحلة أو تحديثها"
        marker_pos = registry.find(marker)
        if marker_pos < 0:
            raise RuntimeError("Registry execution-log insertion marker is missing")
        registry = registry[:marker_pos].rstrip() + "\n\n" + log_row + "\n" + registry[marker_pos:]

    REGISTRY_PATH.write_text(registry, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verified-commit", required=True)
    parser.add_argument("--workflow-run-id", required=True, type=int)
    args = parser.parse_args()

    if not re.fullmatch(r"[0-9a-f]{40}", args.verified_commit):
        raise SystemExit("--verified-commit must be a full lowercase commit SHA")
    if args.workflow_run_id <= 0:
        raise SystemExit("--workflow-run-id must be positive")

    finalize_slice_registry(args.verified_commit, args.workflow_run_id)
    finalize_evidence(args.verified_commit, args.workflow_run_id)
    finalize_central_registry(args.verified_commit, args.workflow_run_id)


if __name__ == "__main__":
    main()
