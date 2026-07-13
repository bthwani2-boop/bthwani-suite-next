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
)

var (
	ErrNotFound              = errors.New("workforce person not found")
	ErrVersionConflict       = errors.New("version conflict")
	ErrDuplicateProviderCode = errors.New("provider code already used")
	ErrInvalidReference      = errors.New("invalid reference code")
	ErrIdempotencyConflict   = errors.New("idempotency key reused with different request")
	ErrReferenceInUse        = errors.New("reference code is in use")
	ErrReferenceExists       = errors.New("reference code already exists")
)

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

func (r *Repository) DB() *sql.DB { return r.db }

// ---- idempotency (replay-capable, mirroring dsh_store_idempotency) ----

// IdempotentReplay returns the stored response for (actorID, operation, key)
// when the same request was already completed. A key reuse with a different
// request hash is a client bug and fails loudly.
func (r *Repository) IdempotentReplay(ctx context.Context, actorID, operation, key, requestHash string) ([]byte, bool, error) {
	if key == "" {
		return nil, false, nil
	}
	var storedHash string
	var response []byte
	err := r.db.QueryRowContext(ctx, `
		SELECT request_hash, response_body FROM workforce_idempotency
		WHERE actor_id = $1 AND operation = $2 AND idempotency_key = $3`,
		actorID, operation, key).Scan(&storedHash, &response)
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

func (r *Repository) StoreIdempotentResponse(ctx context.Context, actorID, operation, key, requestHash string, response []byte) error {
	if key == "" {
		return nil
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO workforce_idempotency (actor_id, operation, idempotency_key, request_hash, response_body)
		VALUES ($1, $2, $3, $4, $5::jsonb)
		ON CONFLICT (actor_id, operation, idempotency_key) DO NOTHING`,
		actorID, operation, key, requestHash, string(response))
	return err
}

// ---- audit (mirroring dsh_store_action_audit) ----

// RecordAudit is best-effort for reads but called inside the write paths;
// failures propagate so a state change is never silently unaudited.
func (r *Repository) RecordAudit(ctx context.Context, actorID, actorRole, targetActorID, action string, fromState, toState any, reason, correlationID string) error {
	fromJSON, err := marshalNullable(fromState)
	if err != nil {
		return err
	}
	toJSON, err := marshalNullable(toState)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO workforce_action_audit
			(actor_id, actor_role, target_actor_id, action, from_state, to_state, reason, correlation_id)
		VALUES ($1, $2, NULLIF($3, ''), $4, $5::jsonb, $6::jsonb, NULLIF($7, ''), NULLIF($8, ''))`,
		actorID, actorRole, targetActorID, action, fromJSON, toJSON, reason, correlationID)
	return err
}

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

// ---- people ----

func (r *Repository) CreatePerson(ctx context.Context, actorID, providerCode, cityCode string, input CreateFieldAgentInput) (Person, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Person{}, err
	}
	defer tx.Rollback()

	if err := validateReferenceTx(ctx, tx, "workforce_cities", cityCode); err != nil {
		return Person{}, err
	}
	if err := validateReferenceTx(ctx, tx, "workforce_shifts", input.ShiftCode); err != nil {
		return Person{}, err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO workforce_people
			(actor_id, full_name_ar, full_name_en, provider_code, provider_kind, engagement_type, engagement_start_date, photo_media_ref)
		VALUES ($1, $2, NULLIF($3, ''), $4, 'field', $5, NULLIF($6, '')::date, NULLIF($7, ''))
		ON CONFLICT (actor_id) DO NOTHING`,
		actorID, input.FullNameAr, input.FullNameEn, providerCode,
		input.EngagementType, input.EngagementStartDate, input.PhotoMediaRef)
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}

	documents, err := json.Marshal(nonNil(input.DocumentMediaRefs))
	if err != nil {
		return Person{}, err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO workforce_field_profiles
			(actor_id, city_code, service_zone_id, shift_code, supervisor_actor_id, document_media_refs)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), $6::jsonb)`,
		actorID, cityCode, input.ServiceZoneID, input.ShiftCode, input.SupervisorActorID, string(documents))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	if err := tx.Commit(); err != nil {
		return Person{}, err
	}
	return r.PersonByActorID(ctx, actorID)
}

