from pathlib import Path

PATH = Path("services/dsh/backend/internal/checkoutfinanceoutbox/worker_test.go")
text = PATH.read_text(encoding="utf-8")
old_server = '''	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusOK)
	}))'''
new_server = '''	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"action":"refund_requested","refund":{"id":"refund-outbox-test"}}`))
	}))'''
if new_server not in text:
    if old_server not in text:
        raise RuntimeError("cancel-for-order fake WLT server anchor not found")
    text = text.replace(old_server, new_server, 1)
old_path = '''	expectedPath := "/wlt/payment-sessions/" + paymentSessionID + "/cancel-for-order"
	if gotPath != expectedPath {
		t.Fatalf("expected path %q, got %q", expectedPath, gotPath)
	}
	if gotBody["orderId"] != orderID {'''
new_path = '''	expectedPath := "/wlt/order-cancellations"
	if gotPath != expectedPath {
		t.Fatalf("expected path %q, got %q", expectedPath, gotPath)
	}
	if gotBody["paymentSessionId"] != paymentSessionID {
		t.Fatalf("expected paymentSessionId=%q, got %v", paymentSessionID, gotBody["paymentSessionId"])
	}
	if gotBody["orderId"] != orderID {'''
if new_path not in text:
    if old_path not in text:
        raise RuntimeError("governed WLT path assertion anchor not found")
    text = text.replace(old_path, new_path, 1)
old_status = '''	status, _, _ := fetchOutboxRow(t, db, id)
	if status != "sent" {
		t.Fatalf("expected status 'sent' after successful delivery, got %q", status)
	}
}'''
new_status = '''	status, _, _ := fetchOutboxRow(t, db, id)
	if status != "sent" {
		t.Fatalf("expected status 'sent' after successful delivery, got %q", status)
	}
	var projectedStatus, projectedReference string
	if err := db.QueryRow(`
		SELECT financial_closure_status, COALESCE(financial_closure_reference, '')
		FROM dsh_orders WHERE id=$1::uuid`, orderID,
	).Scan(&projectedStatus, &projectedReference); err != nil {
		t.Fatal(err)
	}
	if projectedStatus != "refund_requested" || projectedReference != "refund-outbox-test" {
		t.Fatalf("unexpected financial projection: status=%q reference=%q", projectedStatus, projectedReference)
	}
}'''
# This block occurs once after the governed cancellation test and once earlier;
# replace the occurrence following the canonical request body assertions.
if new_status not in text:
    marker = 'if gotBody["reason"] != "store rejected order"'
    start = text.index(marker)
    block_start = text.index(old_status, start)
    text = text[:block_start] + text[block_start:].replace(old_status, new_status, 1)
PATH.write_text(text, encoding="utf-8")
Path("tools/scripts/patch-cancellation-outbox-contract-test.py").unlink(missing_ok=True)
print("Checkout financial outbox test now proves the canonical WLT cancellation endpoint and DSH refund projection.")
