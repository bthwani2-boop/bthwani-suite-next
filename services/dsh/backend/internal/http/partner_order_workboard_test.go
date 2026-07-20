package http

import (
	"reflect"
	"testing"
)

func TestPartnerOrderAllowedActions(t *testing.T) {
	tests := []struct {
		name   string
		status string
		mode   string
		want   []string
	}{
		{name: "pending decision", status: "pending", mode: "bthwani_delivery", want: []string{"accept", "reject"}},
		{name: "accepted preparation", status: "store_accepted", mode: "bthwani_delivery", want: []string{"prepare"}},
		{name: "preparing ready", status: "preparing", mode: "bthwani_delivery", want: []string{"ready"}},
		{name: "bthwani waits after ready", status: "ready_for_pickup", mode: "bthwani_delivery", want: []string{}},
		{name: "partner delivery handoff", status: "ready_for_pickup", mode: "partner_delivery", want: []string{"handoff"}},
		{name: "pickup handoff", status: "ready_for_pickup", mode: "pickup", want: []string{"handoff"}},
		{name: "terminal read only", status: "delivered", mode: "bthwani_delivery", want: []string{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := partnerOrderAllowedActions(tt.status, tt.mode); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("partnerOrderAllowedActions(%q,%q)=%v want %v", tt.status, tt.mode, got, tt.want)
			}
		})
	}
}
