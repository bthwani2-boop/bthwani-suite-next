package auth

import (
	"context"
	"strings"
)

type operatorContextKey struct{}

// WithOperatorContext installs an operator context resolved by DSH's trusted
// Identity boundary. Request headers and payloads must never populate it.
func WithOperatorContext(ctx context.Context, operatorContextID string) context.Context {
	return context.WithValue(ctx, operatorContextKey{}, strings.TrimSpace(operatorContextID))
}

// OperatorContextIDFromContext returns only the server-derived operator context.
func OperatorContextIDFromContext(ctx context.Context) (string, bool) {
	operatorContextID, _ := ctx.Value(operatorContextKey{}).(string)
	operatorContextID = strings.TrimSpace(operatorContextID)
	return operatorContextID, operatorContextID != ""
}
