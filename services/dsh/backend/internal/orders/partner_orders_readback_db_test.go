package orders

import "testing"

func TestListPartnerOrdersWithoutStatusReturnsDeliveredDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, _ := seedOrderFixture(t, db, string(StatusDelivered))

	orders, err := ListPartnerOrders(db, order.StoreID, "", 50)
	if err != nil {
		t.Fatalf("ListPartnerOrders without status failed: %v", err)
	}

	foundDelivered := false
	for _, candidate := range orders {
		if candidate.ID == order.ID {
			foundDelivered = candidate.Status == StatusDelivered
			break
		}
	}
	if !foundDelivered {
		t.Fatalf("unfiltered partner orders did not include delivered order %s", order.ID)
	}

	pendingOrders, err := ListPartnerOrders(db, order.StoreID, string(StatusPending), 50)
	if err != nil {
		t.Fatalf("ListPartnerOrders pending filter failed: %v", err)
	}
	for _, candidate := range pendingOrders {
		if candidate.ID == order.ID {
			t.Fatalf("pending filter returned delivered order %s", order.ID)
		}
	}
}
