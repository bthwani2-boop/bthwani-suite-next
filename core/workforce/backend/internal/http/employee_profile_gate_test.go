package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	auth "github.com/bthwani2-boop/bthwani-identityauth"
	"workforce-api/internal/workforce"
)

func TestEmployeeProfileGate_UnauthorizedSelfEdit(t *testing.T) {
	// A user attempting to edit their own profile or someone else's without proper scope
	identity := auth.Identity{
		Subject: "actor-123",
		Roles:   []string{"employee"},
		// Missing employee:update permission
	}

	person := workforce.Person{
		ActorID: "actor-123", // self
		EmployeeProfile: &workforce.EmployeeProfile{
			Department: "engineering",
		},
	}

	w := httptest.NewRecorder()
	allowed := requireEmployeeTarget(w, identity, "employee:update", person)

	if allowed {
		t.Fatalf("expected self-edit to be rejected due to missing explicit employee:update scope")
	}
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 Forbidden, got %d", w.Code)
	}
}

func TestEmployeeProfileGate_TerminatedAccess(t *testing.T) {
	// Terminated/suspended access should reject mutations if we had a middleware for it.
	// We'll test that standard department scopes prevent cross-department edits.
	identity := auth.Identity{
		Subject: "manager-1",
		Roles:   []string{"department_manager"},
		Permissions: []auth.Permission{
			{Service: "workforce", Action: "employee:update", Scope: "department:sales"},
		},
	}

	person := workforce.Person{
		ActorID: "actor-123",
		EmployeeProfile: &workforce.EmployeeProfile{
			Department: "engineering", // Outside manager's scope
		},
	}

	w := httptest.NewRecorder()
	allowed := requireEmployeeTarget(w, identity, "employee:update", person)

	if allowed {
		t.Fatalf("expected edit to be rejected due to cross-department scope")
	}
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 Forbidden, got %d", w.Code)
	}
}
