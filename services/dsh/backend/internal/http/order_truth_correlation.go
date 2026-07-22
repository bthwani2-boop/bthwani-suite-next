package http

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

// safeOrderCreateCorrelation preserves an explicit correlation identifier only
// when it is distinct from the mutation key. Missing or accidentally reused
// identifiers are replaced with a deterministic non-secret digest so retries
// retain one trace without exposing the raw Idempotency-Key.
func safeOrderCreateCorrelation(tenantID, clientID, checkoutIntentID, idempotencyKey, provided string) string {
	provided = strings.TrimSpace(provided)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if provided != "" && provided != idempotencyKey {
		return provided
	}
	sum := sha256.Sum256([]byte(strings.Join([]string{
		strings.TrimSpace(tenantID),
		strings.TrimSpace(clientID),
		strings.TrimSpace(checkoutIntentID),
		idempotencyKey,
	}, "|")))
	return "order-create:" + hex.EncodeToString(sum[:12])
}