func (r *Repository) CreateCaptain(ctx context.Context, actorID, providerCode, cityCode string, input CreateCaptainInput) (Person, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Person{}, err
	}
	defer tx.Rollback()

	if err := validateReferenceTx(ctx, tx, "workforce_cities", cityCode); err != nil {
		return Person{}, err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO workforce_people
			(actor_id, full_name_ar, full_name_en, provider_code, provider_kind, engagement_type, engagement_start_date, photo_media_ref)
		VALUES ($1, $2, NULLIF($3, ''), $4, 'captain', $5, NULLIF($6, '')::date, NULLIF($7, ''))
		ON CONFLICT (actor_id) DO NOTHING`,
		actorID, input.FullNameAr, input.FullNameEn, providerCode,
		input.EngagementType, input.EngagementStartDate, input.PhotoMediaRef)
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}

	documents, err := json.Marshal(nonNil(input.DocumentMediaRefs))
	if err != nil {
		return Person{}, err
	}
	licenseStatus := input.LicenseStatus
	if licenseStatus == "" {
		licenseStatus = "missing"
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO workforce_captain_profiles
			(actor_id, vehicle_type, vehicle_identifier, license_status, license_expires_at,
			 operating_city_code, service_zone_id, operating_scope_code, supervisor_actor_id, document_media_refs)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, NULLIF($5, '')::date,
			NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), $10::jsonb)`,
		actorID, input.VehicleType, input.VehicleIdentifier, licenseStatus, input.LicenseExpiresAt,
		cityCode, input.ServiceZoneID, input.OperatingScopeCode, input.SupervisorActorID, string(documents))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	if err := tx.Commit(); err != nil {
		return Person{}, err
	}
	return r.PersonByActorID(ctx, actorID)
}

// NextProviderCode draws a server-generated, human-readable provider code
// from a per-kind sequence (FLD-000123 / CAP-000124). Existing legacy codes
// are never reformatted; this only mints codes for new rows going forward.
func (r *Repository) NextProviderCode(ctx context.Context, kind string) (string, error) {
	var seq, prefix string
	switch kind {
	case "field":
		seq, prefix = "workforce_field_code_seq", "FLD-"
	case "captain":
		seq, prefix = "workforce_captain_code_seq", "CAP-"
	default:
		return "", ErrInvalidInput
	}
	var code string
	err := r.db.QueryRowContext(ctx,
		`SELECT $1 || lpad(nextval('`+seq+`')::text, 6, '0')`, prefix).Scan(&code)
	return code, err
}

