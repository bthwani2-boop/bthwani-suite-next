package workforce

import (
	"encoding/json"
	"time"
)

// Person is the sovereign unified person profile. The workforce kind selects a
// separate employee, captain or field projection. Independent providers are
// not employees; compensation and all monetary truth are owned by WLT.
type Person struct {
	ActorID             string           `json:"actorId"`
	OperatorContextID   string           `json:"operatorContextId"`
	FullNameAr          string           `json:"fullNameAr"`
	FullNameEn          string           `json:"fullNameEn,omitempty"`
	WorkforceCode       string           `json:"workforceCode"`
	WorkforceKind       string           `json:"workforceKind"`
	EngagementType      string           `json:"engagementType"`
	EngagementStartDate string           `json:"engagementStartDate,omitempty"`
	EngagementStatus    string           `json:"engagementStatus"`
	PhotoMediaRef       string           `json:"photoMediaRef,omitempty"`
	Version             int              `json:"version"`
	CreatedAt           time.Time        `json:"createdAt"`
	UpdatedAt           time.Time        `json:"updatedAt"`
	FieldProfile        *FieldProfile    `json:"fieldProfile,omitempty"`
	CaptainProfile      *CaptainProfile  `json:"captainProfile,omitempty"`
	EmployeeProfile     *EmployeeProfile `json:"employeeProfile,omitempty"`
}

type FieldProfile struct {
	CityCode              string   `json:"cityCode,omitempty"`
	ServiceZoneID         string   `json:"serviceZoneId,omitempty"`
	ShiftCode             string   `json:"-"` // deprecated database compatibility only; field providers have no shifts
	SupervisorActorID     string   `json:"supervisorActorId,omitempty"`
	EmergencyContactName  string   `json:"emergencyContactName,omitempty"`
	EmergencyContactPhone string   `json:"emergencyContactPhone,omitempty"`
	PreferredLanguage     string   `json:"preferredLanguage,omitempty"`
	PolicyConsentAt       string   `json:"policyConsentAt,omitempty"`
	DocumentMediaRefs     []string `json:"documentMediaRefs"`
}

type CaptainProfile struct {
	VehicleType        string   `json:"vehicleType,omitempty"`
	VehicleIdentifier  string   `json:"vehicleIdentifier,omitempty"`
	LicenseStatus      string   `json:"licenseStatus,omitempty"`
	LicenseExpiresAt   string   `json:"licenseExpiresAt,omitempty"`
	OperatingCityCode  string   `json:"operatingCityCode,omitempty"`
	ServiceZoneID      string   `json:"serviceZoneId,omitempty"`
	OperatingScopeCode string   `json:"operatingScopeCode,omitempty"`
	SupervisorActorID  string   `json:"supervisorActorId,omitempty"`
	DocumentMediaRefs  []string `json:"documentMediaRefs"`
}

type EmployeeProfile struct {
	Department        string   `json:"department,omitempty"`
	Role              string   `json:"role,omitempty"`
	SupervisorActorID string   `json:"supervisorActorId,omitempty"`
	OfficeLocation    string   `json:"officeLocation,omitempty"`
	DocumentMediaRefs []string `json:"documentMediaRefs"`
}

// Initial creation is deliberately short. Referral, guarantor, identity and
// contract facts are completed progressively in ProviderOperationalCore.
type CreateFieldAgentInput struct {
	FullNameAr          string   `json:"fullNameAr"`
	FullNameEn          string   `json:"fullNameEn"`
	Username            string   `json:"username"`
	PhoneE164           string   `json:"phoneE164"`
	EngagementType      string   `json:"engagementType"`
	EngagementStartDate string   `json:"engagementStartDate"`
	ServiceZoneID       string   `json:"serviceZoneId"`
	ShiftCode           string   `json:"-"` // ignored compatibility slot; never accepted from API
	SupervisorActorID   string   `json:"supervisorActorId"`
	PhotoMediaRef       string   `json:"photoMediaRef"`
	DocumentMediaRefs   []string `json:"documentMediaRefs"`
}

