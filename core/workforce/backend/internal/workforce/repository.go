package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
	"workforce-api/internal/auth"
)

var (
	ErrNotFound                = errors.New("workforce person not found")
	ErrVersionConflict         = errors.New("version conflict")
	ErrDuplicateWorkforceCode  = errors.New("workforce code already used")
	ErrInvalidReference        = errors.New("invalid reference code")
	ErrIdempotencyConflict     = errors.New("idempotency key reused with different request")
	ErrReferenceInUse          = errors.New("reference code is in use")
	ErrReferenceExists         = errors.New("reference code already exists")
	ErrOperatorContextRequired = errors.New("authoritative operator context is required")
)

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

func operatorContextID(ctx context.Context) (string, error) {
	operatorContextID, ok := auth.OperatorContextIDFromContext(ctx)
	if !ok {
		return "", ErrOperatorContextRequired
	}
	return operatorContextID, nil
}

func (r *Repository) DB() *sql.DB { return r.db }

// ---- idempotency (replay-capable, mirroring dsh_store_idempotency) ----

// IdempotentReplay returns the stored response for (actorID, operation, key)
// when the same request was already completed. A key reuse with a different
// request hash is a client bug and fails loudly.
func (r *Repository) IdempotentReplay(ctx context.Context, actorID, operation, key, requestHash string) ([]byte, bool, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return nil, false, err
	}
	if key == "" {
		return nil, false, nil
	}
	var storedHash string
	var response []byte
	err = r.db.QueryRowContext(ctx, `
		SELECT request_hash, response_body FROM workforce_idempotency
		WHERE operator_context_id = $1 AND actor_id = $2 AND operation = $3 AND idempotency_key = $4`,
		operatorContextID, actorID, operation, key).Scan(&storedHash, &response)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	if storedHash != requestHash {
		return nil, false, ErrIdempotencyConflict
	}
	return response, true, nil
}

// ---- audit (mirroring dsh_store_action_audit) ----

func marshalNullable(state any) (any, error) {
	if state == nil {
		return nil, nil
	}
	encoded, err := json.Marshal(state)
	if err != nil {
		return nil, err
	}
	return string(encoded), nil
}

// NextWorkforceCode draws a server-generated, human-readable provider code
// from a per-kind sequence (FLD-000123 / CAP-000124 / EMP-000125). Existing legacy codes
// are never reformatted; this only mints codes for new rows going forward.
func (r *Repository) NextWorkforceCode(ctx context.Context, kind string) (string, error) {
	var seq, prefix string
	switch kind {
	case "field":
		seq, prefix = "workforce_field_code_seq", "FLD-"
	case "captain":
		seq, prefix = "workforce_captain_code_seq", "CAP-"
	case "employee":
		seq, prefix = "workforce_employee_code_seq", "EMP-"
	default:
		return "", ErrInvalidInput
	}
	var code string
	err := r.db.QueryRowContext(ctx,
		`SELECT $1 || lpad(nextval('`+seq+`')::text, 6, '0')`, prefix).Scan(&code)
	return code, err
}

func (r *Repository) PersonByActorID(ctx context.Context, actorID string) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	row := r.db.QueryRowContext(ctx, personSelect+` WHERE p.operator_context_id = $1 AND p.actor_id = $2`, operatorContextID, actorID)
	person, err := scanPerson(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	return person, err
}

const personSelect = `
	SELECT p.actor_id, p.operator_context_id, p.full_name_ar, COALESCE(p.full_name_en, ''), p.workforce_code, p.workforce_kind,
	       p.engagement_type, COALESCE(p.engagement_start_date::text, ''), p.engagement_status,
	       COALESCE(p.photo_media_ref, ''), p.version, p.created_at, p.updated_at,
	       COALESCE(f.city_code, ''), COALESCE(f.service_zone_id, ''), COALESCE(f.supervisor_actor_id, ''),
	       COALESCE(f.emergency_contact_name, ''), COALESCE(f.emergency_contact_phone, ''),
	       COALESCE(f.preferred_language, ''), COALESCE(f.policy_consent_at::text, ''),
	       COALESCE(f.document_media_refs, '[]'::jsonb), f.actor_id IS NOT NULL,
	       COALESCE(c.vehicle_type, ''), COALESCE(c.vehicle_identifier, ''), COALESCE(c.license_status, ''),
	       COALESCE(c.license_expires_at::text, ''), COALESCE(c.operating_city_code, ''), COALESCE(c.service_zone_id, ''),
	       COALESCE(c.operating_scope_code, ''), COALESCE(c.supervisor_actor_id, ''),
	       COALESCE(c.document_media_refs, '[]'::jsonb), c.actor_id IS NOT NULL,
	       COALESCE(e.department, ''), COALESCE(e.role, ''), COALESCE(e.supervisor_actor_id, ''), COALESCE(e.office_location, ''),
	       COALESCE(e.document_media_refs, '[]'::jsonb), e.actor_id IS NOT NULL
	FROM workforce_people p
	LEFT JOIN workforce_field_profiles f ON f.operator_context_id = p.operator_context_id AND f.actor_id = p.actor_id
	LEFT JOIN workforce_captain_profiles c ON c.operator_context_id = p.operator_context_id AND c.actor_id = p.actor_id
	LEFT JOIN workforce_employee_profiles e ON e.operator_context_id = p.operator_context_id AND e.actor_id = p.actor_id`

