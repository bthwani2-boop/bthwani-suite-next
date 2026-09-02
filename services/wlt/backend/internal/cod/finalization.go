package cod

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

var (
	ErrCodReservationNotFound             = errors.New("COD reservation not found")
	ErrCodReservationFinalizationConflict = errors.New("COD reservation cannot be finalized from its current state")
)

// FinalizeCodReservation is the sole successful COD completion mutation. The
// reservation and the captain wallet debit share one transaction and one
// ledger reference, so retry/replay cannot create a second financial effect or
// a cash-remittance liability.
func FinalizeCodReservation(ctx context.Context, db *sql.DB, orderID, checkoutIntentID string) (*CodReservation, bool, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, false, err
	}
	orderID = strings.TrimSpace(orderID)
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if orderID == "" || checkoutIntentID == "" {
		return nil, false, fmt.Errorf("orderId and checkoutIntentId are required")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback() //nolint:errcheck

	reservation, err := scanCodReservation(tx.QueryRowContext(ctx, `
                SELECT `+codReservationCols+` FROM wlt_cod_reservations
                WHERE operator_context_id=$1 AND order_id=$2 FOR UPDATE`, operatorContextID, orderID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, ErrCodReservationNotFound
	}
	if err != nil {
		return nil, false, err
	}
	if reservation.CheckoutIntentID != checkoutIntentID {
		return nil, false, fmt.Errorf("%w: checkout intent does not match reservation", ErrCodReservationFinalizationConflict)
	}
	if reservation.Status == "released" {
		return nil, false, fmt.Errorf("%w: reservation was released", ErrCodReservationFinalizationConflict)
	}
	if reservation.Status == "finalized" {
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return reservation, true, nil
	}
	if reservation.Status != "reserved" {
		return nil, false, fmt.Errorf("%w: status %q", ErrCodReservationFinalizationConflict, reservation.Status)
	}

	var paymentStatus, paymentMethod, paymentCurrency, paymentClientID, walletSessionID string
	var cashOnDeliveryAmount, walletAmount int64
	if err := tx.QueryRowContext(ctx, `
                SELECT status, payment_method, currency, client_id, id::text,
                       COALESCE(cash_on_delivery_amount_minor_units, 0),
                       COALESCE(wallet_amount_minor_units, 0)
                FROM wlt_payment_sessions
                WHERE operator_context_id=$1 AND checkout_intent_id=$2
                FOR UPDATE`, operatorContextID, checkoutIntentID).
		Scan(&paymentStatus, &paymentMethod, &paymentCurrency, &paymentClientID, &walletSessionID, &cashOnDeliveryAmount, &walletAmount); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, false, fmt.Errorf("%w: payment session is missing", ErrCodReservationFinalizationConflict)
		}
		return nil, false, err
	}
	if paymentMethod != "cod" && paymentMethod != "mixed" {
		return nil, false, fmt.Errorf("%w: payment method %q is not COD", ErrCodReservationFinalizationConflict, paymentMethod)
	}
	if paymentStatus != "cod_pending" && paymentStatus != "cod_finalized" {
		return nil, false, fmt.Errorf("%w: payment session status %q", ErrCodReservationFinalizationConflict, paymentStatus)
	}
	if cashOnDeliveryAmount != reservation.AmountMinorUnits || paymentCurrency != reservation.Currency {
		return nil, false, fmt.Errorf("%w: reservation does not match immutable tender allocation", ErrCodReservationFinalizationConflict)
	}

	ledgerTransactionID, err := ledger.PostLedgerTransaction(ctx, tx, "cod_finalized", "cod_reservation", reservation.ID, []ledger.LedgerLine{
		{AccountType: "wallet", ActorType: "captain", ActorID: reservation.CaptainID, DebitCredit: "debit", AmountMinorUnits: reservation.AmountMinorUnits, Currency: reservation.Currency},
		{AccountType: "platform_payable", DebitCredit: "credit", AmountMinorUnits: reservation.AmountMinorUnits, Currency: reservation.Currency},
	}, ledger.Actor{ID: "wlt", Type: "service"})
	if err != nil {
		return nil, false, fmt.Errorf("post COD finalization ledger: %w", err)
	}

	// A mixed tender order also owes its wallet part: the immutable tender
	// allocation reserved it at session creation (wlt-960), and finalization
	// is the single completion moment where that hold converts into collected
	// funds. Skipping this would complete the order as paid while the client
	// wallet part is silently never collected.
	if walletAmount > 0 {
		if _, err := ledger.PostLedgerTransaction(ctx, tx, "wallet_tender_collected", "payment_session", walletSessionID, []ledger.LedgerLine{
			{AccountType: "wallet", ActorType: "client", ActorID: paymentClientID, DebitCredit: "debit", AmountMinorUnits: walletAmount, Currency: paymentCurrency},
			{AccountType: "platform_payable", DebitCredit: "credit", AmountMinorUnits: walletAmount, Currency: paymentCurrency},
		}, ledger.Actor{ID: "wlt", Type: "service"}); err != nil {
			return nil, false, fmt.Errorf("post wallet tender collection ledger: %w", err)
		}
	}

	if paymentStatus == "cod_pending" {
		if _, err := tx.ExecContext(ctx, `
                        UPDATE wlt_payment_sessions
                        SET status='cod_finalized', updated_at=NOW()
                        WHERE operator_context_id=$1 AND checkout_intent_id=$2 AND status='cod_pending'`, operatorContextID, checkoutIntentID); err != nil {
			return nil, false, fmt.Errorf("finalize COD payment session: %w", err)
		}
	}
	finalized, err := scanCodReservation(tx.QueryRowContext(ctx, `
                UPDATE wlt_cod_reservations
                SET status='finalized', finalization_ledger_transaction_id=$3, resolved_at=NOW(), updated_at=NOW()
                WHERE operator_context_id=$1 AND order_id=$2 AND status='reserved'
                RETURNING `+codReservationCols, operatorContextID, orderID, ledgerTransactionID))
	if err != nil {
		return nil, false, fmt.Errorf("finalize COD reservation: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return finalized, false, nil
}

func HandleFinalizeCodReservation(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OrderID          string `json:"orderId"`
			CheckoutIntentID string `json:"checkoutIntentId"`
		}
		if err := decodeStrictJSON(w, r, &input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		reservation, replayed, err := FinalizeCodReservation(r.Context(), db, input.OrderID, input.CheckoutIntentID)
		switch {
		case errors.Is(err, ErrCodReservationNotFound):
			shared.SendError(w, http.StatusConflict, "COD_RESERVATION_REQUIRED", err.Error())
		case errors.Is(err, ErrCodReservationFinalizationConflict):
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", err.Error())
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		default:
			shared.SendJSON(w, http.StatusOK, map[string]any{"codReservation": reservation, "replayed": replayed})
		}
	}
}

func decodeStrictJSON(w http.ResponseWriter, r *http.Request, target any) error {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("request body is invalid: %w", err)
	}
	return nil
}
