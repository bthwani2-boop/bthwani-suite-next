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

// officialWalletDestinationMethod is the only destination method WLT writes.
//
// Legacy rows still carry 'bank', 'mobile_money' or 'manual' in
// destination_method. Those values are read-only history: a bank account is no
// longer a payout destination, and a manual bank transfer is an execution
// method for a settlement batch rather than a place money can be sent. Every
// destination WLT accepts today identifies a verified official wallet held at
// a governed provider.
const officialWalletDestinationMethod = "official_wallet"

// Destination verification lifecycle. A destination becomes usable only in
// verificationVerified, and any change to its material identity moves it back
// to a fresh unverified version rather than editing the verified row.
const (
	verificationUnverified            = "unverified"
	verificationVerified              = "verified"
	verificationRequiresReverification = "requires_reverification"
	verificationRejected              = "rejected"
)

// errUnsupportedOfficialWalletProvider reports a provider key that is not an
// active entry in the operator context's governed provider registry. An empty
// registry therefore blocks every destination, which is the correct
// fail-closed state for a context that has not declared its providers.
var errUnsupportedOfficialWalletProvider = errors.New("officialWalletProviderKey is not an active provider for this OperatorContext")

type officialWalletDestinationInput struct {
	BeneficiaryName          string `json:"beneficiaryName"`
	OfficialWalletProviderKey string `json:"officialWalletProviderKey"`
	DestinationReference     string `json:"destinationReference"`
	OperatorID               string `json:"operatorId"`
}

// normalize trims and lower-cases the provider key, then rejects any input
// that cannot identify an official wallet. It deliberately accepts no
// destination method from the caller: the method is not the caller's choice.
func (input *officialWalletDestinationInput) normalize() error {
	input.BeneficiaryName = strings.TrimSpace(input.BeneficiaryName)
	input.OfficialWalletProviderKey = strings.ToLower(strings.TrimSpace(input.OfficialWalletProviderKey))
	input.DestinationReference = strings.TrimSpace(input.DestinationReference)
	input.OperatorID = strings.TrimSpace(input.OperatorID)

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
	return nil
}

// materialIdentityHash covers exactly the facts that decide where money lands.
// Changing any of them produces a different destination, so the previous
// verification cannot carry over. operatorId is excluded on purpose: who
// recorded the destination does not change where the money goes.
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

// assertActiveOfficialWalletProvider fails closed when the provider registry
// does not carry an active entry for the key in this OperatorContext.
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

// currentOfficialWalletDestination locks and returns the active destination for
// a governed owner scope, or nil when the owner has none.
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

// nextDestinationVersion continues the owner's version chain. Versions are
// never reused, so a superseded destination stays addressable in audit and
// reconciliation evidence.
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

// supersedeActiveDestination retires the owner's current active destination so
// the partial unique index admits the new version.
func supersedeActiveDestination(ctx context.Context, tx *sql.Tx, operatorContextID, actorType, actorID string) error {
	_, err := tx.ExecContext(ctx, `UPDATE wlt_payout_destinations
		SET active=false, superseded_at=now(), updated_at=now()
		WHERE operator_context_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true`,
		operatorContextID, actorType, actorID)
	return err
}

// insertOfficialWalletDestinationVersion writes a new unverified version. The
// reference is encrypted at rest and only its masked projection is returned.
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