type rowScanner interface{ Scan(dest ...any) error }

func scanPerson(row rowScanner) (Person, error) {
	var person Person
	profile := FieldProfile{}
	captainProfile := CaptainProfile{}
	employeeProfile := EmployeeProfile{}
	var documentsJSON []byte
	var captainDocumentsJSON []byte
	var employeeDocumentsJSON []byte
	var hasFieldProfile bool
	var hasCaptainProfile bool
	var hasEmployeeProfile bool
	err := row.Scan(
		&person.ActorID, &person.OperatorContextID, &person.FullNameAr, &person.FullNameEn, &person.WorkforceCode, &person.WorkforceKind,
		&person.EngagementType, &person.EngagementStartDate, &person.EngagementStatus,
		&person.PhotoMediaRef, &person.Version, &person.CreatedAt, &person.UpdatedAt,
		&profile.CityCode, &profile.ServiceZoneID, &profile.SupervisorActorID,
		&profile.EmergencyContactName, &profile.EmergencyContactPhone,
		&profile.PreferredLanguage, &profile.PolicyConsentAt, &documentsJSON, &hasFieldProfile,
		&captainProfile.VehicleType, &captainProfile.VehicleIdentifier, &captainProfile.LicenseStatus,
		&captainProfile.LicenseExpiresAt, &captainProfile.OperatingCityCode, &captainProfile.ServiceZoneID,
		&captainProfile.OperatingScopeCode, &captainProfile.SupervisorActorID, &captainDocumentsJSON, &hasCaptainProfile,
		&employeeProfile.Department, &employeeProfile.Role, &employeeProfile.SupervisorActorID, &employeeProfile.OfficeLocation,
		&employeeDocumentsJSON, &hasEmployeeProfile,
	)
	if err != nil {
		return Person{}, err
	}
	if err := json.Unmarshal(documentsJSON, &profile.DocumentMediaRefs); err != nil {
		return Person{}, err
	}
	if profile.DocumentMediaRefs == nil {
		profile.DocumentMediaRefs = []string{}
	}
	if hasFieldProfile {
		person.FieldProfile = &profile
	}
	if err := json.Unmarshal(captainDocumentsJSON, &captainProfile.DocumentMediaRefs); err != nil {
		return Person{}, err
	}
	if captainProfile.DocumentMediaRefs == nil {
		captainProfile.DocumentMediaRefs = []string{}
	}
	if hasCaptainProfile {
		if captainProfile.LicenseStatus == "valid" && !isLicenseNotExpired(captainProfile.LicenseExpiresAt) {
			captainProfile.LicenseStatus = "expired"
		}
		person.CaptainProfile = &captainProfile
	}
	if err := json.Unmarshal(employeeDocumentsJSON, &employeeProfile.DocumentMediaRefs); err != nil {
		return Person{}, err
	}
	if employeeProfile.DocumentMediaRefs == nil {
		employeeProfile.DocumentMediaRefs = []string{}
	}
	if hasEmployeeProfile {
		person.EmployeeProfile = &employeeProfile
	}
	return person, nil
}

func (r *Repository) ListPeople(ctx context.Context, filter ListFilter) ([]Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	clauses := []string{"p.operator_context_id = $1"}
	args := []any{operatorContextID}
	if filter.Status != "" {
		args = append(args, filter.Status)
		clauses = append(clauses, fmt.Sprintf("p.engagement_status = $%d", len(args)))
	}
	if filter.CityCode != "" {
		args = append(args, filter.CityCode)
		clauses = append(clauses, fmt.Sprintf("f.city_code = $%d", len(args)))
	}
	if filter.Query != "" {
		args = append(args, "%"+strings.TrimSpace(filter.Query)+"%")
		clauses = append(clauses, fmt.Sprintf(
			"(p.full_name_ar ILIKE $%d OR COALESCE(p.full_name_en,'') ILIKE $%d OR p.workforce_code ILIKE $%d)",
			len(args), len(args), len(args)))
	}
	if filter.WorkforceKind == "field" {
		clauses = append(clauses, "f.actor_id IS NOT NULL")
	}
	if filter.WorkforceKind == "captain" {
		clauses = append(clauses, "c.actor_id IS NOT NULL")
	}
	if filter.WorkforceKind == "employee" {
		clauses = append(clauses, "e.actor_id IS NOT NULL")
	}
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	args = append(args, limit)
	limitPos := len(args)
	args = append(args, max(filter.Offset, 0))
	offsetPos := len(args)

	query := personSelect + ` WHERE ` + strings.Join(clauses, " AND ") +
		fmt.Sprintf(` ORDER BY p.created_at DESC LIMIT $%d OFFSET $%d`, limitPos, offsetPos)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	people := []Person{}
	for rows.Next() {
		person, err := scanPerson(rows)
		if err != nil {
			return nil, err
		}
		people = append(people, person)
	}
	return people, rows.Err()
}

