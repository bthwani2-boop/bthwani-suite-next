package partner

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

var (
	ErrSelfApprovalForbidden  = errors.New("actor cannot approve evidence or a partner that the same actor created")
	ErrDecisionReasonRequired = errors.New("review decisions require a non-empty reason")
)

const reviewDecisionBodyLimit = 64 * 1024

type partnerDecisionEnvelope struct {
	ToStatus ActivationStatus `json:"toStatus"`
	Reason   string           `json:"reason"`
}

type documentDecisionEnvelope struct {
	Decision string `json:"decision"`
	Reason   string `json:"reason"`
}

func readAndRestoreDecisionBody(w http.ResponseWriter, r *http.Request, target any) error {
	payload, err := io.ReadAll(http.MaxBytesReader(w, r.Body, reviewDecisionBodyLimit))
	if err != nil {
		return err
	}
	r.Body = io.NopCloser(bytes.NewReader(payload))
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	return nil
}

func partnerTransitionNeedsIndependentDecision(status ActivationStatus) bool {
	switch status {
	case StatusOpsApproved, StatusPartnerActive:
		return true
	default:
		return false
	}
}

func partnerTransitionNeedsReason(status ActivationStatus) bool {
	switch status {
	case StatusOpsApproved, StatusOpsRejected, StatusPartnerSuspended, StatusPartnerTerminated:
		return true
	default:
		return false
	}
}

// EnforcePartnerDecisionSeparation prevents a creator from approving or
// activating the same Partner, and makes every approval/rejection/suspension
// decision carry an auditable reason. It deliberately delegates the mutation
// to the existing governed transition handler so there remains one state
// machine, one optimistic-concurrency path, and one audit writer.
func EnforcePartnerDecisionSeparation(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var decision partnerDecisionEnvelope
		if err := readAndRestoreDecisionBody(w, r, &decision); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid transition request body")
			return
		}
		if partnerTransitionNeedsReason(decision.ToStatus) && strings.TrimSpace(decision.Reason) == "" {
			sendError(w, http.StatusBadRequest, "DECISION_REASON_REQUIRED", ErrDecisionReasonRequired.Error())
			return
		}
		if partnerTransitionNeedsIndependentDecision(decision.ToStatus) {
			actorID, _ := actorFromContext(r)
			current, err := GetPartner(db, partnerIDFromPath(r))
			switch {
			case errors.Is(err, ErrNotFound):
				sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
				return
			case err != nil:
				sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify review separation")
				return
			case strings.TrimSpace(actorID) == "":
				sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "authenticated reviewer is required")
				return
			case strings.TrimSpace(current.CreatedByActorID) == strings.TrimSpace(actorID):
				sendError(w, http.StatusForbidden, "SELF_APPROVAL_FORBIDDEN", ErrSelfApprovalForbidden.Error())
				return
			}
		}
		next(w, r)
	}
}

// EnforcePartnerDocumentReviewSeparation prevents an uploader from reviewing
// the same evidence and requires a reason for every review decision. The
// document uploader is immutable, so this precondition cannot race with the
// existing transactional document review mutation.
func EnforcePartnerDocumentReviewSeparation(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var decision documentDecisionEnvelope
		if err := readAndRestoreDecisionBody(w, r, &decision); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid document review request body")
			return
		}
		if strings.TrimSpace(decision.Reason) == "" {
			sendError(w, http.StatusBadRequest, "DECISION_REASON_REQUIRED", ErrDecisionReasonRequired.Error())
			return
		}
		actorID, _ := actorFromContext(r)
		if strings.TrimSpace(actorID) == "" {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "authenticated reviewer is required")
			return
		}
		var uploadedByActorID string
		err := db.QueryRow(`
			SELECT uploaded_by_actor_id
			FROM dsh_partner_documents
			WHERE id = $1 AND partner_id = $2`,
			documentIDFromPath(r), partnerIDFromPath(r),
		).Scan(&uploadedByActorID)
		switch {
		case errors.Is(err, sql.ErrNoRows):
			sendError(w, http.StatusNotFound, "NOT_FOUND", "document not found")
			return
		case err != nil:
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify document review separation")
			return
		case strings.TrimSpace(uploadedByActorID) == strings.TrimSpace(actorID):
			sendError(w, http.StatusForbidden, "SELF_APPROVAL_FORBIDDEN", ErrSelfApprovalForbidden.Error())
			return
		}
		next(w, r)
	}
}
