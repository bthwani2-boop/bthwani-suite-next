package identity

import "testing"

func TestPartnerAccessCodeSurfaceRegistered(t *testing.T) {
	surface, ok := activationSurfaceFor("partner")
	if !ok || surface != "app-partner" {
		t.Fatalf("partner activation surface = %q, %v; want app-partner,true", surface, ok)
	}
}

func TestPartnerAccessCodeTargetIsActorBound(t *testing.T) {
	actor := Actor{
		ID:        "partner-actor-1",
		PhoneE164: "+967771000001",
		Roles:     []string{"partner"},
	}
	if err := validateExpectedActivationTarget(actor, "partner", "app-partner"); err != nil {
		t.Fatalf("partner access-code target should validate: %v", err)
	}
	if err := validateExpectedActivationTarget(actor, "partner", "app-captain"); err == nil {
		t.Fatal("partner access code must not target another application surface")
	}
}
