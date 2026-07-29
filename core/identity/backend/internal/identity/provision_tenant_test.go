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
