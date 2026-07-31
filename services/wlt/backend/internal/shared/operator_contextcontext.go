package shared

import (
	"context"
	"fmt"
	"strings"
)

type operatorContextKey struct{}

func WithOperatorContext(ctx context.Context, operatorContextID string) context.Context {
	return context.WithValue(ctx, operatorContextKey{}, strings.TrimSpace(operatorContextID))
}

func OperatorContextIDFromContext(ctx context.Context) (string, bool) {
	operatorContextID, _ := ctx.Value(operatorContextKey{}).(string)
	operatorContextID = strings.TrimSpace(operatorContextID)
	return operatorContextID, operatorContextID != ""
}

// RequireOperatorContext returns the trusted request OperatorContext and fails closed when
// no authenticated OperatorContext was propagated. Financial code must never invent a
// process-wide, local, or legacy OperatorContext ownership fallback.
func RequireOperatorContext(ctx context.Context) (string, error) {
	if operatorContextID, ok := OperatorContextIDFromContext(ctx); ok {
		return operatorContextID, nil
	}
	return "", fmt.Errorf("trusted OperatorContext context is required")
}
