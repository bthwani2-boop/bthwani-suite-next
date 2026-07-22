#!/usr/bin/env python3
from pathlib import Path
import json

root = Path(__file__).resolve().parents[2]
checks = {
    "product truth": ("governance/product/contracts/jrn-027-subscriptions-commercial-benefits.product-truth.json", "JRN_027_SUBSCRIPTIONS_COMMERCIAL_BENEFITS"),
    "DSH migration": ("services/dsh/database/migrations/dsh-103_jrn_027_subscription_lifecycle.sql", "dsh_subscription_lifecycle_events"),
    "WLT migration": ("services/wlt/database/migrations/wlt-033_jrn027_subscription_lifecycle.sql", "wlt_subscription_compensations"),
    "DSH handlers": ("services/dsh/backend/internal/http/subscription_purchases.go", "handleCancelSubscriptionPurchase"),
    "WLT lifecycle": ("services/wlt/backend/internal/commercial/subscription_lifecycle.go", "RenewSubscriptionLifecycleGoverned"),
    "shared controller": ("services/dsh/frontend/shared/marketing/use-subscription-lifecycle-controller.tsx", "useSubscriptionLifecycleController"),
    "client screen": ("services/dsh/frontend/app-client/account/BenefitsHubScreen.tsx", "شراء عبر المحفظة"),
    "DSH contract": ("services/dsh/contracts/dsh.marketing-commercial.openapi.yaml", "cancelDshClientSubscription"),
    "WLT contract": ("services/wlt/contracts/wlt.commercial.openapi.yaml", "expireDueWltCommercialSubscriptions"),
}
for label, (path, marker) in checks.items():
    text = (root / path).read_text(encoding="utf-8")
    if marker not in text:
        raise SystemExit(f"JRN-027 gate failed: {label}: {marker}")
truth = json.loads((root / checks["product truth"][0]).read_text(encoding="utf-8"))
if truth.get("owners", {}).get("productAcceptanceDecision") != "PENDING":
    raise SystemExit("JRN-027 gate failed: engineering must not self-approve product acceptance")
print("JRN-027 static closure gate passed")
