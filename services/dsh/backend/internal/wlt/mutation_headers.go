package wlt

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
)

func deterministicMutationKey(scope string, parts ...string) string {
	values := []string{strings.TrimSpace(scope)}
	for _, part := range parts {
		if value := strings.TrimSpace(part); value != "" {
			values = append(values, value)
		}
	}
	sum := sha256.Sum256([]byte(strings.Join(values, "|")))
	return "dsh:" + strings.TrimSpace(scope) + ":" + hex.EncodeToString(sum[:16])
}

func setRequiredMutationHeaders(req *http.Request, correlationID, idempotencyKey string) error {
	correlationID = strings.TrimSpace(correlationID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if correlationID == "" {
		return fmt.Errorf("WLT mutation correlation id is required")
	}
	if idempotencyKey == "" {
		return fmt.Errorf("WLT mutation idempotency key is required")
	}
	req.Header.Set("X-Correlation-ID", correlationID)
	req.Header.Set("Idempotency-Key", idempotencyKey)
	return nil
}
