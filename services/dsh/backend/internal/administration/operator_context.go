package administration

import (
	"context"
	"dsh-api/internal/opctx"
	"strings"
)

const legacyUnscopedOperatorContext = "legacy-unscoped"

func requireOperatorContext(ctx context.Context) (string, error) {
	operatorContextID, ok := opctx.OperatorContextIDFromContext(ctx)
	if !ok {
		return "", opctx.ErrOperatorContextRequired
	}
	return validateOperatorContextID(operatorContextID)
}

func validateOperatorContextID(operatorContextID string) (string, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" || operatorContextID == legacyUnscopedOperatorContext {
		return "", opctx.ErrOperatorContextRequired
	}
	return operatorContextID, nil
}
