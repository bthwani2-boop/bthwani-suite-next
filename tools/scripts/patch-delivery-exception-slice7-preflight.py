from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "tools/scripts/patch-delivery-exception-slice7.py"
text = path.read_text(encoding="utf-8")

old_anchor = '\tmux.HandleFunc("POST /dsh/partner/orders/{orderId}/delivery/exception", protected.handlePartnerDeliveryException)\n'
new_anchor = '\tmux.HandleFunc("POST /dsh/partner/orders/{orderId}/partner-delivery/exception", protected.handlePartnerDeliveryException)\n'
if old_anchor not in text and new_anchor not in text:
    raise RuntimeError("current partner-delivery exception route anchor not found")
text = text.replace(old_anchor, new_anchor)

text = text.replace(
    'order, _, ok := s.partnerOrder(w, r, r.PathValue("orderId"))',
    '_, order, ok := s.partnerOrder(w, r)',
)
text = text.replace(
    'order, actor, ok := s.partnerOrder(w, r, r.PathValue("orderId"))',
    'actor, order, ok := s.partnerOrder(w, r)',
)
if 's.partnerOrder(w, r, r.PathValue("orderId"))' in text:
    raise RuntimeError("stale partnerOrder signature remains in slice7 patch")

# Replace the old formatting-sensitive DB-test patch with semantic boundaries.
function_start = text.index("def patch_db_test() -> None:")
function_end = text.index("\ndef main() -> None:", function_start)
replacement = """def patch_db_test() -> None:
    path = \"services/dsh/backend/internal/dispatch/delivery_return_db_test.go\"
    source = read(path)
    if \"CaptainArriveReturnToStore(db, assignmentID, captainID)\" in source:
        return
    start = source.find(\"\\treturned, err := CompleteReturnToStore(db, assignmentID, captainID)\")
    if start == -1:
        raise RuntimeError(\"return completion start anchor not found\")
    end_marker = '''\tinbox, err := ListCaptainAssignments(db, captainID, 50)
\tif err != nil || len(inbox) != 0 {
\t\tt.Fatalf(\"completed return remained active: %+v err=%v\", inbox, err)
\t}
'''
    marker_index = source.find(end_marker, start)
    if marker_index == -1:
        raise RuntimeError(\"return completion end anchor not found\")
    end = marker_index + len(end_marker)
    new = '''\tarrived, err := CaptainArriveReturnToStore(db, assignmentID, captainID)
\tif err != nil {
\t\tt.Fatalf(\"captain arrive return: %v\", err)
\t}
\tif arrived.ReturnArrivedAt == nil || arrived.ReturnedAt != nil {
\t\tt.Fatalf(\"captain arrival must not complete store receipt: %+v\", arrived)
\t}
\tif err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil {
\t\tt.Fatal(err)
\t}
\tif orderStatus != \"return_arrived_store\" || deliveryStatus != \"return_arrived_store\" || assignmentStatus != \"accepted\" {
\t\tt.Fatalf(\"arrival handshake mismatch: %s %s %s\", orderStatus, deliveryStatus, assignmentStatus)
\t}
\treturned, err := AcceptReturnToStoreByPartner(db, orderID, \"partner-return-receipt-test\")
\tif err != nil {
\t\tt.Fatalf(\"partner accept return: %v\", err)
\t}
\tif returned.ReturnedAt == nil || returned.ReturnAcceptedByActorID == nil {
\t\tt.Fatalf(\"partner receipt was not recorded: %+v\", returned)
\t}
\tif err := db.QueryRow(`SELECT o.status,d.status,a.status FROM dsh_orders o JOIN dsh_assignments a ON a.order_id=o.id JOIN dsh_deliveries d ON d.assignment_id=a.id WHERE a.id=$1::uuid`, assignmentID).Scan(&orderStatus, &deliveryStatus, &assignmentStatus); err != nil {
\t\tt.Fatal(err)
\t}
\tif orderStatus != \"returned_to_store\" || deliveryStatus != \"returned_to_store\" || assignmentStatus != \"completed\" {
\t\tt.Fatalf(\"partner receipt completion mismatch: %s %s %s\", orderStatus, deliveryStatus, assignmentStatus)
\t}
\tif _, err := GetCaptainOpenDeliveryException(db, assignmentID, captainID); !errors.Is(err, ErrNotFound) {
\t\tt.Fatalf(\"accepted return must leave captain exception view, got %v\", err)
\t}
\tinbox, err := ListCaptainAssignments(db, captainID, 50)
\tif err != nil || len(inbox) != 0 {
\t\tt.Fatalf(\"partner-accepted return remained active: %+v err=%v\", inbox, err)
\t}
'''
    source = source[:start] + new + source[end:]
    write(path, source)
"""
text = text[:function_start] + replacement + text[function_end:]

path.write_text(text, encoding="utf-8")
print("Aligned slice7 patch with current routes, ownership boundary, and DB-test layout.")
