package wlt

import (
	"context"
	"fmt"
	"net/http"
	"strings"
)

type operatorContextKey struct{}

// WithOperatorContext attaches a tenant that was resolved by a trusted server-side
// boundary (Identity session, database-owned outbox row, or another authenticated
// service). Browser headers and request payloads must never populate this value.
func WithOperatorContext(ctx context.Context, operatorContextID string) context.Context {
	return context.WithValue(ctx, operatorContextKey{}, strings.TrimSpace(operatorContextID))
}

// OperatorContextIDFromContext returns only the trusted tenant installed by a server-side
// boundary. An empty value is intentionally treated as missing context.
func OperatorContextIDFromContext(ctx context.Context) (string, bool) {
	operatorContextID, _ := ctx.Value(operatorContextKey{}).(string)
	operatorContextID = strings.TrimSpace(operatorContextID)
	return operatorContextID, operatorContextID != ""
}

type tenantRoundTripper struct {
	base http.RoundTripper
}

func (transport tenantRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	base := transport.base
	if base == nil {
		base = http.DefaultTransport
	}

	trustedOperatorContextID, hasTrustedTenant := OperatorContextIDFromContext(req.Context())
	if !hasTrustedTenant {
		return nil, fmt.Errorf("trusted tenant context is required for every WLT request")
	}
	headerOperatorContextID := strings.TrimSpace(req.Header.Get("X-Operator-Context-ID"))
	if headerOperatorContextID != "" && headerOperatorContextID != trustedOperatorContextID {
		return nil, fmt.Errorf("WLT tenant header does not match trusted request context")
	}
	if headerOperatorContextID != trustedOperatorContextID {
		clone := req.Clone(req.Context())
		clone.Header = req.Header.Clone()
		clone.Header.Set("X-Operator-Context-ID", trustedOperatorContextID)
		req = clone
	}
	return base.RoundTrip(req)
}
