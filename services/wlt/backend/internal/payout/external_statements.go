package payout

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"wlt-api/internal/shared"
)

type ExternalProviderAccountInput struct {
	Currency                 string `json:"currency"`
	OpeningBalanceMinorUnits int64  `json:"openingBalanceMinorUnits"`
}

type ExternalProviderAccount struct {
	ID                   string `json:"id"`
	ProviderKey          string `json:"providerKey"`
	AccountReferenceHash string `json:"accountReferenceHash"`
	Currency             string `json:"currency"`
}

type AuthoritativeStatementLineInput struct {
	ExternalTransferReference string         `json:"externalTransferReference"`
	Direction                 string         `json:"direction"`
	AmountMinorUnits          int64          `json:"amountMinorUnits"`
	Currency                  string         `json:"currency"`
	DestinationReferenceHash  string         `json:"destinationReferenceHash"`
	OccurredAt                *time.Time     `json:"occurredAt"`
	SourceRecord              map[string]any `json:"sourceRecord"`
}

type ImportAuthoritativeStatementInput struct {
	ExternalProviderAccountID     string                            `json:"externalProviderAccountId"`
	StatementReference            string                            `json:"statementReference"`
	ArtifactSHA256                string                            `json:"artifactSha256"`
	ArtifactBytesBase64           string                            `json:"artifactBytesBase64"`
	ProvenanceType                string                            `json:"provenanceType,omitempty"`
	ProvenanceEvidenceSHA256      string                            `json:"provenanceEvidenceSha256,omitempty"`
	ProvenanceEvidenceBytesBase64 string                            `json:"provenanceEvidenceBytesBase64,omitempty"`
	ProvenanceKeyID               string                            `json:"provenanceKeyId,omitempty"`
	ProviderSignatureBase64       string                            `json:"providerSignatureBase64,omitempty"`
	BusinessDate                  string                            `json:"businessDate"`
	ClosingBalanceMinorUnits      int64                             `json:"closingBalanceMinorUnits"`
	Currency                      string                            `json:"currency"`
	Lines                         []AuthoritativeStatementLineInput `json:"lines"`
}

type AuthoritativeStatement struct {
	ID                       string `json:"id"`
	StatementReference       string `json:"statementReference"`
	ArtifactSHA256           string `json:"artifactSha256"`
	StatementFingerprint     string `json:"statementFingerprint"`
	ProvenanceType           string `json:"provenanceType"`
	ProvenanceEvidenceSHA256 string `json:"provenanceEvidenceSha256"`
	ProvenanceKeyID          string `json:"provenanceKeyId,omitempty"`
	VerifierVersion          string `json:"verifierVersion,omitempty"`
	VerificationReceiptID    string `json:"verificationReceiptId,omitempty"`
}

type canonicalStatementLine struct {
	ExternalTransferReference string         `json:"externalTransferReference"`
	Direction                 string         `json:"direction"`
	AmountMinorUnits          int64          `json:"amountMinorUnits"`
	Currency                  string         `json:"currency"`
	DestinationReferenceHash  string         `json:"destinationReferenceHash"`
	OccurredAt                *time.Time     `json:"occurredAt,omitempty"`
	SourceRecord              map[string]any `json:"sourceRecord"`
}

type canonicalStatementArtifact struct {
	ExternalProviderAccountID string                   `json:"externalProviderAccountId"`
	StatementReference        string                   `json:"statementReference"`
	BusinessDate              string                   `json:"businessDate"`
	ClosingBalanceMinorUnits  int64                    `json:"closingBalanceMinorUnits"`
	Currency                  string                   `json:"currency"`
	Lines                     []canonicalStatementLine `json:"lines"`
}

func canonicalStatementArtifactBytes(input ImportAuthoritativeStatementInput, businessDate time.Time) ([]byte, error) {
	lines := make([]canonicalStatementLine, 0, len(input.Lines))
	for _, line := range input.Lines {
		lines = append(lines, canonicalStatementLine(line))
	}
	payload, err := json.Marshal(canonicalStatementArtifact{
		ExternalProviderAccountID: input.ExternalProviderAccountID,
		StatementReference:        input.StatementReference,
		BusinessDate:              businessDate.Format(time.DateOnly),
		ClosingBalanceMinorUnits:  input.ClosingBalanceMinorUnits,
		Currency:                  input.Currency,
		Lines:                     lines,
	})
	if err != nil {
		return nil, fmt.Errorf("encode canonical statement artifact: %w", err)
	}
	return payload, nil
}

