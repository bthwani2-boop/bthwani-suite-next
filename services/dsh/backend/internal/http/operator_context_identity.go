package http

import (
	"strings"

	"dsh-api/internal/store"
)

func operatorContextIDForActor(actor store.StoreActor) string {
	return strings.TrimSpace(actor.OperatorContextID)
}
