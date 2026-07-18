package http

import (
	"strings"

	"dsh-api/internal/store"
)

func tenantIDForActor(actor store.StoreActor) string {
	return strings.TrimSpace(actor.TenantID)
}