func canonicalStatementArtifactSHA256(input ImportAuthoritativeStatementInput, businessDate time.Time) (string, error) {
	payload, err := canonicalStatementArtifactBytes(input, businessDate)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(payload)
	return hex.EncodeToString(digest[:]), nil
}

func canonicalStatementFingerprint(input ImportAuthoritativeStatementInput, businessDate time.Time, artifactSHA256 string) (string, error) {
	identity, err := json.Marshal(struct {
		ExternalProviderAccountID string `json:"externalProviderAccountId"`
		StatementReference        string `json:"statementReference"`
		BusinessDate              string `json:"businessDate"`
		ArtifactSHA256            string `json:"artifactSha256"`
	}{
		ExternalProviderAccountID: input.ExternalProviderAccountID,
		StatementReference:        input.StatementReference,
		BusinessDate:              businessDate.Format(time.DateOnly),
		ArtifactSHA256:            artifactSHA256,
	})
	if err != nil {
		return "", fmt.Errorf("encode canonical statement fingerprint: %w", err)
	}
	digest := sha256.Sum256(identity)
	return hex.EncodeToString(digest[:]), nil
}

func validateCanonicalStatementArtifact(input ImportAuthoritativeStatementInput, businessDate time.Time) (string, string, error) {
	computedArtifactSHA256, err := canonicalStatementArtifactSHA256(input, businessDate)
	if err != nil {
		return "", "", err
	}
	if input.ArtifactSHA256 == "" || input.ArtifactBytesBase64 == "" {
		return "", "", fmt.Errorf("artifactSha256 and artifactBytesBase64 are required from the provider ingestion boundary")
	}
	if input.ArtifactSHA256 != computedArtifactSHA256 {
		return "", "", fmt.Errorf("artifactSha256 does not match the server-computed canonical statement fingerprint")
	}
	artifactBytes, err := base64.StdEncoding.DecodeString(input.ArtifactBytesBase64)
	if err != nil {
		return "", "", fmt.Errorf("artifactBytesBase64 is invalid: %w", err)
	}
	canonicalBytes, err := canonicalStatementArtifactBytes(input, businessDate)
	if err != nil {
		return "", "", err
	}
	if !bytes.Equal(artifactBytes, canonicalBytes) {
		return "", "", fmt.Errorf("artifactBytesBase64 does not match the canonical statement payload")
	}
	statementFingerprint, err := canonicalStatementFingerprint(input, businessDate, computedArtifactSHA256)
	if err != nil {
		return "", "", err
	}
	return computedArtifactSHA256, statementFingerprint, nil
}

func isSHA256(value string) bool {
	if len(value) != 64 {
		return false
	}
	for _, runeValue := range value {
		if (runeValue < '0' || runeValue > '9') && (runeValue < 'a' || runeValue > 'f') {
			return false
		}
	}
	return true
}

func RegisterExternalProviderAccount(ctx context.Context, db *sql.DB, providerKey, accountReferenceHash string, input ExternalProviderAccountInput) (*ExternalProviderAccount, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	operatorID, err := shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	providerKey = strings.TrimSpace(providerKey)
	accountReferenceHash = strings.ToLower(strings.TrimSpace(accountReferenceHash))
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	if providerKey == "" || !isSHA256(accountReferenceHash) || input.Currency == "" {
		return nil, fmt.Errorf("providerKey, SHA-256 accountReferenceHash and currency are required")
	}

	row := db.QueryRowContext(ctx, `
		INSERT INTO wlt_external_provider_accounts
			(operator_context_id, provider_key, account_reference_hash, currency,
			 opening_balance_minor_units, created_by_operator_id)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (operator_context_id, provider_key, account_reference_hash, currency)
		DO UPDATE SET provider_key = EXCLUDED.provider_key
		RETURNING id, provider_key, account_reference_hash, currency`,
		operatorContextID, providerKey, accountReferenceHash, input.Currency, input.OpeningBalanceMinorUnits, operatorID,
	)
	var account ExternalProviderAccount
	if err := row.Scan(&account.ID, &account.ProviderKey, &account.AccountReferenceHash, &account.Currency); err != nil {
		return nil, err
	}
	return &account, nil
}

