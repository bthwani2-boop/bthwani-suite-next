package identity

// Partner access codes are issued only after the partner account has been
// approved and bound to an Identity actor through the authenticated DSH
// service boundary. The app-partner surface can consume an actor-bound code,
// but it cannot create an actor or request a public/self-service OTP.
func init() {
	activationSurfaceByActorType["partner"] = "app-partner"
	delete(publicOtpActorTypes, "partner")
}
