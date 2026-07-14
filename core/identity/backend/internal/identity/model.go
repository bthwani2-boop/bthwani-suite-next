package identity

import "time"

type Actor struct {
	ID           string
	Username     string
	PasswordHash string
	TenantID     string
	PhoneE164    string
	Roles        []string
	Permissions  []Permission
	Active       bool
}

type Permission struct {
	Service string `json:"service"`
	Surface string `json:"surface"`
	Action  string `json:"action"`
	Scope   string `json:"scope"`
}

type ActorIdentity struct {
	Subject       string          `json:"subject"`
	TenantID      string          `json:"tenantId"`
	Roles         []string        `json:"roles"`
	Permissions   []Permission    `json:"permissions"`
	AuthState     string          `json:"authState"`
	SurfaceAccess map[string]bool `json:"surfaceAccess"`
	ServiceAccess map[string]bool `json:"serviceAccess"`
	SessionID     string          `json:"sessionId"`
	ExpiresAt     time.Time       `json:"expiresAt"`
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	AccessExpiry time.Time
	Identity     ActorIdentity
}

type LocalBootstrap struct {
	Enabled  bool
	Password string
}

type IssueActivationForActorInput struct {
	IssuedByActorID   string
	ExpectedActorType string
	ExpectedSurface   string
}

type IssueActivationResult struct {
	ActivationID string    `json:"activationId"`
	Code         string    `json:"code"`
	MaskedPhone  string    `json:"maskedPhone"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

type ConsumeActivationInput struct {
	ActorType         string
	Phone             string
	Code              string
	DeviceFingerprint string
}

type ProvisionActorInput struct {
	Username  string
	PhoneE164 string
	Role      string
	TenantID  string
}

// ActorAdminView is the internal (service-to-service) projection of an actor.
// It intentionally exposes the sovereign phone number: Identity is the sole
// owner of phone data and sibling services fetch it here instead of storing
// their own copy.
type ActorAdminView struct {
	ActorID   string   `json:"actorId"`
	Username  string   `json:"username"`
	PhoneE164 string   `json:"phoneE164"`
	Roles     []string `json:"roles"`
	Active    bool     `json:"active"`
}

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ActivationMetadata struct {
	ActivationID string    `json:"activationId"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	ExpiresAt    time.Time `json:"expiresAt"`
	MaskedPhone  string    `json:"maskedPhone"`
}

type OtpInput struct {
	Phone     string `json:"phone"`
	ActorType string `json:"actorType"`
}

type SessionInfo struct {
	SessionID         string    `json:"sessionId"`
	DeviceFingerprint string    `json:"deviceFingerprint"`
	CreatedAt         time.Time `json:"createdAt"`
	ExpiresAt         time.Time `json:"expiresAt"`
}

