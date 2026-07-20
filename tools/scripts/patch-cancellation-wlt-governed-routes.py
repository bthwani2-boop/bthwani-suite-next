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
refund = refund.replace('\n\t"wlt-api/internal/reference"', "", 1)
comment_start = refund.index("// CreateRefund creates a refund")
function_start = refund.index("func CreateRefund(db *sql.DB, input CreateRefundInput) (*Refund, error) {", comment_start)
function_end = refund.index("// getActiveRefundForSessionTx", function_start)
replacement = '''// CreateRefund preserves the internal compatibility signature while delegating
// every creation to the atomic, ownership-safe implementation. This keeps all
// refund entry points aligned on required reason, session ownership, amount,
// currency, and idempotency rules.
func CreateRefund(db *sql.DB, input CreateRefundInput) (*Refund, error) {
	created, _, err := CreateRefundAtomic(db, input)
	return created, err
}

'''
refund = refund[:comment_start] + replacement + refund[function_end:]
refund_path.write_text(refund, encoding="utf-8")

test_path = Path("services/wlt/backend/internal/refund/refund_db_test.go")
test = test_path.read_text(encoding="utf-8")
old = '''	r, err := CreateRefund(db, CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          orderID,
		ClientID:         "client-test",
	})'''
new = '''	r, err := CreateRefund(db, CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          orderID,
		ClientID:         "client-test",
		Reason:           "cancelled COD order",
	})'''
if old not in test and new not in test:
    raise RuntimeError("COD refund reason fixture anchor not found")
test = test.replace(old, new, 1)
test_path.write_text(test, encoding="utf-8")

Path("tools/scripts/patch-cancellation-wlt-governed-routes.py").unlink(missing_ok=True)
print("All WLT cancellation and refund routes now use governed atomic ownership-safe logic.")
