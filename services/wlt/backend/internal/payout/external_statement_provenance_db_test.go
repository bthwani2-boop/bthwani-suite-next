package payout

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
	"testing"
	"time"

	"wlt-api/internal/shared"
)

func TestProviderSignedStatementRequiresTrustedKeyAndPersistsReceipt(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	t.Cleanup(func() { _ = db.Close() })

	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	operatorContextID := "provider-signed-" + suffix
	ctx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(context.Background(), operatorContextID), "finance-reconciler")
	account, err := RegisterExternalProviderAccount(ctx, db, "trusted-provider", fixtureSHA256("account:"+operatorContextID), ExternalProviderAccountInput{Currency: "YER"})
	if err != nil {
		t.Fatalf("register provider account: %v", err)
	}
	input := testAuthoritativeStatementInput()
	input.ExternalProviderAccountID = account.ID
	input.StatementReference = "signed-" + suffix
	canonicalBytes, err := canonicalStatementArtifactBytes(input, time.Date(2026, time.August, 27, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("canonical artifact: %v", err)
	}
	input.BusinessDate = "2026-08-27"
	input.ArtifactBytesBase64 = base64.StdEncoding.EncodeToString(canonicalBytes)
	input.ArtifactSHA256, err = canonicalStatementArtifactSHA256(input, time.Date(2026, time.August, 27, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("artifact digest: %v", err)
	}
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate signing key: %v", err)
	}
	const keyID = "provider-key-1"
	const verifierVersion = "ed25519-v1"
	if _, err := db.ExecContext(ctx, `
		INSERT INTO wlt_external_provider_verification_keys
			(operator_context_id, provider_key, key_id, algorithm, public_key, verifier_version)
		VALUES ($1,$2,$3,'ed25519',$4,$5)`, operatorContextID, account.ProviderKey, keyID, []byte(publicKey), verifierVersion); err != nil {
		t.Fatalf("insert trusted provider key: %v", err)
	}
	input.ProvenanceType = "provider_signed"
	input.ProvenanceKeyID = keyID
	expectedSignature := ed25519.Sign(privateKey, canonicalBytes)
	input.ProviderSignatureBase64 = base64.StdEncoding.EncodeToString(expectedSignature)
	expectedEvidenceDigest := sha256.Sum256(expectedSignature)

	statement, err := ImportAuthoritativeStatement(ctx, db, input)
	if err != nil {
		t.Fatalf("import signed statement: %v", err)
	}
	if statement.ProvenanceType != "provider_signed" || statement.ProvenanceKeyID != keyID || statement.VerifierVersion != verifierVersion || statement.VerificationReceiptID == "" {
		t.Fatalf("unexpected signed statement receipt metadata: %+v", statement)
	}
	var receiptArtifact, receiptEvidence string
	var rawEvidence []byte
	if err := db.QueryRowContext(ctx, `
		SELECT artifact_sha256, evidence_sha256, raw_evidence
		FROM wlt_external_statement_verification_receipts
		WHERE operator_context_id=$1 AND statement_id=$2`, operatorContextID, statement.ID).Scan(&receiptArtifact, &receiptEvidence, &rawEvidence); err != nil {
		t.Fatalf("read verification receipt: %v", err)
	}
	if receiptArtifact != input.ArtifactSHA256 || receiptEvidence != hex.EncodeToString(expectedEvidenceDigest[:]) || string(rawEvidence) != string(expectedSignature) {
		t.Fatalf("verification receipt is not bound to the signed artifact")
	}
}

func TestProviderProvenanceRejectsSelfAssertedApiVerification(t *testing.T) {
	input := testAuthoritativeStatementInput()
	businessDate, err := time.Parse(time.DateOnly, input.BusinessDate)
	if err != nil {
		t.Fatal(err)
	}
	artifactBytes, err := canonicalStatementArtifactBytes(input, businessDate)
	if err != nil {
		t.Fatal(err)
	}
	input.ArtifactBytesBase64 = base64.StdEncoding.EncodeToString(artifactBytes)
	input.ArtifactSHA256, err = canonicalStatementArtifactSHA256(input, businessDate)
	if err != nil {
		t.Fatal(err)
	}
	input.ProvenanceType = "provider_api_verified"
	input.ProvenanceEvidenceSHA256 = strings.Repeat("a", 64)
	input.ProvenanceEvidenceBytesBase64 = base64.StdEncoding.EncodeToString([]byte("caller-asserted"))
	ctx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(context.Background(), "operator-api-negative"), "finance-reconciler")
	if _, err := ImportAuthoritativeStatement(ctx, nil, input); err == nil || !strings.Contains(err.Error(), "trusted provider API verifier") {
		t.Fatalf("expected self-asserted provider_api_verified provenance to fail closed, got %v", err)
	}
}
