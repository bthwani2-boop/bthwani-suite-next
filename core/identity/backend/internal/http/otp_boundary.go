package http

import (
	"context"
	"net/http"

	"identity-api/internal/identity"
)

type OperatorContextOtpRepository interface {
	RequestOtpForOperatorContext(
		ctx context.Context,
		operatorContextID string,
		input identity.OtpInput,
	) (identity.IssueActivationResult, error)
}

// OtpBoundary is now a no-op boundary - the OTP route is registered canonically in the router.
// This boundary is kept for potential future cross-cutting concerns (e.g., rate limiting, logging).
func OtpBoundary(repository OperatorContextOtpRepository, next http.Handler) http.Handler {
	return next
}