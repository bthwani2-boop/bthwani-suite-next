package identity

import "time"

type Actor struct {
	ID           string
	Username     string
	PasswordHash string
	TenantID     string
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

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