type CreateCaptainInput struct {
	FullNameAr          string   `json:"fullNameAr"`
	FullNameEn          string   `json:"fullNameEn"`
	ActorID             string   `json:"actorId"`
	EngagementType      string   `json:"engagementType"`
	EngagementStartDate string   `json:"engagementStartDate"`
	PhotoMediaRef       string   `json:"photoMediaRef"`
	VehicleType         string   `json:"vehicleType"`
	VehicleIdentifier   string   `json:"vehicleIdentifier"`
	LicenseStatus       string   `json:"licenseStatus"`
	LicenseExpiresAt    string   `json:"licenseExpiresAt"`
	ServiceZoneID       string   `json:"serviceZoneId"`
	OperatingScopeCode  string   `json:"operatingScopeCode"`
	SupervisorActorID   string   `json:"supervisorActorId"`
	DocumentMediaRefs   []string `json:"documentMediaRefs"`
}

type UpdateFieldAgentInput struct {
	ExpectedVersion     int     `json:"expectedVersion"`
	FullNameAr          *string `json:"fullNameAr"`
	FullNameEn          *string `json:"fullNameEn"`
	EngagementType      *string `json:"engagementType"`
	EngagementStartDate *string `json:"engagementStartDate"`
	ServiceZoneID       *string `json:"serviceZoneId"`
	ShiftCode           *string `json:"-"` // ignored compatibility slot; never accepted from API
	SupervisorActorID   *string `json:"supervisorActorId"`
	PhotoMediaRef       *string `json:"photoMediaRef"`
}

type UpdateCaptainInput struct {
	ExpectedVersion     int     `json:"expectedVersion"`
	FullNameAr          *string `json:"fullNameAr"`
	FullNameEn          *string `json:"fullNameEn"`
	EngagementType      *string `json:"engagementType"`
	EngagementStartDate *string `json:"engagementStartDate"`
	PhotoMediaRef       *string `json:"photoMediaRef"`
	VehicleType         *string `json:"vehicleType"`
	VehicleIdentifier   *string `json:"vehicleIdentifier"`
	LicenseStatus       *string `json:"licenseStatus"`
	LicenseExpiresAt    *string `json:"licenseExpiresAt"`
	ServiceZoneID       *string `json:"serviceZoneId"`
	OperatingScopeCode  *string `json:"operatingScopeCode"`
	SupervisorActorID   *string `json:"supervisorActorId"`
}

type CreateEmployeeInput struct {
	FullNameAr          string   `json:"fullNameAr"`
	FullNameEn          string   `json:"fullNameEn"`
	ActorID             string   `json:"actorId"`
	EngagementType      string   `json:"engagementType"`
	EngagementStartDate string   `json:"engagementStartDate"`
	PhotoMediaRef       string   `json:"photoMediaRef"`
	Department          string   `json:"department"`
	Role                string   `json:"role"`
	OfficeLocation      string   `json:"officeLocation"`
	SupervisorActorID   string   `json:"supervisorActorId"`
	DocumentMediaRefs   []string `json:"documentMediaRefs"`
}

type UpdateEmployeeInput struct {
	ExpectedVersion     int     `json:"expectedVersion"`
	FullNameAr          *string `json:"fullNameAr"`
	FullNameEn          *string `json:"fullNameEn"`
	EngagementType      *string `json:"engagementType"`
	EngagementStartDate *string `json:"engagementStartDate"`
	PhotoMediaRef       *string `json:"photoMediaRef"`
	Department          *string `json:"department"`
	Role                *string `json:"role"`
	OfficeLocation      *string `json:"officeLocation"`
	SupervisorActorID   *string `json:"supervisorActorId"`
}

// UpdateSelfInput carries the only fields a provider may edit about themselves.
// Sovereign identity, engagement state and assignment scope remain operator-owned.
type UpdateSelfInput struct {
	PhotoMediaRef         *string `json:"photoMediaRef"`
	EmergencyContactName  *string `json:"emergencyContactName"`
	EmergencyContactPhone *string `json:"emergencyContactPhone"`
	PreferredLanguage     *string `json:"preferredLanguage"`
	PolicyConsent         *bool   `json:"policyConsent"`
}

type MeView struct {
	Person
	PhoneMasked     string `json:"phoneMasked,omitempty"`
	ProfileComplete bool   `json:"profileComplete"`
}

type ListFilter struct {
	Status        string
	CityCode      string
	Query         string
	WorkforceKind string
	Limit         int
	Offset        int
}

