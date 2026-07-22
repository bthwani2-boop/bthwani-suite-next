package dispatch

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"dsh-api/internal/orders"
	"dsh-api/internal/wltoutbox"
)

var ErrIdempotencyConflict = errors.New("delivery proof idempotency conflict")

type DeliveryProofMethod string
type DeliveryProofStatus string

const (
	DeliveryProofOTP       DeliveryProofMethod = "otp_pin"
	DeliveryProofPhoto     DeliveryProofMethod = "photo"
	DeliveryProofSignature DeliveryProofMethod = "signature"
	DeliveryProofComposite DeliveryProofMethod = "composite"

	DeliveryProofSubmitted     DeliveryProofStatus = "submitted"
	DeliveryProofPendingReview DeliveryProofStatus = "pending_review"
	DeliveryProofAccepted      DeliveryProofStatus = "accepted"
	DeliveryProofRejected      DeliveryProofStatus = "rejected"
	DeliveryProofSuperseded    DeliveryProofStatus = "superseded"
)

const (
	deliveryPINLifetime = 10 * time.Minute
	deliveryPINLength   = 6
)

type DeliveryVerificationChallenge struct {
	ID             string
	AssignmentID   string
	OrderID        string
	ClientID       string
	ExpiresAt      time.Time
	FailedAttempts int
	MaxAttempts    int
	IssuedAt       time.Time
	ConsumedAt     *time.Time
	Version        int
}

type IssuedDeliveryPIN struct {
	Challenge DeliveryVerificationChallenge
	PIN       string
}

