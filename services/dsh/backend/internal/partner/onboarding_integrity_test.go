package partner

import "testing"

func TestTransitionRequestHashBindsActorStatusAndVersion(t *testing.T) {
	input := TransitionInput{
		ToStatus:     StatusSubmitted,
		Reason:       "field submission",
		ActorID:      "field-001",
		ActorSurface: "app-field",
	}
	first := transitionRequestHash("partner-001", input, 2)
	if first != transitionRequestHash("partner-001", input, 2) {
		t.Fatal("same transition payload produced a different hash")
	}
	input.ActorID = "field-002"
	if first == transitionRequestHash("partner-001", input, 2) {
		t.Fatal("different transition actor reused the same request hash")
	}
}
