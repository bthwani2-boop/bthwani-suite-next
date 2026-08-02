package identity

import "testing"

func TestOtpRoleSurfaceRejectsGovernedRoles(t *testing.T) {
	for _, role := range []string{"partner", "field", "captain"} {
		if _, err := otpRoleSurface(role); err != ErrInvalidActivation {
			t.Fatalf("otpRoleSurface(%q) must reject governed roles, got %v", role, err)
		}
		if _, err := otpRolePermissions(role, ""); err != ErrInvalidActivation {
			t.Fatalf("otpRolePermissions(%q) must reject governed roles, got %v", role, err)
		}
	}
}

func TestOtpRoleSurfaceAcceptsClientOnly(t *testing.T) {
	surface, err := otpRoleSurface("client")
	if err != nil || surface != "app-client" {
		t.Fatalf("otpRoleSurface(client) = %q, %v; want app-client, nil", surface, err)
	}
	if _, err := otpRolePermissions("client", surface); err != nil {
		t.Fatalf("otpRolePermissions(client) failed: %v", err)
	}
}