type DeliveryProof struct {
	ID                      string
	AssignmentID            string
	OrderID                 string
	CaptainID               string
	VerificationChallengeID string
	Method                  DeliveryProofMethod
	Status                  DeliveryProofStatus
	PhotoMediaRef           string
	SignatureMediaRef       string
	CapturedLatitude        *float64
	CapturedLongitude       *float64
	CapturedAt              time.Time
	SubmittedAt             time.Time
	ReviewedAt              *time.Time
	ReviewedByActorID       string
	ReviewReason            string
	AcceptedAt              *time.Time
	RejectedAt              *time.Time
	IdempotencyKey          string
	Version                 int
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

type SubmitDeliveryProofInput struct {
	Method            DeliveryProofMethod
	PIN               string
	PhotoMediaRef     string
	SignatureMediaRef string
	CapturedLatitude  *float64
	CapturedLongitude *float64
	CapturedAt        *time.Time
	IdempotencyKey    string
}

type ReviewDeliveryProofInput struct {
	ExpectedVersion int
	Reason          string
	Accept          bool
}

func IssueDeliveryPIN(db *sql.DB, orderID, clientID string) (*IssuedDeliveryPIN, error) {
	orderID = strings.TrimSpace(orderID)
	clientID = strings.TrimSpace(clientID)
	if orderID == "" || clientID == "" {
		return nil, fmt.Errorf("%w: order and client are required", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var assignmentID, deliveryStatus, assignmentStatus string
	err = tx.QueryRow(`
		SELECT a.id::text, a.status, d.status
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id = a.id
		JOIN dsh_orders o ON o.id = a.order_id
		WHERE a.order_id = $1::uuid AND o.client_id = $2
		ORDER BY a.created_at DESC
		LIMIT 1
		FOR UPDATE OF a, d`, orderID, clientID).Scan(&assignmentID, &assignmentStatus, &deliveryStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if assignmentStatus != string(AssignmentAccepted) || deliveryStatus != string(DeliveryArrivedCustomer) {
		return nil, fmt.Errorf("%w: delivery PIN requires an accepted assignment at arrived_customer", ErrConflict)
	}
	if err = ensureNoOpenDeliveryException(tx, assignmentID); err != nil {
		return nil, err
	}

	pin, err := randomDeliveryPIN()
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	expiresAt := now.Add(deliveryPINLifetime)
	pinHash := hashDeliveryPIN(assignmentID, pin)

	var challenge DeliveryVerificationChallenge
	err = tx.QueryRow(`
		INSERT INTO dsh_delivery_verification_challenges
			(assignment_id, order_id, client_id, pin_hash, pin_expires_at, failed_attempts, max_attempts, issued_at, consumed_at, version)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, 0, 5, $6, NULL, 1)
		ON CONFLICT (assignment_id) DO UPDATE SET
			order_id = EXCLUDED.order_id,
			client_id = EXCLUDED.client_id,
			pin_hash = EXCLUDED.pin_hash,
			pin_expires_at = EXCLUDED.pin_expires_at,
			failed_attempts = 0,
			max_attempts = 5,
			issued_at = EXCLUDED.issued_at,
			consumed_at = NULL,
			version = dsh_delivery_verification_challenges.version + 1,
			updated_at = NOW()
		RETURNING id::text, assignment_id::text, order_id::text, client_id,
			pin_expires_at, failed_attempts, max_attempts, issued_at, consumed_at, version`,
		assignmentID, orderID, clientID, pinHash, expiresAt, now,
	).Scan(
		&challenge.ID, &challenge.AssignmentID, &challenge.OrderID, &challenge.ClientID,
		&challenge.ExpiresAt, &challenge.FailedAttempts, &challenge.MaxAttempts,
		&challenge.IssuedAt, &challenge.ConsumedAt, &challenge.Version,
	)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return &IssuedDeliveryPIN{Challenge: challenge, PIN: pin}, nil
}

func SubmitDeliveryProof(db *sql.DB, assignmentID, captainID string, input SubmitDeliveryProofInput) (*DeliveryProof, error) {
	assignmentID = strings.TrimSpace(assignmentID)
	captainID = strings.TrimSpace(captainID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.PIN = strings.TrimSpace(input.PIN)
	input.PhotoMediaRef = strings.TrimSpace(input.PhotoMediaRef)
	input.SignatureMediaRef = strings.TrimSpace(input.SignatureMediaRef)
	if assignmentID == "" || captainID == "" || input.IdempotencyKey == "" {
		return nil, fmt.Errorf("%w: assignment, captain and idempotencyKey are required", ErrInvalid)
	}
	if err := validateDeliveryProofInput(input); err != nil {
		return nil, err
	}

	capturedAt := time.Now().UTC()
	if input.CapturedAt != nil {
		capturedAt = input.CapturedAt.UTC()
	}
	fingerprint := deliveryProofFingerprint(assignmentID, captainID, input, capturedAt)

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if replay, replayErr := getDeliveryProofByIdempotency(tx, assignmentID, input.IdempotencyKey, fingerprint); replayErr != nil || replay != nil {
		if replayErr != nil {
			return nil, replayErr
		}
		if err = tx.Commit(); err != nil {
			return nil, err
		}
		return replay, nil
	}

	current, err := lockAssignment(tx, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.OrderID == "" {
		return nil, fmt.Errorf("%w: JRN-018 proof applies to customer orders only", ErrInvalid)
	}
	if current.Status != AssignmentAccepted || current.Delivery.Status != DeliveryArrivedCustomer {
		return nil, fmt.Errorf("%w: proof requires an accepted assignment at arrived_customer", ErrConflict)
	}
	if err = ensureNoOpenDeliveryException(tx, assignmentID); err != nil {
		return nil, err
	}
	if input.PhotoMediaRef != "" {
		if err = validateDeliveryProofMedia(tx, input.PhotoMediaRef, captainID, "delivery_proof"); err != nil {
			return nil, err
		}
	}
	if input.SignatureMediaRef != "" {
		if err = validateDeliveryProofMedia(tx, input.SignatureMediaRef, captainID, "delivery_signature"); err != nil {
			return nil, err
		}
	}

	challengeID := ""
	status := DeliveryProofPendingReview
	if input.Method == DeliveryProofOTP || input.Method == DeliveryProofComposite {
		challengeID, err = verifyDeliveryPIN(tx, assignmentID, input.PIN)
		if err != nil {
			return nil, err
		}
		status = DeliveryProofAccepted
	}

	proof, err := insertDeliveryProof(tx, current, input, challengeID, fingerprint, capturedAt, status)
	if err != nil {
		return nil, err
	}
	if status == DeliveryProofAccepted {
		if err = finalizeAcceptedDeliveryProof(tx, current, proof, captainID); err != nil {
			return nil, err
		}
	} else {
		if _, err = tx.Exec(`
			UPDATE dsh_deliveries
			SET pod_method=$1, pod_reference=COALESCE(NULLIF($2,''),NULLIF($3,'')),
			    pod_review_status='pending_review', updated_at=NOW()
			WHERE assignment_id=$4::uuid AND captain_id=$5`,
			string(input.Method), input.PhotoMediaRef, input.SignatureMediaRef, assignmentID, captainID,
		); err != nil {
			return nil, err
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainDeliveryProof(db, assignmentID, captainID)
}

func ReviewDeliveryProof(db *sql.DB, proofID, operatorID string, input ReviewDeliveryProofInput) (*DeliveryProof, error) {
	proofID = strings.TrimSpace(proofID)
	operatorID = strings.TrimSpace(operatorID)
	input.Reason = strings.TrimSpace(input.Reason)
	if proofID == "" || operatorID == "" || input.ExpectedVersion <= 0 || len(input.Reason) < 5 {
		return nil, fmt.Errorf("%w: proof, operator, expectedVersion and review reason are required", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	proof, fingerprint, err := scanDeliveryProofRow(tx.QueryRow(deliveryProofSelectSQL()+` WHERE p.id=$1::uuid FOR UPDATE`, proofID))
	_ = fingerprint
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if proof.Version != input.ExpectedVersion {
		return nil, fmt.Errorf("%w: delivery proof version changed", ErrConflict)
	}
	if proof.Status != DeliveryProofPendingReview && proof.Status != DeliveryProofSubmitted {
		return nil, fmt.Errorf("%w: only pending proof can be reviewed", ErrConflict)
	}

	if !input.Accept {
		_, err = tx.Exec(`
			UPDATE dsh_delivery_proofs
			SET status='rejected', reviewed_at=NOW(), reviewed_by_actor_id=$2,
			    review_reason=$3, rejected_at=NOW(), version=version+1, updated_at=NOW()
			WHERE id=$1::uuid AND version=$4`, proofID, operatorID, input.Reason, input.ExpectedVersion)
		if err != nil {
			return nil, err
		}
		_, err = tx.Exec(`
			UPDATE dsh_deliveries
			SET pod_review_status='rejected', updated_at=NOW()
			WHERE assignment_id=$1::uuid AND status='arrived_customer'`, proof.AssignmentID)
		if err != nil {
			return nil, err
		}
	} else {
		_, err = tx.Exec(`
			UPDATE dsh_delivery_proofs
			SET status='accepted', reviewed_at=NOW(), reviewed_by_actor_id=$2,
			    review_reason=$3, accepted_at=NOW(), version=version+1, updated_at=NOW()
			WHERE id=$1::uuid AND version=$4`, proofID, operatorID, input.Reason, input.ExpectedVersion)
		if err != nil {
			return nil, err
		}
		proof.Status = DeliveryProofAccepted
		proof.ReviewedByActorID = operatorID
		proof.ReviewReason = input.Reason
		current, lockErr := lockAssignment(tx, proof.AssignmentID, proof.CaptainID)
		if lockErr != nil {
			return nil, lockErr
		}
		if current.Status != AssignmentAccepted || current.Delivery.Status != DeliveryArrivedCustomer {
			return nil, fmt.Errorf("%w: assignment moved before proof review", ErrConflict)
		}
		if err = ensureNoOpenDeliveryException(tx, proof.AssignmentID); err != nil {
			return nil, err
		}
		if err = finalizeAcceptedDeliveryProof(tx, current, proof, proof.CaptainID); err != nil {
			return nil, err
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetOperatorDeliveryProof(db, proofID)
}

func GetCaptainDeliveryProof(db *sql.DB, assignmentID, captainID string) (*DeliveryProof, error) {
	proof, _, err := scanDeliveryProofRow(db.QueryRow(deliveryProofSelectSQL()+`
		WHERE p.assignment_id=$1::uuid AND p.captain_id=$2
		ORDER BY p.created_at DESC LIMIT 1`, assignmentID, captainID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return proof, err
}

func GetClientDeliveryProof(db *sql.DB, orderID, clientID string) (*DeliveryProof, error) {
	proof, _, err := scanDeliveryProofRow(db.QueryRow(deliveryProofSelectSQL()+`
		JOIN dsh_orders o ON o.id=p.order_id
		WHERE p.order_id=$1::uuid AND o.client_id=$2 AND p.status='accepted'
		ORDER BY p.accepted_at DESC LIMIT 1`, orderID, clientID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return proof, err
}

func GetOperatorDeliveryProof(db *sql.DB, proofID string) (*DeliveryProof, error) {
	proof, _, err := scanDeliveryProofRow(db.QueryRow(deliveryProofSelectSQL()+` WHERE p.id=$1::uuid`, proofID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return proof, err
}

func ListOperatorDeliveryProofs(db *sql.DB, status DeliveryProofStatus, limit int) ([]DeliveryProof, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	query := deliveryProofSelectSQL()
	args := []any{}
	if status != "" {
		query += ` WHERE p.status=$1`
		args = append(args, string(status))
	}
	query += fmt.Sprintf(` ORDER BY p.submitted_at ASC LIMIT $%d`, len(args)+1)
	args = append(args, limit)
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	proofs := make([]DeliveryProof, 0)
	for rows.Next() {
		proof, _, scanErr := scanDeliveryProofRow(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		proofs = append(proofs, *proof)
	}
	return proofs, rows.Err()
}

func validateDeliveryProofInput(input SubmitDeliveryProofInput) error {
	switch input.Method {
	case DeliveryProofOTP:
		if input.PIN == "" {
			return fmt.Errorf("%w: PIN is required", ErrInvalid)
		}
	case DeliveryProofPhoto:
		if input.PhotoMediaRef == "" {
			return fmt.Errorf("%w: photoMediaRef is required", ErrInvalid)
		}
	case DeliveryProofSignature:
		if input.SignatureMediaRef == "" {
			return fmt.Errorf("%w: signatureMediaRef is required", ErrInvalid)
		}
	case DeliveryProofComposite:
		if input.PIN == "" || (input.PhotoMediaRef == "" && input.SignatureMediaRef == "") {
			return fmt.Errorf("%w: composite proof requires PIN and photo or signature", ErrInvalid)
		}
	default:
		return fmt.Errorf("%w: unsupported proof method", ErrInvalid)
	}
	if (input.CapturedLatitude == nil) != (input.CapturedLongitude == nil) {
		return fmt.Errorf("%w: latitude and longitude must be supplied together", ErrInvalid)
	}
	if input.CapturedLatitude != nil && (*input.CapturedLatitude < -90 || *input.CapturedLatitude > 90) {
		return fmt.Errorf("%w: latitude is out of range", ErrInvalid)
	}
	if input.CapturedLongitude != nil && (*input.CapturedLongitude < -180 || *input.CapturedLongitude > 180) {
		return fmt.Errorf("%w: longitude is out of range", ErrInvalid)
	}
	return nil
}

func validateDeliveryProofMedia(tx *sql.Tx, mediaRef, captainID, purpose string) error {
	var exists bool
	if err := tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM dsh_media_refs
			WHERE media_ref=$1 AND owner_actor_id=$2 AND owner_actor_role='captain'
			  AND purpose=$3 AND content_type LIKE 'image/%'
		)`, mediaRef, captainID, purpose).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("%w: proof media is missing, unowned, or has the wrong purpose", ErrInvalid)
	}
	return nil
}

func verifyDeliveryPIN(tx *sql.Tx, assignmentID, pin string) (string, error) {
	if len(pin) != deliveryPINLength {
		return "", fmt.Errorf("%w: delivery PIN is invalid", ErrConflict)
	}
	var id, storedHash string
	var expiresAt time.Time
	var failedAttempts, maxAttempts int
	var consumedAt sql.NullTime
	err := tx.QueryRow(`
		SELECT id::text, pin_hash, pin_expires_at, failed_attempts, max_attempts, consumed_at
		FROM dsh_delivery_verification_challenges
		WHERE assignment_id=$1::uuid
		FOR UPDATE`, assignmentID).Scan(&id, &storedHash, &expiresAt, &failedAttempts, &maxAttempts, &consumedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return "", fmt.Errorf("%w: delivery PIN has not been issued", ErrConflict)
	}
	if err != nil {
		return "", err
	}
	if consumedAt.Valid || time.Now().UTC().After(expiresAt) || failedAttempts >= maxAttempts {
		return "", fmt.Errorf("%w: delivery PIN expired or locked", ErrConflict)
	}
	candidate := hashDeliveryPIN(assignmentID, pin)
	if subtle.ConstantTimeCompare([]byte(candidate), []byte(storedHash)) != 1 {
		_, _ = tx.Exec(`
			UPDATE dsh_delivery_verification_challenges
			SET failed_attempts=failed_attempts+1, version=version+1, updated_at=NOW()
			WHERE id=$1::uuid`, id)
		return "", fmt.Errorf("%w: delivery PIN is invalid", ErrConflict)
	}
	return id, nil
}

func insertDeliveryProof(
	tx *sql.Tx,
	current *Assignment,
	input SubmitDeliveryProofInput,
	challengeID,
	fingerprint string,
	capturedAt time.Time,
	status DeliveryProofStatus,
) (*DeliveryProof, error) {
	var acceptedAt any
	if status == DeliveryProofAccepted {
		acceptedAt = time.Now().UTC()
	}
	proof, _, err := scanDeliveryProofRow(tx.QueryRow(`
		INSERT INTO dsh_delivery_proofs
			(assignment_id,order_id,captain_id,verification_challenge_id,method,status,
			 photo_media_ref,signature_media_ref,captured_latitude,captured_longitude,captured_at,
			 accepted_at,idempotency_key,request_fingerprint)
		VALUES ($1::uuid,$2::uuid,$3,NULLIF($4,'')::uuid,$5,$6,NULLIF($7,''),NULLIF($8,''),$9,$10,$11,$12,$13,$14)
		RETURNING id::text,assignment_id::text,order_id::text,captain_id,
			COALESCE(verification_challenge_id::text,''),method,status,
			COALESCE(photo_media_ref,''),COALESCE(signature_media_ref,''),
			captured_latitude,captured_longitude,captured_at,submitted_at,reviewed_at,
			COALESCE(reviewed_by_actor_id,''),COALESCE(review_reason,''),accepted_at,rejected_at,
			idempotency_key,request_fingerprint,version,created_at,updated_at`,
		current.ID, current.OrderID, current.CaptainID, challengeID, string(input.Method), string(status),
		input.PhotoMediaRef, input.SignatureMediaRef, input.CapturedLatitude, input.CapturedLongitude,
		capturedAt, acceptedAt, input.IdempotencyKey, fingerprint,
	))
	return proof, err
}

func finalizeAcceptedDeliveryProof(tx *sql.Tx, current *Assignment, proof *DeliveryProof, captainID string) error {
	if current.OrderID == "" {
		return fmt.Errorf("%w: proof completion requires an order", ErrInvalid)
	}
	if _, err := orders.TransitionDispatchOrder(tx, current.OrderID, "captain",
		[]orders.OrderStatus{orders.StatusArrivedCustomer}, orders.StatusDelivered, "governed proof of delivery accepted"); err != nil {
		return mapOrderError(err)
	}
	proofReference := proof.PhotoMediaRef
	if proofReference == "" {
		proofReference = proof.SignatureMediaRef
	}
	if proofReference == "" {
		proofReference = proof.VerificationChallengeID
	}
	if _, err := tx.Exec(`
		UPDATE dsh_deliveries
		SET status='delivered', pod_method=$1, pod_reference=$2, delivery_proof_id=$3::uuid,
		    pod_review_status='accepted', pod_verified_at=NOW(), updated_at=NOW()
		WHERE assignment_id=$4::uuid AND captain_id=$5 AND status='arrived_customer'`,
		string(proof.Method), proofReference, proof.ID, proof.AssignmentID, captainID); err != nil {
		return err
	}
	result, err := tx.Exec(`
		UPDATE dsh_assignments
		SET status='completed', completed_at=NOW(), updated_at=NOW(),
		    last_latitude=NULL, last_longitude=NULL, location_recorded_at=NULL
		WHERE id=$1::uuid AND captain_id=$2 AND status='accepted'`, proof.AssignmentID, captainID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return fmt.Errorf("%w: assignment completion lost its expected state", ErrConflict)
	}
	if proof.VerificationChallengeID != "" {
		if _, err = tx.Exec(`
			UPDATE dsh_delivery_verification_challenges
			SET consumed_at=COALESCE(consumed_at,NOW()), version=version+1, updated_at=NOW()
			WHERE id=$1::uuid`, proof.VerificationChallengeID); err != nil {
			return err
		}
	}
	return enqueueJRN018WltCompletion(tx, current.OrderID, captainID)
}

func enqueueJRN018WltCompletion(tx *sql.Tx, orderID, captainID string) error {
	ctx, err := orders.GetOrderDeliveryContext(tx, orderID)
	if err != nil {
		return fmt.Errorf("resolve delivery context for WLT completion: %w", err)
	}
	if strings.TrimSpace(ctx.PartnerID) == "" || strings.TrimSpace(ctx.CheckoutIntentID) == "" {
		return fmt.Errorf("delivery completion requires partner and checkout intent references")
	}
	return wltoutbox.EnqueueDeliveryCompleted(
		tx,
		orderID,
		wltoutbox.CollectorCaptain,
		captainID,
		ctx.PartnerID,
		ctx.CheckoutIntentID,
	)
}

func getDeliveryProofByIdempotency(tx *sql.Tx, assignmentID, key, fingerprint string) (*DeliveryProof, error) {
	proof, storedFingerprint, err := scanDeliveryProofRow(tx.QueryRow(deliveryProofSelectSQL()+`
		WHERE p.assignment_id=$1::uuid AND p.idempotency_key=$2`, assignmentID, key))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if storedFingerprint != fingerprint {
		return nil, ErrIdempotencyConflict
	}
	return proof, nil
}

func deliveryProofSelectSQL() string {
	return `SELECT p.id::text,p.assignment_id::text,p.order_id::text,p.captain_id,
		COALESCE(p.verification_challenge_id::text,''),p.method,p.status,
		COALESCE(p.photo_media_ref,''),COALESCE(p.signature_media_ref,''),
		p.captured_latitude,p.captured_longitude,p.captured_at,p.submitted_at,p.reviewed_at,
		COALESCE(p.reviewed_by_actor_id,''),COALESCE(p.review_reason,''),p.accepted_at,p.rejected_at,
		p.idempotency_key,p.request_fingerprint,p.version,p.created_at,p.updated_at
	FROM dsh_delivery_proofs p`
}

type deliveryProofScanner interface {
	Scan(dest ...any) error
}

func scanDeliveryProofRow(scanner deliveryProofScanner) (*DeliveryProof, string, error) {
	var proof DeliveryProof
	var method, status, fingerprint string
	var lat, lng sql.NullFloat64
	var reviewedAt, acceptedAt, rejectedAt sql.NullTime
	err := scanner.Scan(
		&proof.ID, &proof.AssignmentID, &proof.OrderID, &proof.CaptainID,
		&proof.VerificationChallengeID, &method, &status,
		&proof.PhotoMediaRef, &proof.SignatureMediaRef,
		&lat, &lng, &proof.CapturedAt, &proof.SubmittedAt, &reviewedAt,
		&proof.ReviewedByActorID, &proof.ReviewReason, &acceptedAt, &rejectedAt,
		&proof.IdempotencyKey, &fingerprint, &proof.Version, &proof.CreatedAt, &proof.UpdatedAt,
	)
	if err != nil {
		return nil, "", err
	}
	proof.Method = DeliveryProofMethod(method)
	proof.Status = DeliveryProofStatus(status)
	if lat.Valid {
		proof.CapturedLatitude = &lat.Float64
	}
	if lng.Valid {
		proof.CapturedLongitude = &lng.Float64
	}
	if reviewedAt.Valid {
		proof.ReviewedAt = &reviewedAt.Time
	}
	if acceptedAt.Valid {
		proof.AcceptedAt = &acceptedAt.Time
	}
	if rejectedAt.Valid {
		proof.RejectedAt = &rejectedAt.Time
	}
	return &proof, fingerprint, nil
}

func randomDeliveryPIN() (string, error) {
	max := big.NewInt(1000000)
	value, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("generate delivery PIN: %w", err)
	}
	return fmt.Sprintf("%06d", value.Int64()), nil
}

func hashDeliveryPIN(assignmentID, pin string) string {
	sum := sha256.Sum256([]byte(assignmentID + ":" + pin))
	return fmt.Sprintf("%x", sum[:])
}

func deliveryProofFingerprint(assignmentID, captainID string, input SubmitDeliveryProofInput, capturedAt time.Time) string {
	lat, lng := "", ""
	if input.CapturedLatitude != nil {
		lat = fmt.Sprintf("%.7f", *input.CapturedLatitude)
	}
	if input.CapturedLongitude != nil {
		lng = fmt.Sprintf("%.7f", *input.CapturedLongitude)
	}
	raw := strings.Join([]string{
		assignmentID,
		captainID,
		string(input.Method),
		input.PIN,
		input.PhotoMediaRef,
		input.SignatureMediaRef,
		lat,
		lng,
		capturedAt.UTC().Format(time.RFC3339Nano),
	}, "|")
	sum := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", sum[:])
}
