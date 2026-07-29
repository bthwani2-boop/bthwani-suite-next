package identity

import (
	"context"
	"errors"
	"testing"
)

func TestProvisionActorRejectsMissingTenantBeforeDatabaseAccess(t *testing.T) {
	repo := &Repository{}

	view, err := repo.ProvisionActor(context.Background(), ProvisionActorInput{
		Username:  "field-without-tenant",
		PhoneE164: "+967777123456",
		Role:      "field",
	})
	if !errors.Is(err, ErrInvalidActivation) {
		t.Fatalf("missing trusted tenant must be rejected before database access, view=%#v err=%v", view, err)
	}
}

func TestProvisionActorRejectsExistingPhoneFromDifferentTenant(t *testing.T) {
	phone := "+967777123457"
	repo := newTestRepository(t, nil)
	fakeDriverInst.setActors(t.Name(), map[string]Actor{
		phone: {
			ID:        "field-tenant-a",
			Username:  "field-a",
			OperatorContextID:  "tenant-a",
			PhoneE164: phone,
			Roles:     []string{"field"},
			Permissions: []Permission{
				{Service: "dsh", Surface: "app-field", Action: "store:read", Scope: "assigned"},
			},
			Active: false,
		},
	})

	view, err := repo.ProvisionActor(context.Background(), ProvisionActorInput{
		Username:  "field-tenant-b",
		PhoneE164: phone,
		Role:      "field",
		OperatorContextID:  "tenant-b",
	})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("cross-tenant phone reuse must be forbidden, view=%#v err=%v", view, err)
	}
}
