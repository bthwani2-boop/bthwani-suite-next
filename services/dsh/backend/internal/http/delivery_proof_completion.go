package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleIssueDeliveryPIN(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	issued, err := dispatch.IssueDeliveryPIN(s.db, r.PathValue("orderId"), actor.ID)
	if err != nil {
		writeDeliveryProofError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{
		"challenge": map[string]any{
			"id": issued.Challenge.ID,
			"orderId": issued.Challenge.OrderID,
			"assignmentId": issued.Challenge.AssignmentID,
			"expiresAt": issued.Challenge.ExpiresAt,
			"maxAttempts": issued.Challenge.MaxAttempts,
			"version": issued.Challenge.Version,
		},
		"pin": issued.PIN,
	})
}

func deliveryProofIdempotencyKey(r *http.Request, fallback string) string {
	return firstNonEmpty(
		strings.TrimSpace(r.Header.Get("X-Idempotency-Key")),
		strings.TrimSpace(r.Header.Get("Idempotency-Key")),
		strings.TrimSpace(fallback),
	)
}

func normalizeDeliveryEvidenceKind(raw string) string {
	if strings.EqualFold(strings.TrimSpace(raw), "signature") {
		return "signature"
	}
	return "photo"
}

func (s *protectedStoreServer) handleSubmitGovernedDeliveryProof(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	assignmentID := strings.TrimSpace(r.PathValue("assignmentId"))
	if assignmentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "assignmentId is required")
		return
	}

	var input dispatch.SubmitDeliveryProofInput
	var uploaded uploadedDeliveryProof
	var uploadedMediaRef string

	if isMultipartRequest(r) {
		var uploadedOK bool
		uploaded, uploadedOK = s.uploadDeliveryProofObject(w, r, "dsh-delivery-proofs", actor.ID)
		if !uploadedOK {
			return
		}
		evidenceKind := normalizeDeliveryEvidenceKind(r.FormValue("evidenceKind"))
		purpose := "delivery_proof"
		if evidenceKind == "signature" {
			purpose = "delivery_signature"
		}
		if err := s.db.QueryRowContext(r.Context(), `
			INSERT INTO dsh_media_refs
				(storage_key, owner_actor_id, owner_actor_role, purpose, content_type, original_filename)
			VALUES ($1,$2,'captain',$3,$4,$5)
			RETURNING media_ref`, uploaded.storageKey, actor.ID, purpose, uploaded.contentType, uploaded.fileName).Scan(&uploadedMediaRef); err != nil {
			s.removeDeliveryProofObject(r, "", uploaded.storageKey)
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register delivery proof")
			return
		}

		pin := strings.TrimSpace(r.FormValue("pin"))
		method := dispatch.DeliveryProofMethod(strings.TrimSpace(r.FormValue("method")))
		if method == "" {
			if evidenceKind == "signature" {
				method = dispatch.DeliveryProofSignature
			} else {
				method = dispatch.DeliveryProofPhoto
			}
			if pin != "" {
				method = dispatch.DeliveryProofComposite
			}
		}
		input = dispatch.SubmitDeliveryProofInput{
			Method:         method,
			PIN:            pin,
			IdempotencyKey: deliveryProofIdempotencyKey(r, r.FormValue("idempotencyKey")),
		}
		if evidenceKind == "signature" {
			input.SignatureMediaRef = uploadedMediaRef
		} else {
			input.PhotoMediaRef = uploadedMediaRef
		}
		if capturedAt := strings.TrimSpace(r.FormValue("capturedAt")); capturedAt != "" {
			parsed, err := time.Parse(time.RFC3339, capturedAt)
			if err != nil {
				s.removeDeliveryProofObject(r, uploadedMediaRef, uploaded.storageKey)
				store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "capturedAt must be RFC3339")
				return
			}
			input.CapturedAt = &parsed
		}
		if lat, lng, parsed := parseDeliveryProofCoordinates(r.FormValue("latitude"), r.FormValue("longitude")); parsed {
			input.CapturedLatitude = lat
			input.CapturedLongitude = lng
		} else if strings.TrimSpace(r.FormValue("latitude")) != "" || strings.TrimSpace(r.FormValue("longitude")) != "" {
			s.removeDeliveryProofObject(r, uploadedMediaRef, uploaded.storageKey)
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "latitude and longitude must be valid numbers")
			return
		}
	} else {
		var body struct {
			Method            dispatch.DeliveryProofMethod `json:"method"`
			PIN               string                       `json:"pin"`
			PhotoMediaRef     string                       `json:"photoMediaRef"`
			SignatureMediaRef string                       `json:"signatureMediaRef"`
			CapturedLatitude  *float64                     `json:"capturedLatitude"`
			CapturedLongitude *float64                     `json:"capturedLongitude"`
			CapturedAt        string                       `json:"capturedAt"`
			IdempotencyKey    string                       `json:"idempotencyKey"`
		}
		if !decodeProtectedJSON(w, r, &body) {
			return
		}
		input = dispatch.SubmitDeliveryProofInput{
			Method:            body.Method,
			PIN:               strings.TrimSpace(body.PIN),
			PhotoMediaRef:     strings.TrimSpace(body.PhotoMediaRef),
			SignatureMediaRef: strings.TrimSpace(body.SignatureMediaRef),
			CapturedLatitude:  body.CapturedLatitude,
			CapturedLongitude: body.CapturedLongitude,
			IdempotencyKey:    deliveryProofIdempotencyKey(r, body.IdempotencyKey),
		}
		if strings.TrimSpace(body.CapturedAt) != "" {
			parsed, err := time.Parse(time.RFC3339, body.CapturedAt)
			if err != nil {
				store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "capturedAt must be RFC3339")
				return
			}
			input.CapturedAt = &parsed
		}
	}

	proof, err := dispatch.SubmitDeliveryProof(s.db, assignmentID, actor.ID, input)
	if err != nil {
		if uploadedMediaRef != "" {
			s.removeDeliveryProofObject(r, uploadedMediaRef, uploaded.storageKey)
		}
		writeDeliveryProofError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proof": marshalDeliveryProof(proof, true)})
}

