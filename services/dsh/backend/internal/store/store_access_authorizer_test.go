package store

import (
	"context"
	"errors"
	"testing"

	"dsh-api/internal/workforceclient"
)

func TestMissingStoreAuthorizerDependencyFailsClosed(t *testing.T) {
	decision, err := NewStoreAccessAuthorizer(nil, nil).AuthorizeStoreAccess(
		context.Background(),
		TrustedSubject{ID: "actor-1", OperatorContextID: "operator-1"},
		"store-1",
		"store.read",
	)
	if !errors.Is(err, ErrAuthorizationUnavailable) {
		t.Fatalf("expected authorization dependency error, got %v", err)
	}
	if decision.Allowed {
		t.Fatal("missing authorizer dependencies must never allow access")
	}
}

func TestForgedPermissionRoleDoesNotCreateAuthority(t *testing.T) {
	subject := TrustedSubjectForActor(context.Background(), StoreActor{
		ID:                "actor-1",
		Role:              "permission:partners.manage",
		OperatorContextID: "operator-1",
	})
	if len(subject.Roles) != 0 || len(subject.Permissions) != 0 {
		t.Fatalf("forged role created trusted authority: %+v", subject)
	}
}

func TestOperatorWithoutObjectPermissionIsDeniedByPermissionMatcher(t *testing.T) {
	_, allowed := matchingObjectPermission(nil, "store-1", "partner-1", "operator.store.govern")
	if allowed {
		t.Fatal("operator role metadata must not grant object access")
	}
}

func TestOperatorWithExplicitStorePermissionIsAllowed(t *testing.T) {
	permission, allowed := matchingObjectPermission([]TrustedPermission{{
		Service: "dsh",
		Surface: "control-panel",
		Action:  "operator.store.govern",
		Scope:   "store:store-1",
	}}, "store-1", "partner-1", "operator.store.govern")
	if !allowed || permission.Scope != "store:store-1" {
		t.Fatalf("expected explicit store permission, got %+v allowed=%v", permission, allowed)
	}
}

func TestCrossStorePermissionIsDenied(t *testing.T) {
	_, allowed := matchingObjectPermission([]TrustedPermission{{
		Service: "dsh",
		Action:  "store.read",
		Scope:   "store:store-2",
	}}, "store-1", "partner-1", "store.read")
	if allowed {
		t.Fatal("permission for a different store must be denied")
	}
}

func TestCrossPartnerPermissionIsDenied(t *testing.T) {
	_, allowed := matchingObjectPermission([]TrustedPermission{{
		Service: "dsh",
		Action:  "store.read",
		Scope:   "partner:partner-2",
	}}, "store-1", "partner-1", "store.read")
	if allowed {
		t.Fatal("permission for a different partner must be denied")
	}
}

func TestInactiveOrExpiredAssignmentIsDenied(t *testing.T) {
	scopes := &workforceclient.ActorScopes{
		ActorID:           "actor-1",
		OperatorContextID: "operator-1",
		Role:              "field",
		StoreIDs:          []string{"store-expired"},
		PartnerIDs:        []string{"partner-expired"},
	}
	if activeAssignmentAllowsStore(scopes, "store-current", "partner-current") {
		t.Fatal("a non-active/missing current assignment must not authorize the requested object")
	}
}

func TestCrossActorVisitRequiresExplicitPermission(t *testing.T) {
	ordinary := TrustedPermission{Service: "dsh", Action: "field.store.access", Scope: "store:store-1"}
	if permissionAllowsCrossActor(ordinary, "field.store.access") {
		t.Fatal("ordinary store access must not permit cross-actor visit access")
	}
	explicit := TrustedPermission{Service: "dsh", Action: "field.visit.cross-actor", Scope: "store:store-1"}
	if !permissionAllowsCrossActor(explicit, "field.visit.cross-actor") {
		t.Fatal("explicit cross-actor permission should be recognized")
	}
}
