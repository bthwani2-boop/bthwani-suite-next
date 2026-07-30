package identity

import "testing"

func TestOtpRoleSurfaceRejectsWorkforceManagedRoles(t *testing.T) {
	for _, role := range []string{"field", "captain"} {
		if _, err := otpRoleSurface(role); err != ErrInvalidActivation {
			t.Fatalf("otpRoleSurface(%q) must reject Workforce-managed roles, got %v", role, err)
		}
		if _, err := otpRolePermissions(role, ""); err != ErrInvalidActivation {
			t.Fatalf("otpRolePermissions(%q) must reject Workforce-managed roles, got %v", role, err)
		}
	}
}

func TestOtpRoleSurfaceAcceptsPublicRoles(t *testing.T) {
	tests := map[string]string{"client": "app-client", "partner": "app-partner"}
	for role, expectedSurface := range tests {
		surface, err := otpRoleSurface(role)
		if err != nil || surface != expectedSurface {
			t.Fatalf("otpRoleSurface(%q) = %q, %v; want %q, nil", role, surface, err, expectedSurface)
		}
		if _, err := otpRolePermissions(role, surface); err != nil {
			t.Fatalf("otpRolePermissions(%q) failed: %v", role, err)
		}
	}
}
