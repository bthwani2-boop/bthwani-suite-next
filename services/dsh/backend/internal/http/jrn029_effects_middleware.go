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

const maxJRN029GuardBodyBytes = 1 << 20

type jrn029MutationEnvelope struct {
	StoreID          string `json:"storeId"`
	FulfillmentMode  string `json:"fulfillmentMode"`
	CheckoutIntentID string `json:"checkoutIntentId"`
	OrderID          string `json:"orderId"`
}

type jrn029EffectTarget struct {
	StoreID         string
	FulfillmentMode string
	Effect          string
}

const (
	jrn029EffectCart     = "cart"
	jrn029EffectCheckout = "checkout"
	jrn029EffectOrder    = "order"
	jrn029EffectDispatch = "dispatch"
)

// OperationalPolicyEffectsMiddleware is the runtime bridge for JRN-029. It
// enforces the canonical decision before cart mutation/serviceability,
// checkout, order creation, and dispatch assignment. Existing handlers remain
// responsible for actor authorization, address geofences, pricing, payment and
// state-machine validation.
func OperationalPolicyEffectsMiddleware(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || !isJRN029GuardedPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		if r.Body == nil {
			next.ServeHTTP(w, r)
			return
		}

		payload, err := io.ReadAll(io.LimitReader(r.Body, maxJRN029GuardBodyBytes+1))
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "request body could not be read")
			return
		}
		if len(payload) > maxJRN029GuardBodyBytes {
			store.SendError(w, http.StatusRequestEntityTooLarge, "REQUEST_BODY_TOO_LARGE", "request body exceeds the JRN-029 guard limit")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(payload))

		var body jrn029MutationEnvelope
		if len(payload) == 0 || json.Unmarshal(payload, &body) != nil {
			// The owning handler returns the canonical validation error. No
			// protected mutation can succeed with an undecodable body.
			next.ServeHTTP(w, r)
			return
		}
		target, resolved, err := resolveJRN029EffectTarget(r, db, body)
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
		if !jrn029EffectAllowed(decision, target.Effect) {
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

func isJRN029GuardedPath(path string) bool {
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

func resolveJRN029EffectTarget(
	r *http.Request,
	db *sql.DB,
	body jrn029MutationEnvelope,
) (jrn029EffectTarget, bool, error) {
	switch r.URL.Path {
	case "/dsh/client/cart/items", "/dsh/client/cart/serviceability":
		if strings.TrimSpace(body.StoreID) == "" {
			return jrn029EffectTarget{}, false, nil
		}
		return jrn029EffectTarget{
			StoreID: body.StoreID, FulfillmentMode: body.FulfillmentMode, Effect: jrn029EffectCart,
		}, true, nil
	case "/dsh/client/checkout-intents":
		if strings.TrimSpace(body.StoreID) == "" {
			return jrn029EffectTarget{}, false, nil
		}
		return jrn029EffectTarget{
			StoreID: body.StoreID, FulfillmentMode: body.FulfillmentMode, Effect: jrn029EffectCheckout,
		}, true, nil
	case "/dsh/client/orders":
		if strings.TrimSpace(body.CheckoutIntentID) == "" {
			return jrn029EffectTarget{}, false, nil
		}
		var target jrn029EffectTarget
		err := db.QueryRowContext(r.Context(), `
			SELECT store_id::text, fulfillment_mode
			FROM dsh_checkout_intents
			WHERE id::text = $1`, strings.TrimSpace(body.CheckoutIntentID)).Scan(
			&target.StoreID, &target.FulfillmentMode,
		)
		if errors.Is(err, sql.ErrNoRows) {
			return jrn029EffectTarget{}, false, nil
		}
		if err != nil {
			return jrn029EffectTarget{}, false, err
		}
		target.Effect = jrn029EffectOrder
		return target, true, nil
	case "/dsh/operator/dispatch/assignments":
		if strings.TrimSpace(body.OrderID) == "" {
			return jrn029EffectTarget{}, false, nil
		}
		var target jrn029EffectTarget
		err := db.QueryRowContext(r.Context(), `
			SELECT store_id::text, fulfillment_mode
			FROM dsh_orders
			WHERE id::text = $1`, strings.TrimSpace(body.OrderID)).Scan(
			&target.StoreID, &target.FulfillmentMode,
		)
		if errors.Is(err, sql.ErrNoRows) {
			return jrn029EffectTarget{}, false, nil
		}
		if err != nil {
			return jrn029EffectTarget{}, false, err
		}
		target.Effect = jrn029EffectDispatch
		return target, true, nil
	default:
		return jrn029EffectTarget{}, false, nil
	}
}

func jrn029EffectAllowed(decision platformpolicies.OperationalDecision, effect string) bool {
	switch effect {
	case jrn029EffectCart:
		return decision.Effects.CartAllowed
	case jrn029EffectCheckout:
		return decision.Effects.CheckoutAllowed
	case jrn029EffectOrder:
		return decision.Effects.OrderCreationAllowed
	case jrn029EffectDispatch:
		return decision.Effects.DispatchAllowed
	default:
		return false
	}
}
