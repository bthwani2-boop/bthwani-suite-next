package platformcontrol

import (
	"encoding/json"
	"time"
)

type PlatformControlState string

const (
	StateFixRequired         PlatformControlState = "FIX_REQUIRED"
	StatePartiallyBound      PlatformControlState = "PARTIALLY_BOUND"
	StateUnknownHealth       PlatformControlState = "UNKNOWN_HEALTH"
	StateRollbackUnavailable PlatformControlState = "ROLLBACK_UNAVAILABLE"
	StateContractRequired    PlatformControlState = "CONTRACT_REQUIRED"
	StateReadOnlyBound       PlatformControlState = "READ_ONLY_BOUND"
	StateOperational         PlatformControlState = "OPERATIONAL"
)

type ChangeSetStatus string

const (
	ChangeSetDraft      ChangeSetStatus = "draft"
	ChangeSetValidated  ChangeSetStatus = "validated"
	ChangeSetSubmitted  ChangeSetStatus = "submitted"
	ChangeSetApproved   ChangeSetStatus = "approved"
	ChangeSetRejected   ChangeSetStatus = "rejected"
	ChangeSetApplied    ChangeSetStatus = "applied"
	ChangeSetRolledBack ChangeSetStatus = "rolled_back"
	ChangeSetFailed     ChangeSetStatus = "failed"
)

type ChangeTargetType string

const (
	ChangeTargetVariable    ChangeTargetType = "variable"
	ChangeTargetFeatureFlag ChangeTargetType = "feature_flag"
)

type RolloutStatus string

const (
	RolloutRunning    RolloutStatus = "running"
	RolloutPaused     RolloutStatus = "paused"
	RolloutCompleted  RolloutStatus = "completed"
	RolloutAborted    RolloutStatus = "aborted"
	RolloutRolledBack RolloutStatus = "rolled_back"
	RolloutFailed     RolloutStatus = "failed"
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
	Value          any                  `json:"value,omitempty"`
	Revision       string               `json:"revision"`
	Status         PlatformControlState `json:"status"`
	EffectiveFrom  *time.Time           `json:"effectiveFrom,omitempty"`
	ExpiresAt      *time.Time           `json:"expiresAt,omitempty"`
}

type FeatureFlag struct {
	Key       string               `json:"key"`
	Owner     string               `json:"ownerService"`
	Status    PlatformControlState `json:"status"`
	Revision  string               `json:"revision"`
	Enabled   *bool                `json:"enabled,omitempty"`
	Targeting map[string]any       `json:"targeting,omitempty"`
}

type ServicePosture struct {
	Service        string               `json:"service"`
	State          PlatformControlState `json:"state"`
	EvidenceSource string               `json:"evidenceSource"`
	Endpoint       string               `json:"endpoint,omitempty"`
	CheckedAt      *time.Time           `json:"checkedAt,omitempty"`
	LatencyMS      int64                `json:"latencyMs,omitempty"`
	Message        string               `json:"message,omitempty"`
}

type HealthSnapshot struct {
	State     PlatformControlState `json:"state"`
	CheckedAt time.Time            `json:"checkedAt"`
	Services  []ServicePosture     `json:"services"`
}

