package http

const reasonReadinessUnproven = "IDENTITY_READINESS_UNPROVEN"

func init() {
	// Liveness must never claim full health before at least one governed
	// readiness probe has succeeded on the current process.
	lastReadinessFailed.Store(true)
	readinessSnapshot.Lock()
	readinessSnapshot.value = runtimeStatusResponse{
		Service: "core-identity",
		Checks: []runtimeCheckStatus{},
		ReasonCodes: []string{reasonReadinessUnproven},
	}
	readinessSnapshot.Unlock()
}