func (r *Repository) ListCaptains(ctx context.Context, filter ListFilter) ([]Person, error) {
	filter.WorkforceKind = "captain"
	return r.ListPeople(ctx, filter)
}

func (r *Repository) ListEmployees(ctx context.Context, filter ListFilter) ([]Person, error) {
	filter.WorkforceKind = "employee"
	return r.ListPeople(ctx, filter)
}

// MarkActiveIfPending performs the lazy pending_activation→active transition
// once a provider proves possession of a valid session (activation worked).
func (r *Repository) MarkActiveIfPending(ctx context.Context, actorID string) error {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		UPDATE workforce_people
		SET engagement_status = 'active', version = version + 1, updated_at = now()
		WHERE operator_context_id = $1 AND actor_id = $2 AND engagement_status = 'pending_activation'`, operatorContextID, actorID)
	return err
}

// ---- reference data ----

// EnsureCity materializes display/reference metadata for the city code returned
// by a DSH-owned platform zone. DSH zone validation is the operational gate;
// workforce_cities.active is local presentation state and never authorizes or
// blocks a field/captain service-zone assignment.
func (r *Repository) EnsureCity(ctx context.Context, code, nameAr string) error {
	if code == "" {
		return nil
	}
	if nameAr == "" {
		nameAr = code
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO workforce_cities (code, name_ar)
		VALUES ($1, $2)
		ON CONFLICT (code) DO NOTHING`, code, nameAr)
	return err
}

func (r *Repository) ListCities(ctx context.Context, includeInactive bool) ([]City, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT code, name_ar, COALESCE(name_en, ''), active FROM workforce_cities
		WHERE active OR $1 ORDER BY code`, includeInactive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cities := []City{}
	for rows.Next() {
		var city City
		if err := rows.Scan(&city.Code, &city.NameAr, &city.NameEn, &city.Active); err != nil {
			return nil, err
		}
		cities = append(cities, city)
	}
	return cities, rows.Err()
}

func (r *Repository) UpsertCity(ctx context.Context, city City, create bool) error {
	if create {
		_, err := r.db.ExecContext(ctx, `
			INSERT INTO workforce_cities (code, name_ar, name_en, active)
			VALUES ($1, $2, NULLIF($3, ''), $4)`, city.Code, city.NameAr, city.NameEn, city.Active)
		return mapReferenceWriteError(err)
	}
	result, err := r.db.ExecContext(ctx, `
		UPDATE workforce_cities SET name_ar = $2, name_en = NULLIF($3, ''), active = $4, updated_at = now()
		WHERE code = $1`, city.Code, city.NameAr, city.NameEn, city.Active)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) ListShifts(ctx context.Context, includeInactive bool) ([]Shift, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT code, name_ar, COALESCE(name_en, ''), COALESCE(starts_at::text, ''), COALESCE(ends_at::text, ''), active
		FROM workforce_shifts
		WHERE active OR $1 ORDER BY code`, includeInactive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	shifts := []Shift{}
	for rows.Next() {
		var shift Shift
		if err := rows.Scan(&shift.Code, &shift.NameAr, &shift.NameEn, &shift.StartsAt, &shift.EndsAt, &shift.Active); err != nil {
			return nil, err
		}
		shifts = append(shifts, shift)
	}
	return shifts, rows.Err()
}

func (r *Repository) UpsertShift(ctx context.Context, shift Shift, create bool) error {
	if create {
		_, err := r.db.ExecContext(ctx, `
			INSERT INTO workforce_shifts (code, name_ar, name_en, starts_at, ends_at, active)
			VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, '')::time, NULLIF($5, '')::time, $6)`,
			shift.Code, shift.NameAr, shift.NameEn, shift.StartsAt, shift.EndsAt, shift.Active)
		return mapReferenceWriteError(err)
	}
	result, err := r.db.ExecContext(ctx, `
		UPDATE workforce_shifts SET name_ar = $2, name_en = NULLIF($3, ''),
			starts_at = NULLIF($4, '')::time, ends_at = NULLIF($5, '')::time, active = $6, updated_at = now()
		WHERE code = $1`, shift.Code, shift.NameAr, shift.NameEn, shift.StartsAt, shift.EndsAt, shift.Active)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ---- helpers ----

// validateProjectedCityTx verifies that the DSH-derived city code has a local
// projection row for referential integrity. It deliberately ignores the local
// active flag: DSH ValidateZone is the sole authority for zone availability.
func validateProjectedCityTx(ctx context.Context, tx *sql.Tx, code string) error {
	if code == "" {
		return nil
	}
	var exists bool
	if err := tx.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM workforce_cities WHERE code = $1)`, code).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrInvalidReference
	}
	return nil
}

func mapPersonWriteError(err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		switch pqErr.Code {
		case "23505":
			if strings.Contains(pqErr.Constraint, "workforce_code") {
				return ErrDuplicateWorkforceCode
			}
		case "23503", "23514":
			return ErrInvalidReference
		}
	}
	return err
}

func mapReferenceWriteError(err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code == "23505" {
		return ErrReferenceExists
	}
	return err
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func nonNil(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}
