package payout

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

const officialWalletDestinationMethod = "official_wallet"

const (
	verificationUnverified             = "unverified"
	verificationVerified               = "verified"
	verificationRequiresReverification = "requires_reverification"
	verificationRejected               = "rejected"
)

var errUnsupportedOfficialWalletProvider = errors.New("officialWalletProviderKey is not an active provider for this OperatorContext")

type officialWalletDestinationInput struct {
	BeneficiaryName           string `json:"beneficiaryName"`
	OfficialWalletProviderKey string `json:"officialWalletProviderKey"`
	DestinationReference      string `json:"destinationReference"`
	Reason                    string `json:"reason"`
	EvidenceReference         string `json:"evidenceReference"`
}

func (input *officialWalletDestinationInput) normalize() error {
	input.BeneficiaryName = strings.TrimSpace(input.BeneficiaryName)
	input.OfficialWalletProviderKey = strings.ToLower(strings.TrimSpace(input.OfficialWalletProviderKey))
	input.DestinationReference = strings.TrimSpace(input.DestinationReference)
	input.Reason = strings.TrimSpace(input.Reason)
	input.EvidenceReference = strings.TrimSpace(input.EvidenceReference)

	if input.BeneficiaryName == "" {
		return fmt.Errorf("beneficiaryName is required")
	}
	if len(input.BeneficiaryName) > 200 {
		return fmt.Errorf("beneficiaryName is too long")
	}
	if input.OfficialWalletProviderKey == "" {
		return fmt.Errorf("officialWalletProviderKey is required")
	}
	if len(input.OfficialWalletProviderKey) > 64 {
		return fmt.Errorf("officialWalletProviderKey is too long")
	}
	if input.DestinationReference == "" {
		return fmt.Errorf("destinationReference is required")
	}
	if len(input.DestinationReference) > 200 {
		return fmt.Errorf("destinationReference is too long")
	}
	if input.Reason == "" {
		return fmt.Errorf("reason is required")
	}
	if len(input.Reason) > 500 {
		return fmt.Errorf("reason is too long")
	}
	if input.EvidenceReference == "" {
		return fmt.Errorf("evidenceReference is required")
	}
	if len(input.EvidenceReference) > 500 {
		return fmt.Errorf("evidenceReference is too long")
	}
	return nil
}

func (input officialWalletDestinationInput) materialIdentityHash(operatorContextID, actorType, actorID string) string {
	sum := sha256.Sum256([]byte(strings.Join([]string{
		operatorContextID,
		actorType,
		actorID,
		input.OfficialWalletProviderKey,
		input.DestinationReference,
		input.BeneficiaryName,
	}, "\x1f")))
	return hex.EncodeToString(sum[:])
}

func assertActiveOfficialWalletProvider(ctx context.Context, tx *sql.Tx, operatorContextID, providerKey string) error {
	var active bool
	err := tx.QueryRowContext(ctx, `SELECT active FROM wlt_official_wallet_providers
		WHERE operator_context_id=$1 AND provider_key=$2`, operatorContextID, providerKey).Scan(&active)
	if errors.Is(err, sql.ErrNoRows) {
		return errUnsupportedOfficialWalletProvider
	}
	if err != nil {
		return err
	}
	if !active {
		return errUnsupportedOfficialWalletProvider
	}
	return nil
}

func currentOfficialWalletDestination(ctx context.Context, tx *sql.Tx, operatorContextID, actorType, actorID string) (*governedDestinationRef, string, error) {
	row := tx.QueryRowContext(ctx, `SELECT `+governedDestinationReturning+`, material_identity_hash
		FROM wlt_payout_destinations
		WHERE operator_context_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true
		FOR UPDATE`, operatorContextID, actorType, actorID)
	var destination governedDestinationRef
	var materialHash string
	err := scanGovernedDestinationInto(row, &destination, &materialHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}
	return &destination, materialHash, nil
}

func nextDestinationVersion(ctx context.Context, tx *sql.Tx, operatorContextID, actorType, actorID string) (int, error) {
	var maxVersion sql.NullInt64
	err := tx.QueryRowContext(ctx, `SELECT max(destination_version) FROM wlt_payout_destinations
		WHERE operator_context_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3`,
		operatorContextID, actorType, actorID).Scan(&maxVersion)
	if err != nil {
		return 0, err
	}
	return int(maxVersion.Int64) + 1, nil
}

func supersedeActiveDestination(ctx context.Context, tx *sql.Tx, operatorContextID, actorType, actorID string) error {
	_, err := tx.ExecContext(ctx, `UPDATE wlt_payout_destinations
		SET active=false, superseded_at=now(), updated_at=now()
		WHERE operator_context_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true`,
		operatorContextID, actorType, actorID)
	return err
}

func insertOfficialWalletDestinationVersion(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID, actorType, actorID string,
	input officialWalletDestinationInput,
	encryptionKey string,
	version int,
	materialHash string,
	createdByActorID string,
) (*governedDestinationRef, error) {
	row := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_payout_destinations
			(operator_context_id, partner_id, owner_actor_id, owner_actor_type, beneficiary_name,
			 destination_reference_encrypted, official_wallet_provider_key,
			 destination_method, masked_destination_reference, destination_verification_status,
			 destination_version, material_identity_hash, active, created_by_actor_id)
		VALUES ($1,$2,$2,$3,$4,
			pgp_sym_encrypt($5,$6), $7,
			$8,$9,$10,
			$11,$12,true,$13)
		RETURNING `+governedDestinationReturning+`, material_identity_hash`,
		operatorContextID, actorID, actorType, input.BeneficiaryName,
		input.DestinationReference, encryptionKey, input.OfficialWalletProviderKey,
		officialWalletDestinationMethod, maskLast4(input.DestinationReference), verificationUnverified,
		version, materialHash, createdByActorID)

	var destination governedDestinationRef
	var storedHash string
	if err := scanGovernedDestinationInto(row, &destination, &storedHash); err != nil {
		return nil, err
	}
	return &destination, nil
}
