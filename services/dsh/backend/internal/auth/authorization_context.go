package auth

import (
	"context"
	"strings"
)

type authorizedActionKey struct{}
type authorizationScopeKey struct{}

// WithAuthorizationContext installs the permission decision resolved by the
// trusted Identity boundary alongside the operator context.
func WithAuthorizationContext(ctx context.Context, action, scope string) context.Context {
	ctx = context.WithValue(ctx, authorizedActionKey{}, strings.TrimSpace(action))
	return context.WithValue(ctx, authorizationScopeKey{}, strings.TrimSpace(scope))
}

// AuthorizationActionFromContext returns the trusted permission decision.
func AuthorizationActionFromContext(ctx context.Context) (string, bool) {
	action, _ := ctx.Value(authorizedActionKey{}).(string)
	action = strings.TrimSpace(action)
	return action, action != ""
}

// AuthorizationScopeFromContext returns the trusted permission scope.
func AuthorizationScopeFromContext(ctx context.Context) (string, bool) {
	scope, _ := ctx.Value(authorizationScopeKey{}).(string)
	scope = strings.TrimSpace(scope)
	return scope, scope != ""
}
