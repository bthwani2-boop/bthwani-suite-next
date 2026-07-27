package identity

// Partner access codes are issued only after the partner account has been
// approved and bound to an Identity actor by the Partners department. Adding
// the surface here makes the existing actor-bound invitation path authoritative
// for app-partner without enabling public/self-service code issuance.
func init() {
	activationSurfaceByActorType["partner"] = "app-partner"
}
