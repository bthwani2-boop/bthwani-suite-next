package http

import (
	"strings"

	"dsh-api/internal/auth"
)

func tenantIDForActor(actor auth.Identity) string {
	return strings.TrimSpace(actor.TenantID)
}