type City struct {
	Code   string `json:"code"`
	NameAr string `json:"nameAr"`
	NameEn string `json:"nameEn,omitempty"`
	Active bool   `json:"active"`
}

// Shift reference data remains available only for employee workflows.
type Shift struct {
	Code     string `json:"code"`
	NameAr   string `json:"nameAr"`
	NameEn   string `json:"nameEn,omitempty"`
	StartsAt string `json:"startsAt,omitempty"`
	EndsAt   string `json:"endsAt,omitempty"`
	Active   bool   `json:"active"`
}

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type OperationalAssignment struct {
	ID                string     `json:"id"`
	ActorID           string     `json:"actorId"`
	OperatorContextID string     `json:"operatorContextId"`
	Role              string     `json:"role"`
	ScopeType         string     `json:"scopeType"`
	ScopeTargetID     string     `json:"scopeTargetId"`
	StartsOn          time.Time  `json:"startsOn"`
	EndsOn            *time.Time `json:"endsOn,omitempty"`
	Active            bool       `json:"active"`
	AssignedBy        string     `json:"assignedBy,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
}

type OperationalAssignmentInput struct {
	ScopeType     string     `json:"scopeType"`
	ScopeTargetID string     `json:"scopeTargetId"`
	StartsOn      time.Time  `json:"startsOn"`
	EndsOn        *time.Time `json:"endsOn,omitempty"`
}

type ActorScopes struct {
	ActorID           string   `json:"actorId"`
	Role              string   `json:"role"`
	OperatorContextID string   `json:"operatorContextId"`
	StoreIDs          []string `json:"storeIds"`
	ServiceAreaCodes  []string `json:"serviceAreaCodes"`
	PartnerIDs        []string `json:"partnerIds"`
	ShiftCodes        []string `json:"shiftCodes"`
}
type ProvisioningCase struct {
	ID                string          `json:"id"`
	OperatorContextID string          `json:"operatorContextId"`
	IdempotencyKey    string          `json:"idempotencyKey"`
	Status            string          `json:"status"`
	WorkforceKind     string          `json:"workforceKind"`
	ActorID           string          `json:"actorId,omitempty"`
	IdentityCreated   bool            `json:"identityCreated,omitempty"`
	WorkforceCode     string          `json:"workforceCode,omitempty"`
	Payload           json.RawMessage `json:"payload"`
	FailureReason     string          `json:"failureReason,omitempty"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

type StartProvisioningInput struct {
	WorkforceKind string          `json:"workforceKind"`
	Payload       json.RawMessage `json:"payload"`
}

// BlockerReason represents a specific reason why an actor is blocked from operations.
type BlockerReason string

const (
	BlockerIdentitySuspended      BlockerReason = "IDENTITY_SUSPENDED"
	BlockerProfileIncomplete      BlockerReason = "PROFILE_INCOMPLETE"
	BlockerDocumentsExpired       BlockerReason = "DOCUMENTS_EXPIRED"
	BlockerEmploymentTerminated   BlockerReason = "EMPLOYMENT_TERMINATED"
	BlockerNoActiveAssignment     BlockerReason = "NO_ACTIVE_ASSIGNMENT"
	BlockerShiftInactive          BlockerReason = "SHIFT_INACTIVE"
	BlockerOutsideActiveArea      BlockerReason = "OUTSIDE_ACTIVE_AREA"
	BlockerFinancialEligibility   BlockerReason = "FINANCIAL_ELIGIBILITY_BLOCKED"
	BlockerEligibilityUnavailable BlockerReason = "ELIGIBILITY_UNAVAILABLE"
)

// ReadinessStatus indicates the overall operational readiness.
type ReadinessStatus string

const (
	ReadinessAllowed ReadinessStatus = "ALLOWED"
	ReadinessBlocked ReadinessStatus = "BLOCKED"
)

// ReadinessGate aggregates readiness from Identity, Workforce, DSH, and Finance.
type ReadinessGate struct {
	ActorID        string          `json:"actorId"`
	WorkforceKind  string          `json:"workforceKind"`
	Status         ReadinessStatus `json:"status"`
	BlockerReasons []BlockerReason `json:"blockerReasons"`
	CheckedAt      time.Time       `json:"checkedAt"`
}
