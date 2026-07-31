package http

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

const maxOperationalPolicyGuardBodyBytes = 1 << 20

type operationalPolicyMutationEnvelope struct {
	StoreID          string `json:"storeId"`
	FulfillmentMode  string `json:"fulfillmentMode"`
	CheckoutIntentID string `json:"checkoutIntentId"`
	OrderID          string `json:"orderId"`
}

type operationalPolicyEffectTarget struct {
	StoreID         string
	FulfillmentMode string
	Effect          string
}

const (
	operationalEffectCart     = "cart"
	operationalEffectCheckout = "checkout"
	operationalEffectOrder    = "order"
	operationalEffectDispatch = "dispatch"
)

// OperationalPolicyEffectsMiddleware enforces the canonical policy decision
// before cart mutation/serviceability,
// checkout, order creation, and dispatch assignment. Existing handlers remain
// responsible for actor authorization, address geofences, pricing, payment and
// state-machine validation.
func OperationalPolicyEffectsMiddleware(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || !isOperationalPolicyGuardedPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		if r.Body == nil {
			next.ServeHTTP(w, r)
			return
		}

		payload, err := io.ReadAll(io.LimitReader(r.Body, maxOperationalPolicyGuardBodyBytes+1))
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "request body could not be read")
			return
		}
		if len(payload) > maxOperationalPolicyGuardBodyBytes {
			store.SendError(w, http.StatusRequestEntityTooLarge, "REQUEST_BODY_TOO_LARGE", "request body exceeds the operational policy guard limit")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(payload))

		var body operationalPolicyMutationEnvelope
		if len(payload) == 0 || json.Unmarshal(payload, &body) != nil {
			// The owning handler returns the canonical validation error. No
			// protected mutation can succeed with an undecodable body.
			next.ServeHTTP(w, r)
			return
		}
		target, resolved, err := resolveOperationalPolicyEffectTarget(r, db, body)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "OPERATIONAL_POLICY_CONTEXT_FAILED", "operational policy context could not be resolved")
			return
		}
		if !resolved {
			// Missing/unknown identifiers are left to the owning handler; they
			// cannot produce a successful business mutation.
			next.ServeHTTP(w, r)
			return
		}

		decision, err := platformpolicies.EvaluateOperationalPolicyForStore(
			r.Context(), db, target.StoreID, target.FulfillmentMode,
		)
		if errors.Is(err, platformpolicies.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_FULFILLMENT_MODE", "fulfillmentMode is invalid")
			return
		}
		if errors.Is(err, platformpolicies.ErrNotFound) {
			store.SendError(w, http.StatusUnprocessableEntity, "OPERATIONAL_POLICY_NOT_CONFIGURED", "store is not mapped to a governed operational zone")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "OPERATIONAL_POLICY_EVALUATION_FAILED", "operational policy could not be evaluated")
			return
		}
		if !operationalPolicyEffectAllowed(decision, target.Effect) {
			store.SendJSON(w, http.StatusUnprocessableEntity, map[string]any{
				"code":     "OPERATIONAL_POLICY_DENIED",
				"message":  "the effective zone, SLA, capacity or fulfillment policy denies this operation",
				"effect":   target.Effect,
				"decision": decision,
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func isOperationalPolicyGuardedPath(path string) bool {
	switch path {
	case "/dsh/client/cart/items",
		"/dsh/client/cart/serviceability",
		"/dsh/client/checkout-intents",
		"/dsh/client/orders",
		"/dsh/operator/dispatch/assignments":
		return true
	default:
		return false
	}
}

func resolveOperationalPolicyEffectTarget(
	r *http.Request,
	db *sql.DB,
	body operationalPolicyMutationEnvelope,
) (operationalPolicyEffectTarget, bool, error) {
	switch r.URL.Path {
	case "/dsh/client/cart/items", "/dsh/client/cart/serviceability":
		if strings.TrimSpace(body.StoreID) == "" {
			return operationalPolicyEffectTarget{}, false, nil
		}
		return operationalPolicyEffectTarget{
			StoreID: body.StoreID, FulfillmentMode: body.FulfillmentMode, Effect: operationalEffectCart,
		}, true, nil
	case "/dsh/client/checkout-intents":
		if strings.TrimSpace(body.StoreID) == "" {
			return operationalPolicyEffectTarget{}, false, nil
		}
		return operationalPolicyEffectTarget{
			StoreID: body.StoreID, FulfillmentMode: body.FulfillmentMode, Effect: operationalEffectCheckout,
		}, true, nil
	case "/dsh/client/orders":
		if strings.TrimSpace(body.CheckoutIntentID) == "" {
			return operationalPolicyEffectTarget{}, false, nil
		}
		var target operationalPolicyEffectTarget
		err := db.QueryRowContext(r.Context(), `
			SELECT store_id::text, fulfillment_mode
			FROM dsh_checkout_intents
			WHERE id::text = $1`, strings.TrimSpace(body.CheckoutIntentID)).Scan(
			&target.StoreID, &target.FulfillmentMode,
		)
		if errors.Is(err, sql.ErrNoRows) {
			return operationalPolicyEffectTarget{}, false, nil
		}
		if err != nil {
			return operationalPolicyEffectTarget{}, false, err
		}
		target.Effect = operationalEffectOrder
		return target, true, nil
	case "/dsh/operator/dispatch/assignments":
		if strings.TrimSpace(body.OrderID) == "" {
			return operationalPolicyEffectTarget{}, false, nil
		}
		var target operationalPolicyEffectTarget
		err := db.QueryRowContext(r.Context(), `
			SELECT store_id::text, fulfillment_mode
			FROM dsh_orders
			WHERE id::text = $1`, strings.TrimSpace(body.OrderID)).Scan(
			&target.StoreID, &target.FulfillmentMode,
		)
		if errors.Is(err, sql.ErrNoRows) {
			return operationalPolicyEffectTarget{}, false, nil
		}
		if err != nil {
			return operationalPolicyEffectTarget{}, false, err
		}
		target.Effect = operationalEffectDispatch
		return target, true, nil
	default:
		return operationalPolicyEffectTarget{}, false, nil
	}
}

func operationalPolicyEffectAllowed(decision platformpolicies.OperationalDecision, effect string) bool {
	switch effect {
	case operationalEffectCart:
		return decision.Effects.CartAllowed
	case operationalEffectCheckout:
		return decision.Effects.CheckoutAllowed
	case operationalEffectOrder:
		return decision.Effects.OrderCreationAllowed
	case operationalEffectDispatch:
		return decision.Effects.DispatchAllowed
	default:
		return false
	}
}
