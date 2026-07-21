package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"dsh-api/internal/wlt"
)

func HandleGovernedGetPartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		p, err := GetPartnerSanitized(db, partnerIDFromPath(r))
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get partner")
			return
		}
		sendJSON(w, http.StatusOK, p)
	}
}

func HandleGovernedFieldGetPartner(db *sql.DB) http.HandlerFunc {
	inner := HandleGovernedGetPartner(db)
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		if !requireFieldOwnsPartner(w, db, partnerIDFromPath(r), actorID) {
			return
		}
		inner(w, r)
	}
}

func HandleGovernedFieldUpdatePartner(db *sql.DB, wltClient *wlt.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		if !requireFieldOwnsPartner(w, db, partnerID, actorID) {
			return
		}
		expectedVersion := expectedPartnerVersion(r)
		if expectedVersion < 1 {
			sendError(w, http.StatusPreconditionRequired, "EXPECTED_VERSION_REQUIRED", "a positive partner version is required")
			return
		}

		var input UpdatePartnerInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		current, err := GetPartner(db, partnerID)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner")
			return
		}

		rawAccount := unmaskedPayoutValue(input.BankAccountNumber)
		rawIBAN := unmaskedPayoutValue(input.BankIBAN)
		rawMobile := unmaskedPayoutValue(input.PayoutMobileNumber)
		preference, preferenceOK := normalizeDshPayoutPreference(input.SettlementPreference)
		metadataChanged := payoutMetadataChanged(current, input)
		payoutMutation := rawAccount != "" || rawIBAN != "" || rawMobile != "" || metadataChanged

		if payoutMutation {
			if !preferenceOK {
				sendError(w, http.StatusUnprocessableEntity, "PAYOUT_DESTINATION_INVALID", "select a supported settlement preference")
				return
			}
			if rawAccount == "" && rawMobile == "" {
				sendError(w, http.StatusUnprocessableEntity, "PAYOUT_DETAILS_REENTRY_REQUIRED", "re-enter the payout account or mobile number before changing payout metadata")
				return
			}
			if wltClient == nil || !wltClient.Configured() {
				sendError(w, http.StatusServiceUnavailable, "WLT_UNAVAILABLE", "WLT payout destination service is not configured")
				return
			}
			idempotency := strings.TrimSpace(idempotencyKey(r))
			if idempotency == "" {
				idempotency = governedMutationKey(
					"partner-payout", partnerID, strconv.Itoa(expectedVersion),
					rawAccount, rawIBAN, rawMobile, preference,
				)
			}
			correlation := strings.TrimSpace(correlationID(r))
			if correlation == "" {
				correlation = governedMutationKey("partner-payout-correlation", partnerID, idempotency)
			}
			ref, handoffErr := wltClient.UpsertPayoutDestination(r.Context(), partnerID, wlt.PayoutDestinationUpsertInput{
				BeneficiaryName: input.BeneficiaryName,
				BankName: input.BankName,
				BankBranch: input.BankBranch,
				AccountNumber: rawAccount,
				IBAN: rawIBAN,
				PayoutMobileNumber: rawMobile,
				SettlementPreference: preference,
				BankAccountHolderMatchesOwner: boolValue(input.BankAccountHolderMatchesOwner),
				BankNotes: input.BankNotes,
				CreatedByActorID: actorID,
				CorrelationID: correlation,
				IdempotencyKey: idempotency,
			})
			if handoffErr != nil {
				sendError(w, http.StatusBadGateway, "WLT_PAYOUT_HANDOFF_FAILED", handoffErr.Error())
				return
			}
			input.PayoutDestinationID = ref.ID
			input.MaskedAccountNumber = ref.MaskedAccountNumber
			input.MaskedIBAN = ref.MaskedIBAN
			input.MaskedMobileNumber = ref.MaskedMobileNumber
			input.BeneficiaryName = ref.BeneficiaryName
			input.BankName = ref.BankName
			input.BankBranch = ref.BankBranch
			input.SettlementPreference = dshPayoutPreference(ref.SettlementPreference)
		}
		input.BankAccountNumber = ""
		input.BankIBAN = ""
		input.PayoutMobileNumber = ""
		input.UpdatedByActorID = actorID

		updated, err := UpdatePartnerGoverned(db, partnerID, input, expectedVersion)
		if errors.Is(err, ErrExpectedVersionRequired) {
			sendError(w, http.StatusPreconditionRequired, "EXPECTED_VERSION_REQUIRED", err.Error())
			return
		}
		if errors.Is(err, ErrVersionConflict) {
			sendError(w, http.StatusConflict, "VERSION_CONFLICT", "partner was modified concurrently")
			return
		}
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update partner")
			return
		}
		sendJSON(w, http.StatusOK, updated)
	}
}

