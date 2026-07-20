from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


server_path = Path("services/wlt/backend/internal/http/server.go")
server = server_path.read_text(encoding="utf-8")
server = replace_once(
    server,
    'mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/cancel-for-order", gate(serviceAuth(payment.HandleCancelSessionForOrder(db))))',
    'mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/cancel-for-order", gate(serviceAuth(payment.HandleGovernedSessionCancellation(db))))',
    "governed session cancellation route",
)
server = replace_once(
    server,
    'mux.HandleFunc("POST /wlt/refunds", gate(serviceAuth(refund.HandleCreateRefund(db))))',
    'mux.HandleFunc("POST /wlt/refunds", gate(serviceAuth(refund.HandleCreateRefundAtomic(db))))',
    "atomic refund route",
)
server_path.write_text(server, encoding="utf-8")

refund_path = Path("services/wlt/backend/internal/refund/refund.go")
refund = refund_path.read_text(encoding="utf-8")
start = refund.index("func CreateRefund(db *sql.DB, input CreateRefundInput) (*Refund, error) {")
end = refund.index("// getActiveRefundForSessionTx", start)
replacement = '''func CreateRefund(db *sql.DB, input CreateRefundInput) (*Refund, error) {
	created, _, err := CreateRefundAtomic(db, input)
	return created, err
}

'''
refund = refund[:start] + replacement + refund[end:]
refund_path.write_text(refund, encoding="utf-8")

test_path = Path("services/wlt/backend/internal/refund/refund_db_test.go")
test = test_path.read_text(encoding="utf-8")n