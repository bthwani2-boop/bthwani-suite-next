// Package opctx is the single canonical owner of trusted operator-context
// propagation inside DSH. The value it carries is resolved exclusively by
// server-side trust boundaries (Identity session resolution, database-owned
// outbox rows, or authenticated service callers); browser headers and request
// payloads must never populate it.
package opctx

import (
	"context"
	"errors"
	"strings"
)

// ErrOperatorContextRequired is the canonical error for a missing trusted
// operator context.
var ErrOperatorContextRequired = errors.New("trusted OperatorContext context is required")

type operatorContextKey struct{}

// WithOperatorContext installs the trusted operator context.
func WithOperatorContext(ctx context.Context, operatorContextID string) context.Context {
	return context.WithValue(ctx, operatorContextKey{}, strings.TrimSpace(operatorContextID))
}

// OperatorContextIDFromContext returns only the trusted operator context
// installed by a server-side boundary. An empty value is intentionally treated
// as missing context.
func OperatorContextIDFromContext(ctx context.Context) (string, bool) {
	operatorContextID, _ := ctx.Value(operatorContextKey{}).(string)
	operatorContextID = strings.TrimSpace(operatorContextID)
	return operatorContextID, operatorContextID != ""
}