type AuditEvent struct {
	ID            string    `json:"id"`
	ChangeSetID   string    `json:"changeSetId,omitempty"`
	Action        string    `json:"action"`
	ActorID       string    `json:"actorId"`
	ActorRoles    []string  `json:"actorRoles,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	Status        string    `json:"status"`
	Reason        string    `json:"reason,omitempty"`
	CorrelationID string    `json:"correlationId,omitempty"`
}

type ChangeSetItem struct {
	ID               string           `json:"id"`
	TargetType       ChangeTargetType `json:"targetType"`
	TargetKey        string           `json:"targetKey"`
	OwnerService     string           `json:"ownerService"`
	ScopeType        string           `json:"scopeType"`
	ScopeID          string           `json:"scopeId,omitempty"`
	ValueType        string           `json:"valueType"`
	Classification   string           `json:"classification"`
	ExpectedRevision int64            `json:"expectedRevision"`
	BeforeValue      any              `json:"beforeValue,omitempty"`
	ProposedValue    any              `json:"proposedValue"`
	AppliedRevision  *int64           `json:"appliedRevision,omitempty"`
}

type ChangeSet struct {
	ID                string          `json:"id"`
	Title             string          `json:"title"`
	Reason            string          `json:"reason"`
	ImpactAssessment  string          `json:"impactAssessment"`
	RollbackPlan      string          `json:"rollbackPlan"`
	Status            ChangeSetStatus `json:"status"`
	ProposerActorID   string          `json:"proposerActorId"`
	ApproverActorID   string          `json:"approverActorId,omitempty"`
	AppliedByActorID  string          `json:"appliedByActorId,omitempty"`
	RejectedByActorID string          `json:"rejectedByActorId,omitempty"`
	RejectionReason   string          `json:"rejectionReason,omitempty"`
	Version           int64           `json:"version"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
	ValidatedAt       *time.Time      `json:"validatedAt,omitempty"`
	SubmittedAt       *time.Time      `json:"submittedAt,omitempty"`
	ApprovedAt        *time.Time      `json:"approvedAt,omitempty"`
	RejectedAt        *time.Time      `json:"rejectedAt,omitempty"`
	AppliedAt         *time.Time      `json:"appliedAt,omitempty"`
	RolledBackAt      *time.Time      `json:"rolledBackAt,omitempty"`
	Items             []ChangeSetItem `json:"items"`
}

type CreateChangeSetItemInput struct {
	TargetType       ChangeTargetType `json:"targetType"`
	TargetKey        string           `json:"targetKey"`
	OwnerService     string           `json:"ownerService"`
	ScopeType        string           `json:"scopeType"`
	ScopeID          string           `json:"scopeId,omitempty"`
	ValueType        string           `json:"valueType"`
	Classification   string           `json:"classification"`
	ExpectedRevision int64            `json:"expectedRevision"`
	ProposedValue    json.RawMessage  `json:"proposedValue"`
}

type CreateChangeSetInput struct {
	Title            string                     `json:"title"`
	Reason           string                     `json:"reason"`
	ImpactAssessment string                     `json:"impactAssessment"`
	RollbackPlan     string                     `json:"rollbackPlan"`
	Items            []CreateChangeSetItemInput `json:"items"`
}

type RejectChangeSetInput struct {
	Reason string `json:"reason"`
}

type Rollout struct {
	ID                string         `json:"id"`
	ChangeSetID       string         `json:"changeSetId"`
	FeatureFlagKey    string         `json:"featureFlagKey"`
	Status            RolloutStatus  `json:"status"`
	TargetScope       map[string]any `json:"targetScope"`
	Steps             []int64        `json:"steps"`
	CurrentStepIndex  int            `json:"currentStepIndex"`
	CurrentPercentage int64          `json:"currentPercentage"`
	HealthGate        map[string]any `json:"healthGate"`
	BaselineEnabled   bool           `json:"baselineEnabled"`
	BaselineTargeting map[string]any `json:"baselineTargeting"`
	FlagRevision      int64          `json:"flagRevision"`
	CreatedByActorID  string         `json:"createdByActorId"`
	UpdatedByActorID  string         `json:"updatedByActorId"`
	Version           int64          `json:"version"`
	CreatedAt         time.Time      `json:"createdAt"`
	UpdatedAt         time.Time      `json:"updatedAt"`
	StartedAt         *time.Time     `json:"startedAt,omitempty"`
	PausedAt          *time.Time     `json:"pausedAt,omitempty"`
	CompletedAt       *time.Time     `json:"completedAt,omitempty"`
	AbortedAt         *time.Time     `json:"abortedAt,omitempty"`
	RolledBackAt      *time.Time     `json:"rolledBackAt,omitempty"`
}

type CreateRolloutInput struct {
	ChangeSetID    string         `json:"changeSetId"`
	FeatureFlagKey string         `json:"featureFlagKey"`
	TargetScope    map[string]any `json:"targetScope"`
	Steps          []int64        `json:"steps"`
	HealthGate     map[string]any `json:"healthGate"`
}

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