func (r *Repository) PersonByActorID(ctx context.Context, actorID string) (Person, error) {
	row := r.db.QueryRowContext(ctx, personSelect+` WHERE p.actor_id = $1`, actorID)
	person, err := scanPerson(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	return person, err
}

const personSelect = `
	SELECT p.actor_id, p.full_name_ar, COALESCE(p.full_name_en, ''), p.provider_code, p.provider_kind,
	       p.engagement_type, COALESCE(p.engagement_start_date::text, ''), p.engagement_status,
	       COALESCE(p.photo_media_ref, ''), p.version, p.created_at, p.updated_at,
	       COALESCE(f.city_code, ''), COALESCE(f.service_zone_id, ''), COALESCE(f.shift_code, ''), COALESCE(f.supervisor_actor_id, ''),
	       COALESCE(f.emergency_contact_name, ''), COALESCE(f.emergency_contact_phone, ''),
	       COALESCE(f.preferred_language, ''), COALESCE(f.policy_consent_at::text, ''),
	       COALESCE(f.document_media_refs, '[]'::jsonb), f.actor_id IS NOT NULL,
	       COALESCE(c.vehicle_type, ''), COALESCE(c.vehicle_identifier, ''), COALESCE(c.license_status, ''),
	       COALESCE(c.license_expires_at::text, ''), COALESCE(c.operating_city_code, ''), COALESCE(c.service_zone_id, ''),
	       COALESCE(c.operating_scope_code, ''), COALESCE(c.supervisor_actor_id, ''),
	       COALESCE(c.document_media_refs, '[]'::jsonb), c.actor_id IS NOT NULL
	FROM workforce_people p
	LEFT JOIN workforce_field_profiles f ON f.actor_id = p.actor_id
	LEFT JOIN workforce_captain_profiles c ON c.actor_id = p.actor_id`

type rowScanner interface{ Scan(dest ...any) error }

func scanPerson(row rowScanner) (Person, error) {
	var person Person
	profile := FieldProfile{}
	captainProfile := CaptainProfile{}
	var documentsJSON []byte
	var captainDocumentsJSON []byte
	var hasFieldProfile bool
	var hasCaptainProfile bool
	err := row.Scan(
		&person.ActorID, &person.FullNameAr, &person.FullNameEn, &person.ProviderCode, &person.ProviderKind,
		&person.EngagementType, &person.EngagementStartDate, &person.EngagementStatus,
		&person.PhotoMediaRef, &person.Version, &person.CreatedAt, &person.UpdatedAt,
		&profile.CityCode, &profile.ServiceZoneID, &profile.ShiftCode, &profile.SupervisorActorID,
		&profile.EmergencyContactName, &profile.EmergencyContactPhone,
		&profile.PreferredLanguage, &profile.PolicyConsentAt, &documentsJSON, &hasFieldProfile,
		&captainProfile.VehicleType, &captainProfile.VehicleIdentifier, &captainProfile.LicenseStatus,
		&captainProfile.LicenseExpiresAt, &captainProfile.OperatingCityCode, &captainProfile.ServiceZoneID,
		&captainProfile.OperatingScopeCode, &captainProfile.SupervisorActorID, &captainDocumentsJSON, &hasCaptainProfile,
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
	return person, nil
}

func (r *Repository) ListPeople(ctx context.Context, filter ListFilter) ([]Person, error) {
	clauses := []string{"1=1"}
	args := []any{}
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
			"(p.full_name_ar ILIKE $%d OR COALESCE(p.full_name_en,'') ILIKE $%d OR p.provider_code ILIKE $%d)",
			len(args), len(args), len(args)))
	}
	if filter.ProviderKind == "field" {
		clauses = append(clauses, "f.actor_id IS NOT NULL")
	}
	if filter.ProviderKind == "captain" {
		clauses = append(clauses, "c.actor_id IS NOT NULL")
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
	filter.ProviderKind = "captain"
	return r.ListPeople(ctx, filter)
}