func (s *protectedStoreServer) handleGetCaptainDeliveryProof(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	proof, err := dispatch.GetCaptainDeliveryProof(s.db, r.PathValue("assignmentId"), actor.ID)
	if err != nil {
		writeDeliveryProofError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proof": marshalDeliveryProof(proof, true)})
}

func (s *protectedStoreServer) handleGetClientDeliveryProof(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	proof, err := dispatch.GetClientDeliveryProof(s.db, r.PathValue("orderId"), actor.ID)
	if err != nil {
		writeDeliveryProofError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proof": marshalClientDeliveryProof(proof)})
}

func (s *protectedStoreServer) handleListOperatorDeliveryProofs(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	status := dispatch.DeliveryProofStatus(strings.TrimSpace(r.URL.Query().Get("status")))
	proofs, err := dispatch.ListOperatorDeliveryProofs(s.db, status, 100)
	if err != nil {
		writeDeliveryProofError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(proofs))
	for i := range proofs {
		out = append(out, marshalDeliveryProof(&proofs[i], true))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proofs": out})
}

func (s *protectedStoreServer) handleGetOperatorDeliveryProof(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	proof, err := dispatch.GetOperatorDeliveryProof(s.db, r.PathValue("proofId"))
	if err != nil {
		writeDeliveryProofError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proof": marshalDeliveryProof(proof, true)})
}

func (s *protectedStoreServer) handleAcceptOperatorDeliveryProof(w http.ResponseWriter, r *http.Request) {
	s.handleReviewOperatorDeliveryProof(w, r, true)
}

func (s *protectedStoreServer) handleRejectOperatorDeliveryProof(w http.ResponseWriter, r *http.Request) {
	s.handleReviewOperatorDeliveryProof(w, r, false)
}

func (s *protectedStoreServer) handleReviewOperatorDeliveryProof(w http.ResponseWriter, r *http.Request, accept bool) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	proof, err := dispatch.ReviewDeliveryProof(s.db, r.PathValue("proofId"), actor.ID, dispatch.ReviewDeliveryProofInput{
		ExpectedVersion: body.ExpectedVersion,
		Reason:          strings.TrimSpace(body.Reason),
		Accept:          accept,
	})
	if err != nil {
		writeDeliveryProofError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proof": marshalDeliveryProof(proof, true)})
}

func marshalDeliveryProof(proof *dispatch.DeliveryProof, includeSensitive bool) map[string]any {
	out := map[string]any{
		"id": proof.ID,
		"assignmentId": proof.AssignmentID,
		"orderId": proof.OrderID,
		"captainId": proof.CaptainID,
		"method": string(proof.Method),
		"status": string(proof.Status),
		"hasPhoto": proof.PhotoMediaRef != "",
		"hasSignature": proof.SignatureMediaRef != "",
		"capturedAt": proof.CapturedAt,
		"submittedAt": proof.SubmittedAt,
		"reviewedAt": proof.ReviewedAt,
		"reviewReason": proof.ReviewReason,
		"acceptedAt": proof.AcceptedAt,
		"rejectedAt": proof.RejectedAt,
		"version": proof.Version,
	}
	if includeSensitive {
		out["photoMediaRef"] = proof.PhotoMediaRef
		out["signatureMediaRef"] = proof.SignatureMediaRef
		out["capturedLatitude"] = proof.CapturedLatitude
		out["capturedLongitude"] = proof.CapturedLongitude
		out["reviewedByActorId"] = proof.ReviewedByActorID
	}
	return out
}

func marshalClientDeliveryProof(proof *dispatch.DeliveryProof) map[string]any {
	return map[string]any{
		"id": proof.ID,
		"orderId": proof.OrderID,
		"method": string(proof.Method),
		"status": string(proof.Status),
		"hasPhoto": proof.PhotoMediaRef != "",
		"hasSignature": proof.SignatureMediaRef != "",
		"capturedAt": proof.CapturedAt,
		"acceptedAt": proof.AcceptedAt,
	}
}

func writeDeliveryProofError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, dispatch.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "DELIVERY_PROOF_NOT_FOUND", "delivery proof was not found")
	case errors.Is(err, dispatch.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used with a different delivery proof")
	case errors.Is(err, dispatch.ErrConflict):
		store.SendError(w, http.StatusConflict, "DELIVERY_PROOF_CONFLICT", err.Error())
	case errors.Is(err, dispatch.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "delivery proof operation failed")
	}
}

func parseDeliveryProofCoordinates(rawLatitude, rawLongitude string) (*float64, *float64, bool) {
	rawLatitude = strings.TrimSpace(rawLatitude)
	rawLongitude = strings.TrimSpace(rawLongitude)
	if rawLatitude == "" && rawLongitude == "" {
		return nil, nil, true
	}
	if rawLatitude == "" || rawLongitude == "" {
		return nil, nil, false
	}
	latitude, err := strconv.ParseFloat(rawLatitude, 64)
	if err != nil {
		return nil, nil, false
	}
	longitude, err := strconv.ParseFloat(rawLongitude, 64)
	if err != nil {
		return nil, nil, false
	}
	return &latitude, &longitude, true
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
