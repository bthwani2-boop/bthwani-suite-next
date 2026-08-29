package partner

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
)

const (
	partnerMutationKeyMinLength         = 8
	partnerMutationKeyMaxLength         = 200
	partnerMutationCorrelationMaxLength = 200
)

var ErrPartnerMutationIdempotencyRequired = errors.New("partner mutation idempotency key is required")

func normalizePartnerMutationIdentity(idempotencyKey, correlationID string, scope ...string) (string, string, error) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if len(idempotencyKey) < partnerMutationKeyMinLength || len(idempotencyKey) > partnerMutationKeyMaxLength {
		return "", "", ErrPartnerMutationIdempotencyRequired
	}

	correlationID = strings.TrimSpace(correlationID)
	if correlationID == "" {
		correlationParts := append([]string{"partner-mutation-correlation"}, scope...)
		correlationParts = append(correlationParts, idempotencyKey)
		correlationID = governedMutationKey(correlationParts...)
	}
	if len(correlationID) > partnerMutationCorrelationMaxLength {
		return "", "", ErrPartnerMutationIdempotencyRequired
	}
	return idempotencyKey, correlationID, nil
}

func partnerMutationRequestHash(request any) (string, error) {
	encoded, err := json.Marshal(request)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:]), nil
}

func partnerMutationLock(scope ...string) string {
	return strings.Join(scope, "\x1f")
}
