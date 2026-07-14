package workforce

import "time"

// Person is the sovereign service-provider profile (field agent today,
// captain later). Providers are independent contractors, not employees:
// compensation (field commission per store onboarding, captain delivery
// fees) is owned by WLT and never modeled here. actor_id is the shared key
// with Identity; no phone is stored here (Identity owns phones).
type Person struct {
	ActorID             string           `json:"actorId"`
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
	ShiftCode             string   `json:"shiftCode,omitempty"`
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

type CreateFieldAgentInput struct {
	FullNameAr          string   `json:"fullNameAr"`
	FullNameEn          string   `json:"fullNameEn"`
	PhoneE164           string   `json:"phoneE164"`
	EngagementType      string   `json:"engagementType"`
	EngagementStartDate string   `json:"engagementStartDate"`
	ServiceZoneID       string   `json:"serviceZoneId"`
	ShiftCode           string   `json:"shiftCode"`
	SupervisorActorID   string   `json:"supervisorActorId"`
	PhotoMediaRef       string   `json:"photoMediaRef"`
	DocumentMediaRefs   []string `json:"documentMediaRefs"`
}

type CreateCaptainInput struct {
	FullNameAr          string   `json:"fullNameAr"`
	FullNameEn          string   `json:"fullNameEn"`
	PhoneE164           string   `json:"phoneE164"`
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
	ShiftCode           *string `json:"shiftCode"`
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
	PhoneE164           string   `json:"phoneE164"`
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

// UpdateSelfInput carries the only fields a provider may edit about
// themselves. Everything sovereign (name, code, status, shift, city,
// supervisor) is operator-owned and rejected at the contract level.
type UpdateSelfInput struct {
	PhotoMediaRef         *string `json:"photoMediaRef"`
	EmergencyContactName  *string `json:"emergencyContactName"`
	EmergencyContactPhone *string `json:"emergencyContactPhone"`
	PreferredLanguage     *string `json:"preferredLanguage"`
	PolicyConsent         *bool   `json:"policyConsent"`
}

// MeView is the provider-facing projection returned by GET /workforce/me.
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
