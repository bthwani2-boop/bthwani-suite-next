from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


def patch_schema_block(text: str, marker: str, next_marker: str) -> str:
    start = text.index(marker)
    end = text.index(next_marker, start)
    block = text[start:end]
    if "        - reason\n      properties:" not in block:
        block = block.replace(
            "        - clientId\n      properties:",
            "        - clientId\n        - reason\n      properties:",
            1,
        )
    block = block.replace(
        "        reason:\n          type: string\n",
        "        reason:\n          type: string\n          minLength: 1\n          maxLength: 1000\n",
        1,
    )
    return text[:start] + block + text[end:]


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

contract_path = Path("services/wlt/contracts/wlt.openapi.yaml")
contract = contract_path.read_text(encoding="utf-8")
contract = patch_schema_block(
    contract,
    "    WltCreateRefundRequest:\n",
    "    WltGovernedOrderCancellationRequest:\n",
)
contract = patch_schema_block(
    contract,
    "    WltCancelPaymentSessionForOrderRequest:\n",
    "    WltCancelPaymentSessionForOrderResponse:\n",
)
refund_response_start = contract.index("    WltRefundResponse:\n")
refund_response_end = contract.index("    WltRefundListResponse:\n", refund_response_start)
refund_response = contract[refund_response_start:refund_response_end]
if "        - replayed\n" not in refund_response:
    refund_response = refund_response.replace(
        "      required:\n        - refund\n",
        "      required:\n        - refund\n        - replayed\n",
        1,
    )
    refund_response = refund_response.replace(
        '        refund:\n          $ref: "#/components/schemas/WltRefund"\n',
        '        refund:\n          $ref: "#/components/schemas/WltRefund"\n        replayed:\n          type: boolean\n          description: True when the existing active refund was returned idempotently.\n',
        1,
    )
contract = contract[:refund_response_start] + refund_response + contract[refund_response_end:]
post_response = '''      responses:
        "201":
          description: Refund created.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WltRefundResponse"
'''
post_response_governed = '''      responses:
        "200":
          description: Existing active refund returned for an idempotent replay.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WltRefundResponse"
        "201":
          description: Refund created.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WltRefundResponse"
'''
if post_response_governed not in contract:
    contract = replace_once(contract, post_response, post_response_governed, "refund replay response")
contract_path.write_text(contract, encoding="utf-8")

Path("tools/scripts/patch-cancellation-wlt-governed-routes.py").unlink(missing_ok=True)
print("WLT cancellation/refund runtime and contract now share governed atomic ownership-safe logic.")
