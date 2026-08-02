package identity

import "testing"

func TestPartnerAccessCodeSurfaceRegistered(t *testing.T) {
	surface, ok := activationSurfaceFor("partner")
	if !ok || surface != "app-partner" {
		t.Fatalf("partner activation surface = %q, %v; want app-partner,true", surface, ok)
	}
}

func TestPartnerCannotRequestPublicOTP(t *testing.T) {
	if _, err := otpRoleSurface("partner"); err == nil {
		t.Fatal("partner must use an actor-bound platform-issued access code")
	}
}

// Workforce activation remains restricted to field/captain. Partner codes are
// issued through the dedicated authenticated DSH service path.
func TestPartnerDoesNotUseWorkforceActivationPath(t *testing.T) {
	actor := Actor{
		ID:        "partner-actor-1",
		PhoneE164: "+967771000001",
		Roles:     []string{"partner"},
	}
	if err := validateExpectedActivationTarget(actor, "partner", "app-partner"); err == nil {
		t.Fatal("partner must not validate through Workforce activation issuance")
	}
	if err := validateExpectedActivationTarget(actor, "partner", "app-captain"); err == nil {
		t.Fatal("partner access code must not target another application surface")
	}
}
