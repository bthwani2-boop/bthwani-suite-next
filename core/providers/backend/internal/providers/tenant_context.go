package providers

import (
	"context"
	"errors"
	"strings"
)

type operatorContextKey struct{}

var ErrOperatorContextRequired = errors.New("trusted tenant context is required")

// WithOperatorContext installs the tenant resolved from the authenticated Identity
// session. Callers must never populate this value from request headers or body.
func WithOperatorContext(ctx context.Context, operatorContextID string) context.Context {
	return context.WithValue(ctx, operatorContextKey{}, strings.TrimSpace(operatorContextID))
}

func OperatorContextIDFromContext(ctx context.Context) (string, bool) {
	operatorContextID, _ := ctx.Value(operatorContextKey{}).(string)
	operatorContextID = strings.TrimSpace(operatorContextID)
	return operatorContextID, operatorContextID != ""
}

func RequireOperatorContext(ctx context.Context) (string, error) {
	if operatorContextID, ok := OperatorContextIDFromContext(ctx); ok {
		return operatorContextID, nil
	}
	return "", ErrOperatorContextRequired
}
