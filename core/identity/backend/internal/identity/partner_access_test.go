package identity

import "testing"

func TestPartnerAccessCodeSurfaceRegistered(t *testing.T) {
	surface, ok := activationSurfaceFor("partner")
	if !ok || surface != "app-partner" {
		t.Fatalf("partner activation surface = %q, %v; want app-partner,true", surface, ok)
	}
}

// partner is public-OTP-only (publicOtpActorTypes), never Workforce
// access-code-issued (workforceManagedActorTypes), so it must always be
// rejected by the Workforce-scoped validateExpectedActivationTarget path —
// see TestActivationIssuancePoliciesSeparatePublicAndWorkforceRoles.
func TestPartnerAccessCodeTargetIsActorBound(t *testing.T) {
	actor := Actor{
		ID:        "partner-actor-1",
		PhoneE164: "+967771000001",
		Roles:     []string{"partner"},
	}
	if err := validateExpectedActivationTarget(actor, "partner", "app-partner"); err == nil {
		t.Fatal("partner is public-OTP-only and must not validate through Workforce access-code issuance")
	}
	if err := validateExpectedActivationTarget(actor, "partner", "app-captain"); err == nil {
		t.Fatal("partner access code must not target another application surface")
	}
}
