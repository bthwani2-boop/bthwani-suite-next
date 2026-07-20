from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "services/dsh/backend/internal/wlt/client_test.go"
text = path.read_text(encoding="utf-8")
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
path.write_text(text, encoding="utf-8")
print("Aligned DSH WLT COD client tests with collector identity contract.")
