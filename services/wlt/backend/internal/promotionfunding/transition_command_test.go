package promotionfunding

import "testing"

func TestTransitionRequestHashBindsFinancialCommandPayload(t *testing.T) {
	base := TransitionInput{
		OperatorContextID: "operator-1",
		OrderID:           "order-1",
		Reason:            "order cancelled",
	}
	first, err := transitionRequestHash("reservation-1", "reversed", base)
	if err != nil {
		t.Fatal(err)
	}
	second, err := transitionRequestHash("reservation-1", "reversed", base)
	if err != nil {
		t.Fatal(err)
	}
	if first != second {
		t.Fatalf("same command produced different hashes: %q != %q", first, second)
	}
	base.Reason = "different reason"
	third, err := transitionRequestHash("reservation-1", "reversed", base)
	if err != nil {
		t.Fatal(err)
	}
	if first == third {
		t.Fatal("request hash did not change when the financial reason changed")
	}
}
