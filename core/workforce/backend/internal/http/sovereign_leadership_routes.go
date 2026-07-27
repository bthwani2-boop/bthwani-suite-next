package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

type sovereignLeadershipServer struct {
	service *workforce.Service
	repo    *workforce.Repository
	auth    *auth.Client
}

func RegisterSovereignLeadershipRoutes(handler http.Handler, service *workforce.Service, repo *workforce.Repository, authClient *auth.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("sovereign leadership routes require *http.ServeMux")
	}
	s := &sovereignLeadershipServer{service: service, repo: repo, auth: authClient}
	mux.HandleFunc("GET /workforce/sovereign-leadership", s.withIdentity(s.listLeadership))
	mux.HandleFunc("POST /workforce/sovereign-leadership", s.withIdentity(s.createLeadership))
	mux.HandleFunc("GET /workforce/department-employees", s.withIdentity(s.listDepartmentEmployees))
	mux.HandleFunc("POST /workforce/department-employees", s.withIdentity(s.createDepartmentEmployee))
	mux.HandleFunc("GET /workforce/department-employees/{actorId}", s.withIdentity(s.getDepartmentEmployee))
	mux.HandleFunc("PATCH /workforce/department-employees/{actorId}", s.withIdentity(s.updateDepartmentEmployee))
	mux.HandleFunc("POST /workforce/department-employees/{actorId}/suspend", s.withIdentity(s.suspendDepartmentEmployee))
	mux.HandleFunc("POST /workforce/department-employees/{actorId}/reactivate", s.withIdentity(s.reactivateDepartmentEmployee))
	mux.HandleFunc("POST /workforce/department-employees/{actorId}/activation-codes", s.withIdentity(s.issueDepartmentEmployeeActivation))
	mux.HandleFunc("DELETE /workforce/department-employees/{actorId}/activation-codes", s.withIdentity(s.revokeDepartmentEmployeeActivation))
}

func (s *sovereignLeadershipServer) withIdentity(next guardedHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identity, err := s.auth.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			if errors.Is(err, auth.ErrIdentityUnavailable) {
				sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
				return
			}
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
			return
		}
		next(w, r, identity)
	}
}

func hasWorkforceScope(identity auth.Identity, action, department string) bool {
	if identity.HasPermission("workforce", action, "all") {
		return true
	}
	department = normalizeDepartmentScope(department)
	return department != "" && identity.HasPermission("workforce", action, "department:"+department)
}

func normalizeDepartmentScope(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	return strings.ReplaceAll(value, " ", "-")
}

func departmentsForAction(identity auth.Identity, action string) []string {
	departments := []string{}
	seen := map[string]struct{}{}
	for _, permission := range identity.Permissions {
		if permission.Service != "workforce" || permission.Action != action || !strings.HasPrefix(permission.Scope, "department:") {
			continue
		}
		department := strings.TrimPrefix(permission.Scope, "department:")
		if department == "" {
			continue
		}
		if _, ok := seen[department]; ok {
			continue
		}
		seen[department] = struct{}{}
		departments = append(departments, department)
	}
	return departments
}

func employeeDepartment(person workforce.Person) string {
	if person.EmployeeProfile == nil {
		return ""
	}
	return normalizeDepartmentScope(person.EmployeeProfile.Department)
}

func requireEmployeeTarget(w http.ResponseWriter, identity auth.Identity, action string, person workforce.Person) bool {
	department := employeeDepartment(person)
	if department == "" || !hasWorkforceScope(identity, action, department) {
		sendError(w, http.StatusForbidden, "EMPLOYEE_SCOPE_FORBIDDEN", "employee is outside the caller department scope")
		return false
	}
	return true
}

func (s *sovereignLeadershipServer) listLeadership(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	if !identity.HasPermission("workforce", "leadership:read", "all") {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "sovereign leadership read permission is required")
		return
	}
	records, err := s.repo.ListSovereignLeadership(r.Context())
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"leadership": records})
}

func (s *sovereignLeadershipServer) createLeadership(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	if !identity.HasPermission("workforce", "leadership:create", "all") {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "only the project manager may create sovereign leadership assignments")
		return
	}
	var input workforce.CreateSovereignLeaderInput
	if !decodeJSON(w, r, &input) {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
		return
	}
	result, replayed, err := s.service.CreateSovereignLeader(r.Context(), operatorOf(r, identity), input,
		idempotencyKey, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	sendJSON(w, status, result)
}

