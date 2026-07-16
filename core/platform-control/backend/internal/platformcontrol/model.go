package platformcontrol

import "time"

type PlatformControlState string

const (
	StateFixRequired         PlatformControlState = "FIX_REQUIRED"
	StatePartiallyBound      PlatformControlState = "PARTIALLY_BOUND"
	StateUnknownHealth       PlatformControlState = "UNKNOWN_HEALTH"
	StateRollbackUnavailable PlatformControlState = "ROLLBACK_UNAVAILABLE"
	StateContractRequired    PlatformControlState = "CONTRACT_REQUIRED"
	StateReadOnlyBound       PlatformControlState = "READ_ONLY_BOUND"
)

type RuntimeSnapshot struct {
	Status         PlatformControlState `json:"status"`
	Revision       string               `json:"revision"`
	GeneratedAt    time.Time            `json:"generatedAt"`
	VariablesState PlatformControlState `json:"variablesState"`
	FlagsState     PlatformControlState `json:"flagsState"`
	RolloutsState  PlatformControlState `json:"rolloutsState"`
	HealthState    PlatformControlState `json:"healthState"`
	AuditState     PlatformControlState `json:"auditState"`
	RollbackState  PlatformControlState `json:"rollbackState"`
	ServicesState  PlatformControlState `json:"servicesState"`
	Evidence       []string             `json:"evidence"`
}

type EffectiveRuntimeConfig struct {
	Revision        string         `json:"revision"`
	Stale           bool           `json:"stale"`
	FallbackUsed    bool           `json:"fallbackUsed"`
	EvaluationTrace []string       `json:"evaluationTrace"`
	Values          map[string]any `json:"values"`
}

type Variable struct {
	Key            string               `json:"key"`
	OwnerService   string               `json:"ownerService"`
	ValueType      string               `json:"valueType"`
	Classification string               `json:"classification"`
	ScopeType      string               `json:"scopeType"`
	ScopeID        string               `json:"scopeId,omitempty"`
	Revision       string               `json:"revision"`
	Status         PlatformControlState `json:"status"`
}

type FeatureFlag struct {
	Key      string               `json:"key"`
	Status   PlatformControlState `json:"status"`
	Revision string               `json:"revision"`
	Enabled  *bool                `json:"enabled,omitempty"`
}

type ServicePosture struct {
	Service        string               `json:"service"`
	State          PlatformControlState `json:"state"`
	EvidenceSource string               `json:"evidenceSource"`
}

type HealthSnapshot struct {
	State     PlatformControlState `json:"state"`
	CheckedAt time.Time            `json:"checkedAt"`
	Services  []ServicePosture     `json:"services"`
}

type AuditEvent struct {
	ID        string               `json:"id"`
	Action    string               `json:"action"`
	ActorID   string               `json:"actorId"`
	CreatedAt time.Time            `json:"createdAt"`
	Status    PlatformControlState `json:"status"`
}

type ChangeSet struct {
	ID        string               `json:"id"`
	Status    PlatformControlState `json:"status"`
	CreatedAt time.Time            `json:"createdAt"`
}

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
