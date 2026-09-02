package wlt

import (
	"fmt"
	"net/http"
	"strings"

	"dsh-api/internal/opctx"
)

const delegatedOperatorContextHeader = "X-Delegated-Operator-Context"

type OperatorContextRoundTripper struct {
	base http.RoundTripper
}

func (transport OperatorContextRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	base := transport.base
	if base == nil {
		base = http.DefaultTransport
	}

	trustedOperatorContextID, hasTrustedOperatorContext := opctx.OperatorContextIDFromContext(req.Context())
	if !hasTrustedOperatorContext {
		return nil, fmt.Errorf("trusted OperatorContext context is required for every WLT request")
	}
	headerOperatorContextID := strings.TrimSpace(req.Header.Get(delegatedOperatorContextHeader))
	if headerOperatorContextID != "" && headerOperatorContextID != trustedOperatorContextID {
		return nil, fmt.Errorf("WLT delegated OperatorContext header does not match trusted request context")
	}
	if headerOperatorContextID != trustedOperatorContextID {
		clone := req.Clone(req.Context())
		clone.Header = req.Header.Clone()
		clone.Header.Set(delegatedOperatorContextHeader, trustedOperatorContextID)
		req = clone
	}
	return base.RoundTrip(req)
}
