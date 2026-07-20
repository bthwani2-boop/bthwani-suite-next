from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

runtime = ROOT / 'services/dsh/backend/internal/orders/runtime.go'
text = runtime.read_text(encoding='utf-8')
old = '''\tcase "operator", "system":
\t\treturn []OrderStatus{
\t\t\tStatusPending,
\t\t\tStatusStoreAccepted,
\t\t\tStatusPreparing,
\t\t\tStatusReadyForPickup,
\t\t\tStatusDriverAssigned,
\t\t\tStatusArrivedStore,
\t\t}
'''
new = '''\tcase "operator":
\t\treturn []OrderStatus{
\t\t\tStatusPending,
\t\t\tStatusStoreAccepted,
\t\t\tStatusPreparing,
\t\t\tStatusReadyForPickup,
\t\t\tStatusDriverAssigned,
\t\t\tStatusArrivedStore,
\t\t\tStatusReturnedStore,
\t\t}
\tcase "system":
\t\treturn []OrderStatus{
\t\t\tStatusPending,
\t\t\tStatusStoreAccepted,
\t\t\tStatusPreparing,
\t\t\tStatusReadyForPickup,
\t\t\tStatusDriverAssigned,
\t\t\tStatusArrivedStore,
\t\t}
'''
if new not in text:
    if old not in text:
        raise RuntimeError('cancellableStatuses operator/system anchor not found')
    text = text.replace(old, new, 1)
runtime.write_text(text, encoding='utf-8')

test_path = ROOT / 'services/dsh/backend/internal/orders/returned_cancellation_db_test.go'
test = test_path.read_text(encoding='utf-8')
if 'TestReturnedOrderCancellationRemainsForbiddenForClientAndPartnerDBIntegration' not in test:
    test += r'''

func TestReturnedOrderCancellationRemainsForbiddenForClientAndPartnerDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	cases := []struct {
		role       string
		reasonCode string
	}{
		{role: "client", reasonCode: "other"},
		{role: "partner", reasonCode: "other"},
	}
	for _, tc := range cases {
		t.Run(tc.role, func(t *testing.T) {
			order, _ := seedOrderFixture(t, db, string(StatusReturnedStore))
			_, err := CancelOrder(db, CancellationInput{
				OrderID:       order.ID,
				ActorID:       tc.role + "-returned-order-test",
				ActorRole:     tc.role,
				ReasonCode:    tc.reasonCode,
				ReasonNote:    "returned orders require an operator financial decision",
				CorrelationID: fmt.Sprintf("returned-order-forbidden-%s-%d", tc.role, time.Now().UnixNano()),
			})
			if !errors.Is(err, ErrConflict) {
				t.Fatalf("expected returned order cancellation to remain forbidden for %s, got %v", tc.role, err)
			}
			var cancellationCount int
			if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, order.ID).Scan(&cancellationCount); err != nil {
				t.Fatal(err)
			}
			if cancellationCount != 0 {
				t.Fatalf("forbidden %s cancellation created %d records", tc.role, cancellationCount)
			}
		})
	}
}
'''
    test = test.replace('import (\n\t"fmt"', 'import (\n\t"errors"\n\t"fmt"', 1)
test_path.write_text(test, encoding='utf-8')

print('Enabled returned-order cancellation for operators only and added role-boundary proof.')
