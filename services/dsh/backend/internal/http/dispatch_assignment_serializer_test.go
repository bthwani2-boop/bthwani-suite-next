package http

import (
	"encoding/json"
	"testing"
	"time"

	"dsh-api/internal/dispatch"
)

func TestMarshalDispatchAssignmentSourceXOR(t *testing.T) {
	now := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	cases := []struct {
		name                 string
		assignment           dispatch.Assignment
		wantOrderID          any
		wantSpecialRequestID any
		wantRequestType      any
		wantDeliveryOrderID  any
		wantDeliverySpecial  any
	}{
		{
			name: "order source",
			assignment: dispatch.Assignment{
				ID:                 "assignment-order",
				OrderID:            "order-1",
				CaptainID:          "captain-1",
				AssignedBy:         "operator-1",
				Status:             dispatch.AssignmentOffered,
				ResponseDeadlineAt: now,
				CreatedAt:          now,
				UpdatedAt:          now,
				Version:            1,
				Delivery: dispatch.Delivery{
					ID:           "delivery-order",
					AssignmentID: "assignment-order",
					OrderID:      "order-1",
					CaptainID:    "captain-1",
					Status:       dispatch.DeliveryAssigned,
					CreatedAt:    now,
					UpdatedAt:    now,
				},
			},
			wantOrderID:          "order-1",
			wantSpecialRequestID: nil,
			wantRequestType:      "",
			wantDeliveryOrderID:  "order-1",
			wantDeliverySpecial:  nil,
		},
		{
			name: "special request source",
			assignment: dispatch.Assignment{
				ID:                 "assignment-special",
				SpecialRequestID:   "request-1",
				SpecialRequestType: "SHEIN_ASSISTED_PURCHASE",
				CaptainID:          "captain-1",
				AssignedBy:         "operator-1",
				Status:             dispatch.AssignmentOffered,
				ResponseDeadlineAt: now,
				CreatedAt:          now,
				UpdatedAt:          now,
				Version:            1,
				Delivery: dispatch.Delivery{
					ID:               "delivery-special",
					AssignmentID:     "assignment-special",
					SpecialRequestID: "request-1",
					CaptainID:        "captain-1",
					Status:           dispatch.DeliveryAssigned,
					CreatedAt:        now,
					UpdatedAt:        now,
				},
			},
			wantOrderID:          nil,
			wantSpecialRequestID: "request-1",
			wantRequestType:      "SHEIN_ASSISTED_PURCHASE",
			wantDeliveryOrderID:  nil,
			wantDeliverySpecial:  "request-1",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			encoded, err := json.Marshal(marshalDispatchAssignment(tc.assignment))
			if err != nil {
				t.Fatal(err)
			}

			var payload map[string]any
			if err := json.Unmarshal(encoded, &payload); err != nil {
				t.Fatal(err)
			}
			assertDispatchWireValue(t, payload, "orderId", tc.wantOrderID)
			assertDispatchWireValue(t, payload, "specialRequestId", tc.wantSpecialRequestID)
			assertDispatchWireValue(t, payload, "requestType", tc.wantRequestType)

			delivery, ok := payload["delivery"].(map[string]any)
			if !ok {
				t.Fatalf("delivery = %T, want object", payload["delivery"])
			}
			assertDispatchWireValue(t, delivery, "orderId", tc.wantDeliveryOrderID)
			assertDispatchWireValue(t, delivery, "specialRequestId", tc.wantDeliverySpecial)
		})
	}
}

func assertDispatchWireValue(t *testing.T, payload map[string]any, key string, want any) {
	t.Helper()
	got, ok := payload[key]
	if !ok {
		t.Fatalf("wire payload is missing %q", key)
	}
	if got != want {
		t.Fatalf("wire payload %q = %#v, want %#v", key, got, want)
	}
}
