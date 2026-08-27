package workforce

// These payloads are durable command data, not a second business authority.
// They contain only the canonical Workforce input plus the already-authorized
// DSH-derived city code needed to rebuild a local projection after restart.
type fieldIdentityBoundaryPayload struct {
	Input    CreateFieldAgentInput `json:"input"`
	CityCode string                `json:"cityCode"`
}

type captainIdentityBoundaryPayload struct {
	Input    CreateCaptainInput `json:"input"`
	CityCode string             `json:"cityCode"`
}

type employeeIdentityBoundaryPayload struct {
	Input            CreateEmployeeInput `json:"input"`
	PermissionBundle string              `json:"permissionBundle"`
}