func HandleGovernedActivationTransition(db *sql.DB, wltClient *wlt.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, surface := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		expectedVersion := expectedPartnerVersion(r)
		if expectedVersion < 1 {
			sendError(w, http.StatusPreconditionRequired, "EXPECTED_VERSION_REQUIRED", "a positive partner version is required")
			return
		}
		var input TransitionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.ActorID = actorID
		input.ActorSurface = surface
		input.CorrelationID = strings.TrimSpace(correlationID(r))
		input.IdempotencyKey = strings.TrimSpace(idempotencyKey(r))
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = governedMutationKey("partner-transition", partnerID, strconv.Itoa(expectedVersion), string(input.ToStatus), input.Reason)
		}

		current, err := GetPartner(db, partnerID)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner")
			return
		}
		if input.ToStatus == StatusPartnerDeactivated && current.PayoutDestinationID != "" && (wltClient == nil || !wltClient.Configured()) {
			sendError(w, http.StatusServiceUnavailable, "WLT_UNAVAILABLE", "WLT is required before deactivating a partner with an active payout destination")
			return
		}

		updated, event, err := TransitionStatusGoverned(r.Context(), db, partnerID, input, expectedVersion)
		if writeGovernedTransitionError(w, err) {
			return
		}

		if input.ToStatus == StatusPartnerDeactivated && updated.PayoutDestinationID != "" {
			if err := wltClient.DeactivatePayoutDestination(
				r.Context(), partnerID, actorID, input.CorrelationID,
				governedMutationKey("partner-payout-deactivate", partnerID, event.ID),
			); err != nil {
				sendError(w, http.StatusBadGateway, "PAYOUT_DEACTIVATION_PENDING", "partner is deactivated in DSH; retry to complete WLT payout deactivation")
				return
			}
		}
		sendJSON(w, http.StatusOK, map[string]any{"partner": updated, "event": event})
	}
}

func HandleGovernedLinkPartnerStore(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		var input struct {
			StoreID string `json:"storeId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		stores, err := LinkPartnerStoreGoverned(r.Context(), db, partnerIDFromPath(r), input.StoreID, actorID)
		if errors.Is(err, ErrInvalid) {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "partnerId, storeId, and actor are required")
			return
		}
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner or store not found")
			return
		}
		if errors.Is(err, ErrStoreOwnershipConflict) {
			sendError(w, http.StatusConflict, "STORE_OWNERSHIP_CONFLICT", "store already belongs to another partner")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to link partner store")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"stores": stores, "total": len(stores)})
	}
}

func HandleGovernedFieldSubmitPartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		if !requireFieldOwnsPartner(w, db, partnerID, actorID) {
			return
		}
		var body struct {
			Reason string `json:"reason"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)

		current, err := GetPartner(db, partnerID)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner")
			return
		}
		if current.ActivationStatus == StatusSubmitted {
			event, eventErr := FindLatestTransitionEvent(db, partnerID, StatusSubmitted)
			if eventErr != nil {
				sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "submitted transition audit is missing")
				return
			}
			sendJSON(w, http.StatusOK, map[string]any{"partner": SanitizePartnerForSurface(current), "event": event})
			return
		}

		input := TransitionInput{
			ToStatus: StatusSubmitted,
			Reason: body.Reason,
			ActorID: actorID,
			ActorSurface: "app-field",
			CorrelationID: strings.TrimSpace(correlationID(r)),
			IdempotencyKey: strings.TrimSpace(idempotencyKey(r)),
		}
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = governedMutationKey("field-partner-submit", partnerID, strconv.Itoa(current.Version))
		}
		updated, event, err := TransitionStatusGoverned(r.Context(), db, partnerID, input, current.Version)
		if writeGovernedTransitionError(w, err) {
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"partner": updated, "event": event})
	}
}