func ImportAuthoritativeStatement(ctx context.Context, db *sql.DB, input ImportAuthoritativeStatementInput) (*AuthoritativeStatement, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	operatorID, err := shared.RequireDelegatedFinancePrincipal(ctx)
	if err != nil {
		return nil, err
	}
	input.ExternalProviderAccountID = strings.TrimSpace(input.ExternalProviderAccountID)
	input.StatementReference = strings.TrimSpace(input.StatementReference)
	input.ArtifactSHA256 = strings.ToLower(strings.TrimSpace(input.ArtifactSHA256))
	input.ArtifactBytesBase64 = strings.TrimSpace(input.ArtifactBytesBase64)
	input.ProvenanceType = strings.ToLower(strings.TrimSpace(input.ProvenanceType))
	input.ProvenanceEvidenceSHA256 = strings.ToLower(strings.TrimSpace(input.ProvenanceEvidenceSHA256))
	input.ProvenanceEvidenceBytesBase64 = strings.TrimSpace(input.ProvenanceEvidenceBytesBase64)
	input.ProvenanceKeyID = strings.TrimSpace(input.ProvenanceKeyID)
	input.ProviderSignatureBase64 = strings.TrimSpace(input.ProviderSignatureBase64)
	if input.ProvenanceType == "" {
		input.ProvenanceType = "operator_attested"
	}
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	businessDate, err := time.Parse(time.DateOnly, strings.TrimSpace(input.BusinessDate))
	if err != nil || input.ExternalProviderAccountID == "" || input.StatementReference == "" || (!isSHA256(input.ArtifactSHA256)) || input.ArtifactBytesBase64 == "" || input.Currency == "" || len(input.Lines) == 0 {
		return nil, fmt.Errorf("account, statementReference, SHA-256 artifact, businessDate, currency and statement lines are required")
	}
	if input.ProvenanceType != "operator_attested" && input.ProvenanceType != "provider_signed" && input.ProvenanceType != "provider_api_verified" {
		return nil, fmt.Errorf("provenanceType must be operator_attested, provider_signed or provider_api_verified")
	}
	artifactBytes, err := base64.StdEncoding.DecodeString(input.ArtifactBytesBase64)
	if err != nil || len(artifactBytes) == 0 {
		return nil, fmt.Errorf("artifact bytes are invalid or empty")
	}
	var provenanceEvidenceBytes []byte
	switch input.ProvenanceType {
	case "operator_attested":
		input.ProvenanceEvidenceSHA256 = input.ArtifactSHA256
		provenanceEvidenceBytes = artifactBytes
	case "provider_signed":
		if input.ProvenanceKeyID == "" || input.ProviderSignatureBase64 == "" {
			return nil, fmt.Errorf("provider_signed requires a provider key id and signature; self-asserted evidence is not accepted")
		}
		provenanceEvidenceBytes, err = base64.StdEncoding.DecodeString(input.ProviderSignatureBase64)
		if err != nil || len(provenanceEvidenceBytes) != ed25519.SignatureSize {
			return nil, fmt.Errorf("provider_signed evidence must be a valid Ed25519 signature")
		}
		input.ProvenanceEvidenceBytesBase64 = input.ProviderSignatureBase64
		input.ProvenanceEvidenceSHA256 = ""
	default:
		return nil, fmt.Errorf("provider_api_verified requires the trusted provider API verifier; caller-asserted API provenance is rejected")
	}
	for i := range input.Lines {
		line := &input.Lines[i]
		line.ExternalTransferReference = strings.TrimSpace(line.ExternalTransferReference)
		line.Direction = strings.ToLower(strings.TrimSpace(line.Direction))
		line.Currency = strings.ToUpper(strings.TrimSpace(line.Currency))
		line.DestinationReferenceHash = strings.ToLower(strings.TrimSpace(line.DestinationReferenceHash))
	}
	computedArtifactSHA256, statementFingerprint, err := validateCanonicalStatementArtifact(input, businessDate)
	if err != nil {
		return nil, err
	}
	input.ArtifactSHA256 = computedArtifactSHA256
	if input.ProvenanceType == "provider_signed" {
		var signatureBytes []byte
		signatureBytes, err = base64.StdEncoding.DecodeString(input.ProviderSignatureBase64)
		if err != nil || len(signatureBytes) != ed25519.SignatureSize {
			return nil, fmt.Errorf("provider signature evidence is invalid")
		}
		provenanceEvidenceBytes = signatureBytes
		evidenceDigest := sha256.Sum256(signatureBytes)
		input.ProvenanceEvidenceSHA256 = hex.EncodeToString(evidenceDigest[:])
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck
	var providerKey, accountCurrency string
	if err := tx.QueryRowContext(ctx, `
		SELECT provider_key, currency FROM wlt_external_provider_accounts
		WHERE id=$1 AND operator_context_id=$2 AND active=true
		FOR UPDATE`, input.ExternalProviderAccountID, operatorContextID,
	).Scan(&providerKey, &accountCurrency); err != nil {
		return nil, fmt.Errorf("active external provider account not found: %w", err)
	}
	if accountCurrency != input.Currency {
		return nil, fmt.Errorf("statement currency must match external provider account currency")
	}

	var verifierVersion string
	if input.ProvenanceType == "provider_signed" {
		var publicKey []byte
		err := tx.QueryRowContext(ctx, `
			SELECT public_key, verifier_version
			FROM wlt_external_provider_verification_keys
			WHERE operator_context_id=$1 AND provider_key=$2 AND key_id=$3 AND algorithm='ed25519'
			  AND active=true AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW())
			FOR SHARE`, operatorContextID, providerKey, input.ProvenanceKeyID).Scan(&publicKey, &verifierVersion)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("provider signing key is not trusted or active")
		}
		if err != nil {
			return nil, fmt.Errorf("read trusted provider signing key: %w", err)
		}
		if len(publicKey) != ed25519.PublicKeySize || !ed25519.Verify(ed25519.PublicKey(publicKey), artifactBytes, provenanceEvidenceBytes) {
			return nil, fmt.Errorf("provider signature does not verify against the canonical statement artifact")
		}
	}

	var existingArtifactSHA256, existingProvenanceType, existingEvidenceSHA256, existingKeyID, existingVerifierVersion, existingReceiptID string
	existingErr := tx.QueryRowContext(ctx, `
		SELECT artifact_sha256, COALESCE(provenance_type, 'operator_attested'), COALESCE(provenance_evidence_sha256, ''),
		       COALESCE(provenance_key_id, ''), COALESCE(provenance_verifier_version, ''), COALESCE(provenance_verification_receipt_id, '')
		FROM wlt_external_provider_statements
		WHERE operator_context_id=$1 AND external_provider_account_id=$2
		  AND statement_reference=$3 AND business_date=$4
		FOR UPDATE`,
		operatorContextID, input.ExternalProviderAccountID, input.StatementReference, businessDate,
	).Scan(&existingArtifactSHA256, &existingProvenanceType, &existingEvidenceSHA256, &existingKeyID, &existingVerifierVersion, &existingReceiptID)
	if existingErr == nil {
		if existingArtifactSHA256 != input.ArtifactSHA256 {
			return nil, fmt.Errorf("statement reference is already bound to a different artifact payload")
		}
		if existingProvenanceType != input.ProvenanceType || existingEvidenceSHA256 != input.ProvenanceEvidenceSHA256 ||
			(input.ProvenanceType == "provider_signed" && (existingKeyID != input.ProvenanceKeyID || existingVerifierVersion == "" || existingReceiptID == "")) {
			return nil, fmt.Errorf("statement replay provenance does not match the immutable existing evidence")
		}
	}
	if existingErr != nil && existingErr != sql.ErrNoRows {
		return nil, existingErr
	}

	statementID := "weps_" + uuid.NewString()
	var provenanceKeyID, provenanceVerifierVersion, provenanceReceiptID any
	if input.ProvenanceType == "provider_signed" {
		provenanceKeyID = input.ProvenanceKeyID
		provenanceVerifierVersion = verifierVersion
		provenanceReceiptID = "wepsvr_" + uuid.NewString()
	}

	var statement AuthoritativeStatement
	err = tx.QueryRowContext(ctx, `
			INSERT INTO wlt_external_provider_statements
				(id, operator_context_id, external_provider_account_id, statement_reference,
				 artifact_sha256, statement_fingerprint, business_date, closing_balance_minor_units, currency,
				 imported_by_operator_id, provenance_type, provenance_evidence_sha256, provenance_evidence_bytes,
				 provenance_key_id, provenance_verifier_version, provenance_verification_receipt_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
			ON CONFLICT (operator_context_id, artifact_sha256) DO NOTHING
			RETURNING id, statement_reference, artifact_sha256, statement_fingerprint, provenance_type, provenance_evidence_sha256,
			       COALESCE(provenance_key_id, ''), COALESCE(provenance_verifier_version, ''), COALESCE(provenance_verification_receipt_id, '')`,
		statementID, operatorContextID, input.ExternalProviderAccountID, input.StatementReference,
		input.ArtifactSHA256, statementFingerprint, businessDate, input.ClosingBalanceMinorUnits, input.Currency,
		operatorID, input.ProvenanceType, input.ProvenanceEvidenceSHA256, provenanceEvidenceBytes,
		provenanceKeyID, provenanceVerifierVersion, provenanceReceiptID,
	).Scan(&statement.ID, &statement.StatementReference, &statement.ArtifactSHA256, &statement.StatementFingerprint,
		&statement.ProvenanceType, &statement.ProvenanceEvidenceSHA256, &statement.ProvenanceKeyID, &statement.VerifierVersion, &statement.VerificationReceiptID)
	if err == sql.ErrNoRows {
		err = tx.QueryRowContext(ctx, `
				SELECT id, statement_reference, artifact_sha256, COALESCE(statement_fingerprint, ''),
			       COALESCE(provenance_type, 'operator_attested'), COALESCE(provenance_evidence_sha256, ''),
			       COALESCE(provenance_key_id, ''), COALESCE(provenance_verifier_version, ''), COALESCE(provenance_verification_receipt_id, '')
			FROM wlt_external_provider_statements
			WHERE operator_context_id=$1 AND artifact_sha256=$2`, operatorContextID, input.ArtifactSHA256,
		).Scan(&statement.ID, &statement.StatementReference, &statement.ArtifactSHA256, &statement.StatementFingerprint,
			&statement.ProvenanceType, &statement.ProvenanceEvidenceSHA256, &statement.ProvenanceKeyID, &statement.VerifierVersion, &statement.VerificationReceiptID)
		if err != nil {
			return nil, err
		}
		if statement.StatementReference != input.StatementReference {
			return nil, fmt.Errorf("statement artifact hash is already bound to a different statement reference")
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &statement, nil
	}
	if err != nil {
		return nil, err
	}

	if input.ProvenanceType == "provider_signed" {
		if _, err := tx.ExecContext(ctx, `
				INSERT INTO wlt_external_statement_verification_receipts
					(id, operator_context_id, statement_id, provider_key, verification_method, key_id,
					 verifier_version, artifact_sha256, evidence_sha256, raw_evidence)
				VALUES ($1,$2,$3,$4,'provider_signed',$5,$6,$7,$8,$9)`, provenanceReceiptID,
			operatorContextID, statement.ID, providerKey, input.ProvenanceKeyID, verifierVersion,
			input.ArtifactSHA256, input.ProvenanceEvidenceSHA256, provenanceEvidenceBytes); err != nil {
			return nil, fmt.Errorf("persist provider verification receipt: %w", err)
		}
	}

	for _, line := range input.Lines {
		if line.ExternalTransferReference == "" || (line.Direction != "incoming" && line.Direction != "outgoing") ||
			line.AmountMinorUnits <= 0 || line.Currency != input.Currency || !isSHA256(line.DestinationReferenceHash) {
			return nil, fmt.Errorf("every statement line needs a unique reference, direction, positive amount, account currency and SHA-256 destination fingerprint")
		}
		sourceRecord, err := json.Marshal(line.SourceRecord)
		if err != nil {
			return nil, fmt.Errorf("encode statement source record: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO wlt_external_provider_statement_lines
				(operator_context_id, statement_id, external_transfer_reference, direction,
				 amount_minor_units, currency, destination_reference_hash, occurred_at, source_record)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
			operatorContextID, statement.ID, line.ExternalTransferReference, line.Direction,
			line.AmountMinorUnits, line.Currency, line.DestinationReferenceHash, line.OccurredAt, sourceRecord,
		); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &statement, nil
}

func HandleRegisterExternalProviderAccount(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ExternalProviderAccountInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		account, err := RegisterExternalProviderAccount(r.Context(), db, r.PathValue("providerKey"), r.PathValue("accountReferenceHash"), input)
		if err != nil {
			shared.SendError(w, http.StatusConflict, "EXTERNAL_PROVIDER_ACCOUNT_INVALID", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"externalProviderAccount": account})
	}
}

func HandleImportAuthoritativeStatement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input ImportAuthoritativeStatementInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		statement, err := ImportAuthoritativeStatement(r.Context(), db, input)
		if err != nil {
			shared.SendError(w, http.StatusConflict, "AUTHORITATIVE_STATEMENT_INVALID", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"authoritativeStatement": statement})
	}
}
