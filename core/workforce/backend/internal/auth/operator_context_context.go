package auth

import (
	"context"
	"strings"

	identityauth "github.com/bthwani2-boop/bthwani-identityauth"
)

type operatorContextKey struct{}

// WithOperatorContext binds the context resolved from Identity to the current
// request. Downstream service clients must use this value; they must not infer
// operator-context scope from process configuration or caller-controlled
// headers.
func WithOperatorContext(ctx context.Context, operatorContextID string) context.Context {
	return context.WithValue(ctx, operatorContextKey{}, strings.TrimSpace(operatorContextID))
}

func OperatorContextIDFromContext(ctx context.Context) (string, bool) {
	if ctx == nil {
		return "", false
	}
	operatorContextID, _ := ctx.Value(operatorContextKey{}).(string)
	operatorContextID = strings.TrimSpace(operatorContextID)
	return operatorContextID, operatorContextID != ""
}

// BindIdentityContext installs the context carried by an authenticated
// Identity response and fails closed when Identity did not provide one.
func BindIdentityContext(ctx context.Context, identity identityauth.ActorIdentity) (context.Context, error) {
	operatorContextID := strings.TrimSpace(identity.OperatorContextID)
	if operatorContextID == "" {
		return ctx, identityauth.ErrUnauthenticated
	}
	return WithOperatorContext(ctx, operatorContextID), nil
}
