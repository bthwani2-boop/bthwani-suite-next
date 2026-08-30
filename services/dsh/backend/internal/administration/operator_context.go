package administration

import (
	"context"
	"strings"

	"dsh-api/internal/auth"
)

const legacyUnscopedOperatorContext = "legacy-unscoped"

func requireOperatorContext(ctx context.Context) (string, error) {
	operatorContextID, ok := auth.OperatorContextIDFromContext(ctx)
	if !ok {
		return "", ErrOperatorContextRequired
	}
	return validateOperatorContextID(operatorContextID)
}

func validateOperatorContextID(operatorContextID string) (string, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" || operatorContextID == legacyUnscopedOperatorContext {
		return "", ErrOperatorContextRequired
	}
	return operatorContextID, nil
}
