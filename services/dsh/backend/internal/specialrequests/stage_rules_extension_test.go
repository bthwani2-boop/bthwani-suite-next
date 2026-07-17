package specialrequests

import "testing"

func TestCanonicalSpecialRequestStagesAreKnownToService(t *testing.T) {
	tests := []struct {
		name   string
		rules  map[string]stageRule
		stages []string
	}{
		{
			name:  "shein",
			rules: sheinStageRules,
			stages: []string{
				"intake_review", "quote_pending", "customer_approval", "batch_pending",
				"purchased", "inbound", "sorting", "ready_for_delivery",
				"captain_assignment", "out_for_delivery", "proof_of_delivery",
				"delivered", "exception", "cancelled", "rejected",
			},
		},
		{
			name:  "awnak",
			rules: awnakStageRules,
			stages: []string{
				"intake", "quote_review", "customer_approval", "dispatch_pending",
				"assigned", "captain_enroute_to_pickup", "arrived_at_pickup",
				"item_received", "in_progress", "arrived_at_dropoff", "proof_review",
				"completed", "escalated", "cancelled",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lastOrder := -1
			for _, stage := range tt.stages {
				rule, ok := tt.rules[stage]
				if !ok {
					t.Fatalf("canonical stage %q is missing", stage)
				}
				if rule.anyNonTerminal {
					continue
				}
				if rule.order < lastOrder {
					t.Fatalf("stage %q regresses from order %d to %d", stage, lastOrder, rule.order)
				}
				lastOrder = rule.order
			}
		})
	}
}
