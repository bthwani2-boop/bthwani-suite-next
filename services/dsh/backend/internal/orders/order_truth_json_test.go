package orders

import (
	"encoding/json"
	"testing"
)

func TestOrderTruthJSONUsesEmptyArraysInsteadOfNull(t *testing.T) {
	payload, err := json.Marshal(OrderTruth{ID: "order-1"})
	if err != nil {
		t.Fatalf("marshal order truth: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("unmarshal order truth: %v", err)
	}
	for _, field := range []string{"items", "statusTimeline", "allowedActions"} {
		value, ok := decoded[field]
		if !ok {
			t.Fatalf("missing %s in public order truth", field)
		}
		if _, ok := value.([]any); !ok {
			t.Fatalf("expected %s to be an array, got %#v", field, value)
		}
	}
}