func HandleGovernedFieldCreateVisit(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		if !requireFieldOwnsPartner(w, db, partnerID, actorID) {
			return
		}
		var input CreateFieldVisitInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.PartnerID = partnerID
		input.FieldActorID = actorID
		visit, err := CreateFieldVisitGoverned(db, input)
		if errors.Is(err, ErrInvalid) || errors.Is(err, ErrReadinessGate) {
			sendError(w, http.StatusUnprocessableEntity, "FIELD_VISIT_EVIDENCE_REQUIRED", err.Error())
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create field visit")
			return
		}
		sendJSON(w, http.StatusCreated, visit)
	}
}

func writeGovernedTransitionError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	switch {
	case errors.Is(err, ErrNotFound):
		sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
	case errors.Is(err, ErrExpectedVersionRequired):
		sendError(w, http.StatusPreconditionRequired, "EXPECTED_VERSION_REQUIRED", err.Error())
	case errors.Is(err, ErrVersionConflict):
		sendError(w, http.StatusConflict, "VERSION_CONFLICT", "partner was modified concurrently")
	case errors.Is(err, ErrIdempotencyConflict):
		sendError(w, http.StatusConflict, "IDEMPOTENCY_KEY_REUSED", err.Error())
	case errors.Is(err, ErrInvalidTransition):
		sendError(w, http.StatusUnprocessableEntity, "INVALID_TRANSITION", "transition not allowed from current status")
	case errors.Is(err, ErrReadinessGate):
		sendError(w, http.StatusUnprocessableEntity, "PARTNER_READINESS_GATES_FAILED", err.Error())
	case errors.Is(err, ErrStorePublicationGatesFailed):
		sendError(w, http.StatusUnprocessableEntity, "STORE_PUBLICATION_GATES_FAILED", err.Error())
	case errors.Is(err, ErrInvalid):
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "transition reason or input is invalid")
	default:
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "transition failed")
	}
	return true
}

func expectedPartnerVersion(r *http.Request) int {
	if version := versionFromQuery(r); version > 0 {
		return version
	}
	version, _ := strconv.Atoi(strings.TrimSpace(r.Header.Get("If-Match-Version")))
	return version
}

func unmaskedPayoutValue(value string) string {
	value = strings.TrimSpace(value)
	if strings.Contains(value, "*") || strings.Contains(value, "•") {
		return ""
	}
	return value
}

func normalizeDshPayoutPreference(value string) (string, bool) {
	switch strings.TrimSpace(value) {
	case "bank_transfer", "bank":
		return "bank", true
	case "mobile_wallet", "mobile_money":
		return "mobile_money", true
	case "manual":
		return "manual", true
	default:
		return "", false
	}
}

func dshPayoutPreference(value string) string {
	switch value {
	case "bank":
		return "bank_transfer"
	case "mobile_money":
		return "mobile_wallet"
	case "manual":
		return ""
	default:
		return ""
	}
}

func payoutMetadataChanged(current Partner, input UpdatePartnerInput) bool {
	preference := strings.TrimSpace(input.SettlementPreference)
	return (strings.TrimSpace(input.BeneficiaryName) != "" && strings.TrimSpace(input.BeneficiaryName) != strings.TrimSpace(current.BeneficiaryName)) ||
		(strings.TrimSpace(input.BankName) != "" && strings.TrimSpace(input.BankName) != strings.TrimSpace(current.BankName)) ||
		(strings.TrimSpace(input.BankBranch) != "" && strings.TrimSpace(input.BankBranch) != strings.TrimSpace(current.BankBranch)) ||
		(preference != "" && preference != strings.TrimSpace(current.SettlementPreference)) ||
		(strings.TrimSpace(input.BankNotes) != "" && strings.TrimSpace(input.BankNotes) != strings.TrimSpace(current.BankNotes))
}

func boolValue(value *bool) bool {
	return value != nil && *value
}

var _ = fmt.Sprintf
