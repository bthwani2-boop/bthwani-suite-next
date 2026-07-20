from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

client_test_path = ROOT / "services/dsh/backend/internal/wlt/client_test.go"
text = client_test_path.read_text(encoding="utf-8")
text = text.replace("TestNotifyDeliveryCompletedSendsServiceHeaders", "TestNotifyDeliveryCollectionSendsGovernedCollectorHeaders")
text = text.replace("TestNotifyDeliveryCompletedNotConfigured", "TestNotifyDeliveryCollectionNotConfigured")
text = text.replace("NotifyDeliveryCompletedInput", "NotifyDeliveryCollectionInput")
text = text.replace("NotifyDeliveryCompleted", "NotifyDeliveryCollection")
text = text.replace(
    '''\t\tif input.OrderID != "order-1" || input.CheckoutIntentID != "intent-1" {
\t\t\tt.Fatalf("unexpected input: %+v", input)
\t\t}''',
    '''\t\tif input.OrderID != "order-1" || input.CheckoutIntentID != "intent-1" || input.CollectorType != "captain" || input.CollectorID != "captain-1" {
\t\t\tt.Fatalf("unexpected input: %+v", input)
\t\t}''',
)
text = text.replace(
    '''\t\tOrderID:          "order-1",
\t\tCaptainID:        "captain-1",
\t\tPartnerID:        "partner-1",''',
    '''\t\tOrderID:          "order-1",
\t\tCollectorType:    "captain",
\t\tCollectorID:      "captain-1",
\t\tPartnerID:        "partner-1",''',
)
for stale in ["NotifyDeliveryCompletedInput", "NotifyDeliveryCompleted(", "CaptainID:        \"captain-1\""]:
    if stale in text:
        raise RuntimeError(f"stale DSH WLT COD client test reference remains: {stale}")
client_test_path.write_text(text, encoding="utf-8")

cod_path = ROOT / "services/wlt/backend/internal/cod/cod.go"
cod = cod_path.read_text(encoding="utf-8")
if '"strings"' not in cod:
    anchor = '\t"net/http"\n'
    if anchor not in cod:
        raise RuntimeError("WLT COD import anchor not found")
    cod = cod.replace(anchor, anchor + '\t"strings"\n', 1)
cod_path.write_text(cod, encoding="utf-8")

captain_path = ROOT / "services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshCaptainBridge.tsx"
captain = captain_path.read_text(encoding="utf-8")
captain = captain.replace("  section = 'eligibility',", "  section = 'cod-liability',", 1)
if "section = 'eligibility'" in captain:
    raise RuntimeError("captain finance still defaults to removed eligibility section")
captain_path.write_text(captain, encoding="utf-8")

print("Aligned DSH client tests, WLT COD imports, and captain COD default section.")
