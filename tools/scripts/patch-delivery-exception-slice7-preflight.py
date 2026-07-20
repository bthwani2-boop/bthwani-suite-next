from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
patch_path = ROOT / "tools/scripts/patch-delivery-exception-slice7.py"
patch = patch_path.read_text(encoding="utf-8")

old_anchor = '\tmux.HandleFunc("POST /dsh/partner/orders/{orderId}/delivery/exception", protected.handlePartnerDeliveryException)\n'
new_anchor = '\tmux.HandleFunc("POST /dsh/partner/orders/{orderId}/partner-delivery/exception", protected.handlePartnerDeliveryException)\n'
if old_anchor not in patch and new_anchor not in patch:
    raise RuntimeError("current partner-delivery exception route anchor not found")
patch = patch.replace(old_anchor, new_anchor)
patch = patch.replace(
    'order, _, ok := s.partnerOrder(w, r, r.PathValue("orderId"))',
    '_, order, ok := s.partnerOrder(w, r)',
)
patch = patch.replace(
    'order, actor, ok := s.partnerOrder(w, r, r.PathValue("orderId"))',
    'actor, order, ok := s.partnerOrder(w, r)',
)
if 's.partnerOrder(w, r, r.PathValue("orderId"))' in patch:
    raise RuntimeError("stale partnerOrder signature remains in slice7 patch")

# The old test patch matched formatting rather than behavior. Replace the test
# directly using semantic start/end boundaries, then disable only that obsolete
# patch function in the main script.
test_path = ROOT / "services/dsh/backend/internal/dispatch/delivery_return_db_test.go"
test = test_path.read_text(encoding="utf-8")
if "CaptainArriveReturnToStore(db, assignmentID, captainID)" not in test:
    start_token = "\treturned, err := CompleteReturnToStore(db, assignmentID, captainID)"
    end_token = "\tif err != nil || len(inbox) != 0 {\n\t\tt.Fatalf(\"completed return remained active: %+v err=%v\", inbox, err)\n\t}\n"
    start = test.find(start_token)
    end_start = test.find(end_token, start)
    if start == -1 or end_start == -1:
        raise RuntimeError("current return completion test boundaries not found")
    end = end_start + len(end_token)
    replacement = """\tarrived, err := CaptainArriveReturnToStore(db, assignmentID, captainID)
\tif err != nil {
\t\tt.Fatalf("captain arrive return: %v", err)
\t}
\tif arrived.ReturnArrivedAt == nil || arrived.ReturnedAt != nil {
\t\tt.Fatalf("captain arrival must not complete store receipt: %+v", arrived)
\t}
\tif err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil {
\t\tt.Fatal(err)
\t}
\tif orderStatus != "return_arrived_store" || deliveryStatus != "return_arrived_store" || assignmentStatus != "accepted" {
\t\tt.Fatalf("arrival handshake mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus)
\t}
\treturned, err := AcceptReturnToStoreByPartner(db, orderID, "partner-return-receipt-test")
\tif err != nil {
\t\tt.Fatalf("partner accept return: %v", err)
\t}
\tif returned.ReturnedAt == nil || returned.ReturnAcceptedByActorID == nil {
\t\tt.Fatalf("partner receipt was not recorded: %+v", returned)
\t}
\tif err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil {
\t\tt.Fatal(err)
\t}
\tif orderStatus != "returned_to_store" || deliveryStatus != "returned_to_store" || assignmentStatus != "completed" {
\t\tt.Fatalf("partner receipt completion mismatch: %s %s %s", orderStatus, deliveryStatus, assignmentStatus)
\t}
\tif _, err := GetCaptainOpenDeliveryException(db, assignmentID, captainID); !errors.Is(err, ErrNotFound) {
\t\tt.Fatalf("accepted return must leave captain exception view, got %v", err)
\t}
\tinbox, err := ListCaptainAssignments(db, captainID, 50)
\tif err != nil || len(inbox) != 0 {
\t\tt.Fatalf("partner-accepted return remained active: %+v err=%v", inbox, err)
\t}
"""
    test = test[:start] + replacement + test[end:]
    test_path.write_text(test, encoding="utf-8")

function_start = patch.index("def patch_db_test() -> None:")
function_end = patch.index("\ndef main() -> None:", function_start)
patch = patch[:function_start] + "def patch_db_test() -> None:\n    return\n" + patch[function_end:]
patch_path.write_text(patch, encoding="utf-8")
print("Aligned slice7 patch with current routes, ownership boundary, and return test behavior.")
