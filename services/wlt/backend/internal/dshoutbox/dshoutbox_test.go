package dshoutbox

import "testing"

func TestRequireOperatorContextIDFailsClosed(t *testing.T) {
	for _, value := range []string{"", " ", "\t"} {
		if err := requireOperatorContextID(value); err == nil {
			t.Fatalf("expected blank OperatorContextId %q to be rejected", value)
		}
	}
}

func TestRequireOperatorContextIDAcceptsBoundScope(t *testing.T) {
	if err := requireOperatorContextID("OperatorContext-test"); err != nil {
		t.Fatalf("expected bound OperatorContextId to be accepted: %v", err)
	}
}
