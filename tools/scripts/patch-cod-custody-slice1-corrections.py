from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

stale_client_path = ROOT / "services/dsh/backend/internal/wlt/delivery_collection.go"
if stale_client_path.exists():
    stale_client_path.unlink()

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
text = text.replace(
    'NotifyDeliveryCollectionInput{OrderID: "order-1"}',
    'NotifyDeliveryCollectionInput{OrderID: "order-1", CollectorType: "captain", CollectorID: "captain-1", PartnerID: "partner-1", CheckoutIntentID: "intent-1"}',
)
for stale in [
    "NotifyDeliveryCompletedInput",
    "NotifyDeliveryCompleted(",
    "CaptainID:        \"captain-1\"",
]:
    if stale in text:
        raise RuntimeError(f"stale DSH WLT COD client test reference remains: {stale}")
client_test_path.write_text(text, encoding="utf-8")

client_path = ROOT / "services/dsh/backend/internal/wlt/client.go"
client = client_path.read_text(encoding="utf-8")
if client.count("type NotifyDeliveryCollectionInput struct") != 1:
    raise RuntimeError("DSH must expose exactly one COD collection input")
if client.count("func (c *Client) NotifyDeliveryCollection") != 1:
    raise RuntimeError("DSH must expose exactly one COD collection method")
if "/wlt/delivery-collections" in client:
    raise RuntimeError("obsolete delivery-collections route remains in DSH WLT client")
if 'c.baseURL+"/wlt/cod-records"' not in client:
    raise RuntimeError("governed WLT cod-records route is missing")

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

cod_test_path = ROOT / "services/wlt/backend/internal/cod/cod_db_test.go"
cod_test = cod_test_path.read_text(encoding="utf-8")
if '"wlt-api/internal/reference"' not in cod_test:
    anchor = '\t"wlt-api/internal/wallet"\n'
    if anchor not in cod_test:
        raise RuntimeError("COD DB test import anchor not found")
    cod_test = cod_test.replace(anchor, '\t"wlt-api/internal/reference"\n' + anchor, 1)

cod_sql = '''\tif _, err := db.Exec(`INSERT INTO wlt_payment_sessions(checkout_intent_id,client_id,store_id,payment_method,status,amount_minor_units,currency) VALUES($1,'client-cod-test','store-cod-test','cod','cod_pending',432100,'YER')`, checkoutIntentID); err != nil {
\t\tt.Fatal(err)
\t}'''
cod_governed = '''\tif _, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
\t\tCheckoutIntentID: checkoutIntentID,
\t\tTenantID:         "tenant-cod-test",
\t\tClientID:         "client-cod-test",
\t\tStoreID:          "store-cod-test",
\t\tPaymentMethod:    "cod",
\t\tAmountMinorUnits: 432100,
\t\tCurrency:         "YER",
\t\tCartSnapshotHash: "cod-custody-test-snapshot",
\t\tIdempotencyKey:   "cod-session-" + checkoutIntentID,
\t\tCorrelationID:    "cod-session-" + checkoutIntentID,
\t}); err != nil {
\t\tt.Fatalf("create governed COD payment session: %v", err)
\t}'''
wallet_sql = '''\tif _, err := db.Exec(`INSERT INTO wlt_payment_sessions(checkout_intent_id,client_id,store_id,payment_method,status,amount_minor_units,currency) VALUES($1,'client-wallet-test','store-wallet-test','wallet','authorized',1000,'YER')`, checkoutIntentID); err != nil {
\t\tt.Fatal(err)
\t}'''
wallet_governed = '''\tif _, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
\t\tCheckoutIntentID: checkoutIntentID,
\t\tTenantID:         "tenant-wallet-test",
\t\tClientID:         "client-wallet-test",
\t\tStoreID:          "store-wallet-test",
\t\tPaymentMethod:    "wallet",
\t\tAmountMinorUnits: 1000,
\t\tCurrency:         "YER",
\t\tCartSnapshotHash: "wallet-custody-test-snapshot",
\t\tIdempotencyKey:   "wallet-session-" + checkoutIntentID,
\t\tCorrelationID:    "wallet-session-" + checkoutIntentID,
\t}); err != nil {
\t\tt.Fatalf("create governed wallet payment session: %v", err)
\t}'''
if cod_sql in cod_test:
    cod_test = cod_test.replace(cod_sql, cod_governed, 1)
if wallet_sql in cod_test:
    cod_test = cod_test.replace(wallet_sql, wallet_governed, 1)
if "INSERT INTO wlt_payment_sessions(checkout_intent_id,client_id" in cod_test:
    raise RuntimeError("ungoverned payment-session fixture remains in COD DB tests")
cod_test_path.write_text(cod_test, encoding="utf-8")

print("Removed stale COD client, aligned client tests, imports, captain section, and governed WLT fixtures.")
