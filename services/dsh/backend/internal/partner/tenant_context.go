package partner

import (
	"context"
	"errors"
	"strings"
)

var ErrOperatorContextRequired = errors.New("trusted tenant context is required")

type operatorContextKey struct{}

// WithOperatorContext attaches the tenant resolved from the authenticated Identity
// session. Callers must never populate this value from query parameters or
// client-controlled tenant headers.
func WithOperatorContext(ctx context.Context, operatorContextID string) context.Context {
	return context.WithValue(ctx, operatorContextKey{}, strings.TrimSpace(operatorContextID))
}

// OperatorContextIDFromContext returns only the trusted tenant value installed by the
// DSH HTTP authentication boundary.
func OperatorContextIDFromContext(ctx context.Context) (string, bool) {
	operatorContextID, _ := ctx.Value(operatorContextKey{}).(string)
	operatorContextID = strings.TrimSpace(operatorContextID)
	return operatorContextID, operatorContextID != ""
}
