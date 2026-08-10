package clientprofile

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrNotFound = errors.New("client profile not found")
	ErrConflict = errors.New("client profile version conflict")
)

type ClientProfile struct {
	ClientID              string    `json:"clientId"`
	Locale                string    `json:"locale"`
	CurrencyPreference    string    `json:"currencyPreference"`
	MarketingConsentEmail bool      `json:"marketingConsentEmail"`
	MarketingConsentSms   bool      `json:"marketingConsentSms"`
	MarketingConsentPush  bool      `json:"marketingConsentPush"`
	Version               int       `json:"version"`
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
}

type ClientProfilePreferencesInput struct {
	Locale             string `json:"locale"`
	CurrencyPreference string `json:"currencyPreference"`
	ExpectedVersion    int    `json:"expectedVersion"`
}

type ClientProfileConsentsInput struct {
	MarketingConsentEmail bool `json:"marketingConsentEmail"`
	MarketingConsentSms   bool `json:"marketingConsentSms"`
	MarketingConsentPush  bool `json:"marketingConsentPush"`
	ExpectedVersion       int  `json:"expectedVersion"`
}

func GetClientProfile(db *sql.DB, clientID string) (ClientProfile, error) {
	query := `
		SELECT client_id, locale, currency_preference, marketing_consent_email, marketing_consent_sms, marketing_consent_push, version, created_at, updated_at
		FROM dsh_client_profiles
		WHERE client_id = $1
	`
	var p ClientProfile
	err := db.QueryRow(query, clientID).Scan(
		&p.ClientID, &p.Locale, &p.CurrencyPreference,
		&p.MarketingConsentEmail, &p.MarketingConsentSms, &p.MarketingConsentPush,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// Profile might not exist yet
			return ClientProfile{}, ErrNotFound
		}
		return ClientProfile{}, err
	}
	return p, nil
}

func UpsertClientProfilePreferences(db *sql.DB, clientID string, input ClientProfilePreferencesInput) (ClientProfile, error) {
	tx, err := db.Begin()
	if err != nil {
		return ClientProfile{}, err
	}
	defer tx.Rollback()

	var currentVersion int
	err = tx.QueryRow(`SELECT version FROM dsh_client_profiles WHERE client_id = $1 FOR UPDATE`, clientID).Scan(&currentVersion)
	if err != nil && err != sql.ErrNoRows {
		return ClientProfile{}, err
	}

	isNew := err == sql.ErrNoRows
	if !isNew && input.ExpectedVersion > 0 && currentVersion != input.ExpectedVersion {
		return ClientProfile{}, ErrConflict
	}

	var p ClientProfile
	if isNew {
		err = tx.QueryRow(`
			INSERT INTO dsh_client_profiles (client_id, locale, currency_preference, version, created_at, updated_at)
			VALUES ($1, $2, $3, 1, NOW(), NOW())
			RETURNING client_id, locale, currency_preference, marketing_consent_email, marketing_consent_sms, marketing_consent_push, version, created_at, updated_at
		`, clientID, input.Locale, input.CurrencyPreference).Scan(
			&p.ClientID, &p.Locale, &p.CurrencyPreference,
			&p.MarketingConsentEmail, &p.MarketingConsentSms, &p.MarketingConsentPush,
			&p.Version, &p.CreatedAt, &p.UpdatedAt,
		)
		if err == nil {
			logEvent(tx, clientID, "created", 1, input)
		}
	} else {
		err = tx.QueryRow(`
			UPDATE dsh_client_profiles
			SET locale = $2, currency_preference = $3, version = version + 1, updated_at = NOW()
			WHERE client_id = $1
			RETURNING client_id, locale, currency_preference, marketing_consent_email, marketing_consent_sms, marketing_consent_push, version, created_at, updated_at
		`, clientID, input.Locale, input.CurrencyPreference).Scan(
			&p.ClientID, &p.Locale, &p.CurrencyPreference,
			&p.MarketingConsentEmail, &p.MarketingConsentSms, &p.MarketingConsentPush,
			&p.Version, &p.CreatedAt, &p.UpdatedAt,
		)
		if err == nil {
			logEvent(tx, clientID, "preferences_updated", p.Version, input)
		}
	}
	if err != nil {
		return ClientProfile{}, err
	}

	if err := tx.Commit(); err != nil {
		return ClientProfile{}, err
	}
	return p, nil
}

func UpsertClientProfileConsents(db *sql.DB, clientID string, input ClientProfileConsentsInput) (ClientProfile, error) {
	tx, err := db.Begin()
	if err != nil {
		return ClientProfile{}, err
	}
	defer tx.Rollback()

	var currentVersion int
	err = tx.QueryRow(`SELECT version FROM dsh_client_profiles WHERE client_id = $1 FOR UPDATE`, clientID).Scan(&currentVersion)
	if err != nil && err != sql.ErrNoRows {
		return ClientProfile{}, err
	}

	isNew := err == sql.ErrNoRows
	if !isNew && input.ExpectedVersion > 0 && currentVersion != input.ExpectedVersion {
		return ClientProfile{}, ErrConflict
	}

	var p ClientProfile
	if isNew {
		err = tx.QueryRow(`
			INSERT INTO dsh_client_profiles (client_id, marketing_consent_email, marketing_consent_sms, marketing_consent_push, version, created_at, updated_at)
			VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
			RETURNING client_id, locale, currency_preference, marketing_consent_email, marketing_consent_sms, marketing_consent_push, version, created_at, updated_at
		`, clientID, input.MarketingConsentEmail, input.MarketingConsentSms, input.MarketingConsentPush).Scan(
			&p.ClientID, &p.Locale, &p.CurrencyPreference,
			&p.MarketingConsentEmail, &p.MarketingConsentSms, &p.MarketingConsentPush,
			&p.Version, &p.CreatedAt, &p.UpdatedAt,
		)
		if err == nil {
			logEvent(tx, clientID, "created", 1, input)
		}
	} else {
		err = tx.QueryRow(`
			UPDATE dsh_client_profiles
			SET marketing_consent_email = $2, marketing_consent_sms = $3, marketing_consent_push = $4, version = version + 1, updated_at = NOW()
			WHERE client_id = $1
			RETURNING client_id, locale, currency_preference, marketing_consent_email, marketing_consent_sms, marketing_consent_push, version, created_at, updated_at
		`, clientID, input.MarketingConsentEmail, input.MarketingConsentSms, input.MarketingConsentPush).Scan(
			&p.ClientID, &p.Locale, &p.CurrencyPreference,
			&p.MarketingConsentEmail, &p.MarketingConsentSms, &p.MarketingConsentPush,
			&p.Version, &p.CreatedAt, &p.UpdatedAt,
		)
		if err == nil {
			logEvent(tx, clientID, "consents_updated", p.Version, input)
		}
	}
	if err != nil {
		return ClientProfile{}, err
	}

	if err := tx.Commit(); err != nil {
		return ClientProfile{}, err
	}
	return p, nil
}

func logEvent(tx *sql.Tx, clientID, action string, version int, input any) {
	meta, _ := json.Marshal(input)
	tx.Exec(`INSERT INTO dsh_client_profile_events (client_id, action, version, metadata) VALUES ($1, $2, $3, $4)`, clientID, action, version, meta)
}