func (s *sovereignLeadershipServer) listDepartmentEmployees(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	departments := []string(nil)
	if !identity.HasPermission("workforce", "employee:read", "all") {
		departments = departmentsForAction(identity, "employee:read")
		if len(departments) == 0 {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "employee read permission is required")
			return
		}
	}
	query := r.URL.Query()
	limit, _ := strconv.Atoi(query.Get("limit"))
	offset, _ := strconv.Atoi(query.Get("offset"))
	people, err := s.repo.ListEmployeesForDepartments(r.Context(), departments, workforce.ListFilter{
		Status: strings.TrimSpace(query.Get("status")), Query: strings.TrimSpace(query.Get("q")),
		Limit: limit, Offset: offset,
	})
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"employees": people})
}

func (s *sovereignLeadershipServer) createDepartmentEmployee(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.CreateEmployeeInput
	if !decodeJSON(w, r, &input) {
		return
	}
	if !hasWorkforceScope(identity, "employee:create", input.Department) {
		sendError(w, http.StatusForbidden, "EMPLOYEE_SCOPE_FORBIDDEN", "employee creation is limited to the caller department")
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
		return
	}
	result, replayed, err := s.service.CreateDepartmentEmployee(r.Context(), operatorOf(r, identity), input,
		idempotencyKey, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	sendJSON(w, status, result)
}

func (s *sovereignLeadershipServer) getDepartmentEmployee(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	person, err := s.service.EmployeeByID(r.Context(), strings.TrimSpace(r.PathValue("actorId")))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	if !requireEmployeeTarget(w, identity, "employee:read", person.Person) {
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func (s *sovereignLeadershipServer) updateDepartmentEmployee(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	current, err := s.repo.PersonByActorID(r.Context(), actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	if !requireEmployeeTarget(w, identity, "employee:update", current) {
		return
	}
	var input workforce.UpdateEmployeeInput
	if !decodeJSON(w, r, &input) {
		return
	}
	if input.Department != nil && !hasWorkforceScope(identity, "employee:update", *input.Department) {
		sendError(w, http.StatusForbidden, "EMPLOYEE_SCOPE_FORBIDDEN", "employee cannot be moved outside the caller department scope")
		return
	}
	person, err := s.service.UpdateEmployee(r.Context(), operatorOf(r, identity), actorID, input, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func decodeStatusChange(w http.ResponseWriter, r *http.Request) (int, string, bool) {
	var input struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if !decodeJSON(w, r, &input) {
		return 0, "", false
	}
	return input.ExpectedVersion, input.Reason, true
}

func (s *sovereignLeadershipServer) suspendDepartmentEmployee(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	s.changeDepartmentEmployeeStatus(w, r, identity, "employee:suspend", true)
}

func (s *sovereignLeadershipServer) reactivateDepartmentEmployee(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	s.changeDepartmentEmployeeStatus(w, r, identity, "employee:reactivate", false)
}

func (s *sovereignLeadershipServer) changeDepartmentEmployeeStatus(w http.ResponseWriter, r *http.Request, identity auth.Identity, action string, suspend bool) {
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	current, err := s.repo.PersonByActorID(r.Context(), actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	if !requireEmployeeTarget(w, identity, action, current) {
		return
	}
	expectedVersion, reason, ok := decodeStatusChange(w, r)
	if !ok {
		return
	}
	var person workforce.Person
	if suspend {
		person, err = s.service.Suspend(r.Context(), operatorOf(r, identity), actorID, expectedVersion, reason, r.Header.Get("X-Correlation-ID"))
	} else {
		person, err = s.service.Reactivate(r.Context(), operatorOf(r, identity), actorID, expectedVersion, reason, r.Header.Get("X-Correlation-ID"))
	}
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func (s *sovereignLeadershipServer) issueDepartmentEmployeeActivation(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	current, err := s.repo.PersonByActorID(r.Context(), actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	if !requireEmployeeTarget(w, identity, "employee.activation:issue", current) {
		return
	}
	var input struct { ExpectedVersion int `json:"expectedVersion"` }
	if !decodeJSON(w, r, &input) {
		return
	}
	code, err := s.service.IssueActivation(r.Context(), operatorOf(r, identity), actorID, input.ExpectedVersion,
		"employee", "webapp", r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, code)
}

func (s *sovereignLeadershipServer) revokeDepartmentEmployeeActivation(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	current, err := s.repo.PersonByActorID(r.Context(), actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	if !requireEmployeeTarget(w, identity, "employee.activation:issue", current) {
		return
	}
	if err := s.service.RevokeActivation(r.Context(), operatorOf(r, identity), actorID, r.Header.Get("X-Correlation-ID")); err != nil {
		writeWorkforceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
