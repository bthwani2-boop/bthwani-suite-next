#!/usr/bin/env python3
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Concurrent journey executions share sambassam. Restore only absent sovereign
# dependencies. The obsolete governed DSH file is restored temporarily because
# the legacy atomic patch references it, then removed after its remaining
# contract/read-model patches have been applied.
RESTORE_SOURCES: dict[str, str] = {
    "services/dsh/backend/internal/http/subscription_lifecycle_governed.go": "ac0c27fc97f080262122a5090779f8844a40ccf1",
    "services/dsh/backend/internal/wlt/subscription_lifecycle.go": "f04df3ebde3f07a45659ed0a8db9a19d8364e5fe",
    "services/dsh/backend/internal/wlt/commercial.go": "5fc129e493802985b9c05b04aabe9a2925eb4f52",
    "services/wlt/backend/internal/commercial/subscription_lifecycle.go": "b7afc7c0db913e76549a8498d7429302f3a517e4",
    "services/wlt/database/migrations/wlt-095_jrn027_subscription_lifecycle.sql": "928c5f0f96b777723475e05af9bd8975a5a74344",
    "services/dsh/database/migrations/dsh-103_jrn_027_subscription_lifecycle.sql": "619c1b1c3c0b9f5e77b0f4d7efac3639c19a7813",
    "governance/product/contracts/jrn-027-subscriptions-commercial-benefits.product-truth.json": "a569e7a630cf581dcf51d5b7bbdd0120fde8c9e7",
}


def restore_missing(path: str, commit: str) -> None:
    target = ROOT / path
    if target.exists():
        return
    content = subprocess.check_output(["git", "show", f"{commit}:{path}"], cwd=ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    print(f"restored missing JRN-027 file: {path} from {commit}")


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    content = target.read_text(encoding="utf-8")
    if new in content:
        return
    if old not in content:
        raise SystemExit(f"JRN-027 convergence anchor missing: {path}")
    target.write_text(content.replace(old, new, 1), encoding="utf-8")


for relative_path, source_commit in RESTORE_SOURCES.items():
    restore_missing(relative_path, source_commit)

subprocess.run(
    ["python3", "tools/scripts/close-jrn-027-remaining-slices.py"],
    cwd=ROOT,
    check=True,
)

# GetSubscriptionPlan returns a value. The canonical lifecycle passes a pointer
# to initialization helpers without weakening the marketing package API.
replace_once(
    "tools/templates/jrn027_subscription_purchases.go",
    "\treturn plan, product, nil\n",
    "\treturn &plan, product, nil\n",
)

# Converge on the existing subscription_purchases.go as the sole DSH lifecycle
# owner. This removes the duplicate implementation identified by integrated
# HTTP compilation while preserving all JRN-027 lifecycle behavior.
shutil.copyfile(
    ROOT / "tools/templates/jrn027_subscription_purchases.go",
    ROOT / "services/dsh/backend/internal/http/subscription_purchases.go",
)
obsolete = ROOT / "services/dsh/backend/internal/http/subscription_lifecycle_governed.go"
if obsolete.exists():
    obsolete.unlink()

replace_once(
    "services/dsh/backend/internal/http/server.go",
    '''\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/purchase", protected.handleCreateGovernedSubscriptionPurchase)\n\tmux.HandleFunc("GET /dsh/client/marketing/subscriptions/purchases/{purchaseId}", protected.handleGetGovernedSubscriptionPurchase)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{purchaseId}/activate", protected.handleActivateGovernedSubscriptionPurchase)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{subscriptionId}/renew", protected.handleRenewGovernedSubscription)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{subscriptionId}/cancel", protected.handleCancelGovernedSubscription)''',
    '''\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/purchase", protected.handleCreateSubscriptionPurchase)\n\tmux.HandleFunc("GET /dsh/client/marketing/subscriptions/purchases/{purchaseId}", protected.handleGetSubscriptionPurchase)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{purchaseId}/activate", protected.handleActivateSubscriptionPurchase)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{subscriptionId}/renew", protected.handleRenewSubscriptionPurchase)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{subscriptionId}/cancel", protected.handleCancelSubscriptionPurchase)''',
)

replace_once(
    "tools/guards/jrn027-closure-gate.py",
    '''    "DSH handlers": ("services/dsh/backend/internal/http/subscription_lifecycle_governed.go", "handleCancelGovernedSubscription"),''',
    '''    "DSH handlers": ("services/dsh/backend/internal/http/subscription_purchases.go", "handleCancelSubscriptionPurchase"),''',
)

# exactOptionalPropertyTypes requires an optional property that may be supplied
# as undefined to state that explicitly. Import the journey controller and
# contracts directly so the focused gate does not pull unrelated in-flight
# marketing surfaces into JRN-027 verification.
replace_once(
    "services/dsh/frontend/app-client/account/BenefitsHubScreen.tsx",
    "  readonly helper?: string;\n",
    "  readonly helper?: string | undefined;\n",
)
replace_once(
    "services/dsh/frontend/app-client/account/BenefitsHubScreen.tsx",
    '''import {\n  useSubscriptionLifecycleController,\n  type ClientBenefitsPayload,\n  type SubscriptionPlanRecord,\n} from "../../shared/marketing";''',
    '''import { useSubscriptionLifecycleController } from "../../shared/marketing/use-subscription-lifecycle-controller";\nimport type {\n  ClientBenefitsPayload,\n  SubscriptionPlanRecord,\n} from "../../shared/marketing/loyalty-subscriptions.types";''',
)

print("JRN-027 DSH lifecycle and focused client type surface converged")