// UpdatePerson applies sovereign edits with optimistic locking: the UPDATE is
// version-guarded and bumps the version, so a stale expectedVersion never
// silently overwrites a newer edit.
func (r *Repository) UpdatePerson(ctx context.Context, actorID string, derivedCityCode *string, input UpdateFieldAgentInput) (Person, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Person{}, err
	}
	defer tx.Rollback()

	var currentVersion int
	err = tx.QueryRowContext(ctx, `
		SELECT version FROM workforce_people WHERE actor_id = $1 FOR UPDATE`, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	if err != nil {
		return Person{}, err
	}
	if currentVersion != input.ExpectedVersion {
		return Person{}, ErrVersionConflict
	}

	if derivedCityCode != nil {
		if err := validateReferenceTx(ctx, tx, "workforce_cities", *derivedCityCode); err != nil {
			return Person{}, err
		}
	}
	if input.ShiftCode != nil {
		if err := validateReferenceTx(ctx, tx, "workforce_shifts", *input.ShiftCode); err != nil {
			return Person{}, err
		}
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE workforce_people SET
			full_name_ar = COALESCE($2, full_name_ar),
			full_name_en = COALESCE(NULLIF($3, ''), full_name_en),
			engagement_type = COALESCE($4, engagement_type),
			engagement_start_date = COALESCE(NULLIF($5, '')::date, engagement_start_date),
			photo_media_ref = COALESCE(NULLIF($6, ''), photo_media_ref),
			version = version + 1,
			updated_at = now()
		WHERE actor_id = $1`,
		actorID, input.FullNameAr, deref(input.FullNameEn),
		input.EngagementType, deref(input.EngagementStartDate), deref(input.PhotoMediaRef))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	_, err = tx.ExecContext(ctx, `
		UPDATE workforce_field_profiles SET
			city_code = COALESCE(NULLIF($2, ''), city_code),
			service_zone_id = COALESCE(NULLIF($3, ''), service_zone_id),
			shift_code = COALESCE(NULLIF($4, ''), shift_code),
			supervisor_actor_id = COALESCE(NULLIF($5, ''), supervisor_actor_id),
			updated_at = now()
		WHERE actor_id = $1`,
		actorID, deref(derivedCityCode), deref(input.ServiceZoneID), deref(input.ShiftCode), deref(input.SupervisorActorID))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	if err := tx.Commit(); err != nil {
		return Person{}, err
	}
	return r.PersonByActorID(ctx, actorID)
}

func (r *Repository) UpdateCaptain(ctx context.Context, actorID string, derivedCityCode *string, input UpdateCaptainInput) (Person, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Person{}, err
	}
	defer tx.Rollback()

	var currentVersion int
	err = tx.QueryRowContext(ctx, `
		SELECT version FROM workforce_people WHERE actor_id = $1 FOR UPDATE`, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	if err != nil {
		return Person{}, err
	}
	if currentVersion != input.ExpectedVersion {
		return Person{}, ErrVersionConflict
	}
	if derivedCityCode != nil {
		if err := validateReferenceTx(ctx, tx, "workforce_cities", *derivedCityCode); err != nil {
			return Person{}, err
		}
	}
	_, err = tx.ExecContext(ctx, `
		UPDATE workforce_people SET
			full_name_ar = COALESCE($2, full_name_ar),
			full_name_en = COALESCE(NULLIF($3, ''), full_name_en),
			engagement_type = COALESCE($4, engagement_type),
			engagement_start_date = COALESCE(NULLIF($5, '')::date, engagement_start_date),
			photo_media_ref = COALESCE(NULLIF($6, ''), photo_media_ref),
			version = version + 1,
			updated_at = now()
		WHERE actor_id = $1`,
		actorID, input.FullNameAr, deref(input.FullNameEn),
		input.EngagementType, deref(input.EngagementStartDate), deref(input.PhotoMediaRef))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	_, err = tx.ExecContext(ctx, `
		UPDATE workforce_captain_profiles SET
			vehicle_type = COALESCE(NULLIF($2, ''), vehicle_type),
			vehicle_identifier = COALESCE(NULLIF($3, ''), vehicle_identifier),
			license_status = COALESCE(NULLIF($4, ''), license_status),
			license_expires_at = COALESCE(NULLIF($5, '')::date, license_expires_at),
			operating_city_code = COALESCE(NULLIF($6, ''), operating_city_code),
			service_zone_id = COALESCE(NULLIF($7, ''), service_zone_id),
			operating_scope_code = COALESCE(NULLIF($8, ''), operating_scope_code),
			supervisor_actor_id = COALESCE(NULLIF($9, ''), supervisor_actor_id),
			updated_at = now()
		WHERE actor_id = $1`,
		actorID, deref(input.VehicleType), deref(input.VehicleIdentifier), deref(input.LicenseStatus),
		deref(input.LicenseExpiresAt), deref(derivedCityCode), deref(input.ServiceZoneID),
		deref(input.OperatingScopeCode), deref(input.SupervisorActorID))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	if err := tx.Commit(); err != nil {
		return Person{}, err
	}
	return r.PersonByActorID(ctx, actorID)
}

// UpdateSelf applies the provider's own (non-sovereign) edits. No version
// gate: these fields are only ever written by their owner.
func (r *Repository) UpdateSelf(ctx context.Context, actorID string, input UpdateSelfInput) (Person, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Person{}, err
	}
	defer tx.Rollback()

	if input.PhotoMediaRef != nil {
		if _, err = tx.ExecContext(ctx, `
			UPDATE workforce_people SET photo_media_ref = NULLIF($2, ''), updated_at = now()
			WHERE actor_id = $1`, actorID, *input.PhotoMediaRef); err != nil {
			return Person{}, err
		}
	}
	var hasFieldProfile bool
	if err := tx.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM workforce_field_profiles WHERE actor_id = $1)`, actorID).Scan(&hasFieldProfile); err != nil {
		return Person{}, err
	}
	if !hasFieldProfile {
		if input.EmergencyContactName != nil || input.EmergencyContactPhone != nil ||
			input.PreferredLanguage != nil || input.PolicyConsent != nil {
			return Person{}, ErrInvalidInput
		}
		if err := tx.Commit(); err != nil {
			return Person{}, err
		}
		return r.PersonByActorID(ctx, actorID)
	}
	consentClause := "policy_consent_at"
	if input.PolicyConsent != nil && *input.PolicyConsent {
		consentClause = "COALESCE(policy_consent_at, now())"
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE workforce_field_profiles SET
			emergency_contact_name = COALESCE(NULLIF($2, ''), emergency_contact_name),
			emergency_contact_phone = COALESCE(NULLIF($3, ''), emergency_contact_phone),
			preferred_language = COALESCE(NULLIF($4, ''), preferred_language),
			policy_consent_at = `+consentClause+`,
			updated_at = now()
		WHERE actor_id = $1`,
		actorID, deref(input.EmergencyContactName), deref(input.EmergencyContactPhone),
		deref(input.PreferredLanguage))
	if err != nil {
		return Person{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return Person{}, ErrNotFound
	}
	if err := tx.Commit(); err != nil {
		return Person{}, err
	}
	return r.PersonByActorID(ctx, actorID)
}

// SetEngagementStatus transitions engagement_status under the version guard
// and returns the refreshed person.
func (r *Repository) SetEngagementStatus(ctx context.Context, actorID, status string, expectedVersion int) (Person, error) {
	result, err := r.db.ExecContext(ctx, `
		UPDATE workforce_people
		SET engagement_status = $2, version = version + 1, updated_at = now()
		WHERE actor_id = $1 AND version = $3`, actorID, status, expectedVersion)
	if err != nil {
		return Person{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		if _, lookupErr := r.PersonByActorID(ctx, actorID); lookupErr != nil {
			return Person{}, lookupErr
		}
		return Person{}, ErrVersionConflict
	}
	return r.PersonByActorID(ctx, actorID)
}

// MarkActiveIfPending performs the lazy pending_activation→active transition
// once a provider proves possession of a valid session (activation worked).
func (r *Repository) MarkActiveIfPending(ctx context.Context, actorID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE workforce_people
		SET engagement_status = 'active', version = version + 1, updated_at = now()
		WHERE actor_id = $1 AND engagement_status = 'pending_activation'`, actorID)
	return err
}

// ---- reference data ----

// EnsureCity idempotently mirrors a DSH platform zone's city into
// workforce_cities so the existing FK on city_code/operating_city_code
// keeps working even though zone selection now happens in DSH, not here.
// It never overwrites an existing row (an operator-managed city always
// wins over an auto-mirrored one).
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

func validateReferenceTx(ctx context.Context, tx *sql.Tx, table, code string) error {
	if code == "" {
		return nil
	}
	var active bool
	err := tx.QueryRowContext(ctx,
		`SELECT active FROM `+table+` WHERE code = $1`, code).Scan(&active)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && !active) {
		return ErrInvalidReference
	}
	return err
}

func mapPersonWriteError(err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		switch pqErr.Code {
		case "23505":
			if strings.Contains(pqErr.Constraint, "provider_code") {
				return ErrDuplicateProviderCode
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
