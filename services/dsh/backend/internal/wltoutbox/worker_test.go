package wltoutbox

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"dsh-api/internal/wlt"
)

func TestDeliverEventDeliveryCompletedUsesCanonicalDeliveryFee(t *testing.T) {
	tests := []struct {
		name           string
		deliveryFee    int64
		quoteStatus    int
		wantErr        bool
		wantCommission int32
	}{
		{
			name:           "free delivery finalizes COD without commission",
			deliveryFee:    0,
			quoteStatus:    http.StatusOK,
			wantCommission: 0,
		},
		{
			name:           "paid delivery finalizes COD and creates one commission",
			deliveryFee:    95000,
			quoteStatus:    http.StatusOK,
			wantCommission: 1,
		},
		{
			name:           "negative canonical fee fails closed",
			deliveryFee:    -1,
			quoteStatus:    http.StatusOK,
			wantErr:        true,
			wantCommission: 0,
		},
		{
			name:           "unavailable canonical quote fails closed",
			deliveryFee:    0,
			quoteStatus:    http.StatusNotFound,
			wantErr:        true,
			wantCommission: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var finalizeCalls, quoteCalls, commissionCalls atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch {
				case r.Method == http.MethodPost && r.URL.Path == "/wlt/cod-reservations/finalize":
					finalizeCalls.Add(1)
					w.Header().Set("Content-Type", "application/json")
					_, _ = fmt.Fprint(w, `{"codReservation":{"id":"reservation-1"}}`)
				case r.Method == http.MethodGet && r.URL.Path == "/wlt/internal/quotes/checkout/intent-1":
					quoteCalls.Add(1)
					if tt.quoteStatus != http.StatusOK {
						w.WriteHeader(tt.quoteStatus)
						return
					}
					w.Header().Set("Content-Type", "application/json")
					_, _ = fmt.Fprintf(w, `{"quote":{"id":"quote-1","deliveryFeeMinorUnits":%d}}`, tt.deliveryFee)
				case r.Method == http.MethodPost && r.URL.Path == "/wlt/commissions":
					commissionCalls.Add(1)
					w.WriteHeader(http.StatusCreated)
				default:
					http.NotFound(w, r)
				}
			}))
			defer server.Close()

			client := wlt.NewClient(server.URL, "service-token")
			event := Event{
				ID:                "event-1",
				EventType:         EventTypeDeliveryCompleted,
				OrderID:           "order-1",
				CollectorType:     CollectorCaptain,
				CollectorID:       "captain-1",
				CheckoutIntentID:  "intent-1",
				OperatorContextID: "operator-1",
			}

			_, err := deliverEvent(context.Background(), client, event)
			if (err != nil) != tt.wantErr {
				t.Fatalf("deliverEvent() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got := finalizeCalls.Load(); got != 1 {
				t.Fatalf("finalize calls = %d, want 1", got)
			}
			if got := quoteCalls.Load(); got != 1 {
				t.Fatalf("quote calls = %d, want 1", got)
			}
			if got := commissionCalls.Load(); got != tt.wantCommission {
				t.Fatalf("commission calls = %d, want %d", got, tt.wantCommission)
			}
		})
	}
}

func TestDeliverEventNonCaptainCollectorFinalizesCODWithoutCommission(t *testing.T) {
	var finalizeCalls, quoteCalls, commissionCalls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/wlt/cod-reservations/finalize":
			finalizeCalls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_, _ = fmt.Fprint(w, `{"codReservation":{"id":"reservation-1"}}`)
		case r.Method == http.MethodGet && r.URL.Path == "/wlt/internal/quotes/checkout/intent-1":
			quoteCalls.Add(1)
			http.NotFound(w, r)
		case r.Method == http.MethodPost && r.URL.Path == "/wlt/commissions":
			commissionCalls.Add(1)
			http.Error(w, "commission must not be requested for a non-captain collector", http.StatusInternalServerError)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "service-token")
	_, err := deliverEvent(context.Background(), client, Event{
		ID:                "event-1",
		EventType:         EventTypeDeliveryCompleted,
		OrderID:           "order-1",
		CollectorType:     CollectorPartnerStore,
		CollectorID:       "partner-1",
		CheckoutIntentID:  "intent-1",
		OperatorContextID: "operator-1",
	})
	if err != nil {
		t.Fatalf("deliverEvent() error = %v, want nil", err)
	}
	if got := finalizeCalls.Load(); got != 1 {
		t.Fatalf("finalize calls = %d, want 1", got)
	}
	if got := quoteCalls.Load(); got != 0 {
		t.Fatalf("quote calls = %d, want 0", got)
	}
	if got := commissionCalls.Load(); got != 0 {
		t.Fatalf("commission calls = %d, want 0", got)
	}
}

func TestDeliveryCommissionRequiredRejectsBlankCheckoutIntent(t *testing.T) {
	client := wlt.NewClient("http://wlt.invalid", "service-token")
	_, err := deliveryCommissionRequired(context.Background(), client, strings.TrimSpace(""))
	if err == nil {
		t.Fatal("deliveryCommissionRequired() returned nil error for blank checkout intent")
	}
}
