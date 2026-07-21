package http

import (
	"reflect"
	"testing"
)

func TestPartnerOrderAllowedActions(t *testing.T) {
	tests := []struct {
		name           string
		status         string
		mode           string
		handoffStatus  string
		openIssueCount int
		want           []string
	}{
		{name: "pending decision", status: "pending", mode: "bthwani_delivery", want: []string{"accept", "reject"}},
		{name: "accepted preparation", status: "store_accepted", mode: "bthwani_delivery", want: []string{"prepare", "revise_estimate", "report_issue"}},
		{name: "accepted with issue", status: "store_accepted", mode: "bthwani_delivery", openIssueCount: 1, want: []string{"prepare", "revise_estimate", "report_issue", "resolve_issue"}},
		{name: "preparing ready", status: "preparing", mode: "bthwani_delivery", want: []string{"ready", "revise_estimate", "report_issue"}},
		{name: "preparing issue blocks ready", status: "preparing", mode: "bthwani_delivery", openIssueCount: 2, want: []string{"revise_estimate", "report_issue", "resolve_issue"}},
		{name: "bthwani waits after ready", status: "ready_for_pickup", mode: "bthwani_delivery", want: []string{}},
		{name: "bthwani waits while captain assigned", status: "driver_assigned", mode: "bthwani_delivery", want: []string{}},
		{name: "bthwani partner confirms arrived captain", status: "driver_arrived_store", mode: "bthwani_delivery", handoffStatus: "awaiting_partner", want: []string{"handoff"}},
		{name: "bthwani waits for captain after partner confirmation", status: "driver_arrived_store", mode: "bthwani_delivery", handoffStatus: "partner_confirmed", want: []string{}},
		{name: "bthwani handoff completed", status: "picked_up", mode: "bthwani_delivery", handoffStatus: "completed", want: []string{}},
		{name: "partner delivery handoff", status: "ready_for_pickup", mode: "partner_delivery", want: []string{"handoff"}},
		{name: "pickup handoff", status: "ready_for_pickup", mode: "pickup", want: []string{"handoff"}},
		{name: "terminal read only", status: "delivered", mode: "bthwani_delivery", want: []string{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := partnerOrderAllowedActions(tt.status, tt.mode, tt.handoffStatus, tt.openIssueCount); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf(
					"partnerOrderAllowedActions(%q,%q,%q,%d)=%v want %v",
					t.status,
					t.mode,
					t.handoffStatus,
					t.openIssueCount,
					got,
					t.want,
				)
			}
		})
	}
}
