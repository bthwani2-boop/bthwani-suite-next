from pathlib import Path

PATH = Path("services/dsh/backend/internal/orders/cancellation_db_test.go")
text = PATH.read_text(encoding="utf-8")
old = '''	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,status,accepted_at)
		VALUES($1::uuid,$2,'accepted',NOW())
		RETURNING id::text`, order.ID, "captain-cancellation-test").Scan(&assignmentID); err != nil {'''
new = '''	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,accepted_at)
		VALUES($1::uuid,$2,$3,'accepted',NOW())
		RETURNING id::text`, order.ID, "captain-cancellation-test", "operator-cancellation-test").Scan(&assignmentID); err != nil {'''
if new not in text:
    if old not in text:
        raise RuntimeError("order cancellation assignment fixture anchor not found")
    text = text.replace(old, new, 1)
PATH.write_text(text, encoding="utf-8")
Path("tools/scripts/patch-cancellation-order-assignment-fixture.py").unlink(missing_ok=True)
print("Order cancellation DB fixture now records the assignment actor.")
