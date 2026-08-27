package reference

import (
        "context"
        "database/sql"
        "encoding/json"
        "errors"
        "fmt"
        "net/http"
        "strings"
        "time"

        "wlt-api/internal/payment"
        "wlt-api/internal/pricing"
        "wlt-api/internal/shared"
)

var ErrIdempotencyConflict = errors.New("payment session idempotency conflict")

const paymentSessionCols = `id, checkout_intent_id, special_request_id,
         subscription_purchase_id, commercial_product_reference,
         topup_reference, topup_actor_type,
        operator_context_id,
        client_id, store_id, payment_method, status, provider_reference, amount_minor_units,
        currency, wallet_amount_minor_units, cash_on_delivery_amount_minor_units, financial_purpose,
        COALESCE(pricing_quote_id, ''), COALESCE(pricing_quote_hash, ''),
         COALESCE(pricing_quote_version, 0), pricing_quote_expires_at, captured_at, created_at, updated_at`

type PaymentSession struct {
        ID                         string            `json:"id"`
        CheckoutIntentID           *string           `json:"checkoutIntentId,omitempty"`
        SpecialRequestID           *string           `json:"specialRequestId,omitempty"`
        SubscriptionPurchaseID     *string           `json:"subscriptionPurchaseId,omitempty"`
        CommercialProductReference *string           `json:"commercialProductReference,omitempty"`
        TopUpReference             *string           `json:"topupReference,omitempty"`
        TopUpActorType             *string           `json:"topupActorType,omitempty"`
        OperatorContextID          string            `json:"operatorContextId"`
        ClientID                   string            `json:"clientId"`
        StoreID                    string            `json:"storeId"`
        PaymentMethod              string            `json:"paymentMethod"`
        Status                     string            `json:"status"`
        ProviderReference          string            `json:"providerReference"`
        AmountMinorUnits           int64             `json:"amountMinorUnits"`
        Currency                   string            `json:"currency"`
        TenderAllocation           *TenderAllocation `json:"tenderAllocation,omitempty"`
        // FinancialPurpose is server-derived and read-only to every caller. It is
        // exposed so an auditor can see why the money moved without joining back to
        // whichever source system created the session.
        FinancialPurpose      string                   `json:"financialPurpose"`
        PricingQuoteID        string                   `json:"pricingQuoteId,omitempty"`
        PricingQuoteHash      string                   `json:"pricingQuoteHash,omitempty"`
        PricingQuoteVersion   int                      `json:"pricingQuoteVersion,omitempty"`
        PricingQuoteExpiresAt *time.Time               `json:"pricingQuoteExpiresAt,omitempty"`
        Allocation            []payment.AllocationLine `json:"allocation,omitempty"`
        CapturedAt            *time.Time               `json:"capturedAt,omitempty"`
        CreatedAt             time.Time                `json:"createdAt"`
        UpdatedAt             time.Time                `json:"updatedAt"`
}

type TenderAllocation struct {
        WalletAmountMinorUnits         int64  `json:"walletAmountMinorUnits"`
        CashOnDeliveryAmountMinorUnits int64  `json:"cashOnDeliveryAmountMinorUnits"`
        Currency                       string `json:"currency"`
}

// Exactly one source identifier must be present. A subscription purchase also
// requires commercialProductReference so later activation can prove that the
// captured payment was created for the exact WLT product being activated.
type CreatePaymentSessionInput struct {
        CheckoutIntentID           string `json:"checkoutIntentId"`
        SpecialRequestID           string `json:"specialRequestId"`
        SubscriptionPurchaseID     string `json:"subscriptionPurchaseId"`
        CommercialProductReference string `json:"commercialProductReference"`
        // TopUpReference and TopUpActorType are the fourth source identity
        // (wlt-911): a Cash-In wallet top-up session. Both must be set together
        // or both left empty -- see sourceCount and CreatePaymentSession.
        TopUpReference string `json:"topupReference"`
        TopUpActorType string `json:"topupActorType"`
        // OperatorContextID is server-owned partition state. The HTTP transport
        // never accepts it from a caller; the trusted request context supplies it.
        OperatorContextID string `json:"-"`
        ClientID          string `json:"clientId"`
        StoreID           string `json:"storeId"`
        PaymentMethod     string `json:"paymentMethod"`
        AmountMinorUnits  int64  `json:"amountMinorUnits"`
        Currency          string `json:"currency"`
        CartSnapshotHash  string `json:"cartSnapshotHash"`
        // PricingQuoteID is an opaque WLT-issued identity. The handler does not
        // accept quote totals, hashes, versions, expiries, or allocations from DSH;
        // it derives all of them from this immutable record inside WLT.
        PricingQuoteID        string `json:"pricingQuoteId"`
        PricingQuoteHash      string `json:"-"`
        PricingQuoteVersion   int    `json:"-"`
        PricingQuoteExpiresAt string `json:"-"`
        // Allocation is the caller's price breakdown of AmountMinorUnits. DSH owns
        // what an order costs and therefore supplies the numbers; WLT owns what
        // those numbers mean and rejects any set that does not conserve the total.
        // Omitting it is allowed and records no breakdown.
        Allocation     []payment.AllocationLine `json:"allocation,omitempty"`
        IdempotencyKey string                   `json:"-"`
        CorrelationID  string                   `json:"-"`
}

func sourceCount(input CreatePaymentSessionInput) int {
        count := 0
        if input.CheckoutIntentID != "" {
                count++
        }
        if input.SpecialRequestID != "" {
                count++
        }
        if input.SubscriptionPurchaseID != "" {
                count++
        }
        if input.TopUpReference != "" {
                count++
        }
        return count
}

func CreatePaymentSession(db *sql.DB, input CreatePaymentSessionInput) (*PaymentSession, error) {
        if sourceCount(input) != 1 {
                return nil, fmt.Errorf("exactly one of checkoutIntentId, specialRequestId, subscriptionPurchaseId or topupReference is required")
        }
        if input.SubscriptionPurchaseID != "" && input.CommercialProductReference == "" {
                return nil, fmt.Errorf("commercialProductReference is required for a subscription purchase")
        }
        if input.SubscriptionPurchaseID == "" && input.CommercialProductReference != "" {
                return nil, fmt.Errorf("commercialProductReference is only valid for a subscription purchase")
        }
        if input.TopUpReference != "" && input.TopUpActorType == "" {
                return nil, fmt.Errorf("topupActorType is required for a topupReference")
        }
        if input.TopUpReference == "" && input.TopUpActorType != "" {
                return nil, fmt.Errorf("topupActorType is only valid for a topupReference")
        }
        input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
        if input.OperatorContextID == "" || input.ClientID == "" || input.StoreID == "" {
                return nil, fmt.Errorf("financial OperatorContext scope, clientId and storeId are required")
        }
        if input.PaymentMethod == "" {
                if input.CheckoutIntentID != "" {
                        return nil, fmt.Errorf("paymentMethod is required for checkout; supported checkout methods are cod, wallet and mixed")
                }
                input.PaymentMethod = "official_wallet"
        }
        if input.Currency == "" {
                input.Currency = "YER"
        }
        input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
        switch input.PaymentMethod {
        case "cod", "wallet", "mixed":
        case "official_wallet":
                if input.CheckoutIntentID != "" {
                        return nil, fmt.Errorf("official_wallet is a wallet funding rail and is not a checkout payment method")
                }
        default:
                return nil, fmt.Errorf("unsupported paymentMethod: %s", input.PaymentMethod)
        }
        if input.SubscriptionPurchaseID != "" && input.PaymentMethod == "cod" {
                return nil, fmt.Errorf("cod is not supported for subscription purchases")
        }
        if input.TopUpReference != "" && input.PaymentMethod == "cod" {
                return nil, fmt.Errorf("cod is not supported for a wallet topup")
        }
        if input.AmountMinorUnits <= 0 {
                return nil, fmt.Errorf("amountMinorUnits must be greater than 0")
        }
        if input.CheckoutIntentID != "" && strings.TrimSpace(input.PricingQuoteID) == "" {
                return nil, fmt.Errorf("checkout payment sessions require a canonical pricing quote")
        }
        if input.SpecialRequestID != "" {
                if strings.TrimSpace(input.PricingQuoteID) == "" {
                        return nil, fmt.Errorf("special-request payment sessions require a canonical WLT pricing quote")
                }
                quote, err := pricing.LoadSpecialRequestQuote(context.Background(), db, input.OperatorContextID, input.PricingQuoteID)
                if err != nil {
                        return nil, err
                }
                if quote.SpecialRequestID != input.SpecialRequestID || quote.ClientID != input.ClientID {
                        return nil, pricing.ErrSpecialRequestQuoteConflict
                }
                if quote.AmountMinorUnits != input.AmountMinorUnits || quote.Currency != input.Currency {
                        return nil, pricing.ErrSpecialRequestQuoteConflict
                }
                input.PricingQuoteHash = quote.QuoteHash
                input.PricingQuoteVersion = quote.QuoteVersion
                input.PricingQuoteExpiresAt = quote.ExpiresAt.UTC().Format(time.RFC3339Nano)
        }
        if input.CheckoutIntentID != "" && len(input.Allocation) != 0 {
                return nil, fmt.Errorf("checkout payment allocation is derived from the canonical pricing quote")
        }

        // The purpose is resolved from the source identity the caller has already
        // been validated against, never from anything it could set directly.
        purpose, err := payment.DerivePaymentSessionPurpose(payment.SessionSource{
                CheckoutIntentID:       input.CheckoutIntentID,
                SpecialRequestID:       input.SpecialRequestID,
                SubscriptionPurchaseID: input.SubscriptionPurchaseID,
                TopUpReference:         input.TopUpReference,
                TopUpActorType:         input.TopUpActorType,
        })
        if err != nil {
                return nil, err
        }
        if input.CheckoutIntentID != "" {
                quote, err := pricing.LoadCheckoutQuote(context.Background(), db, input.OperatorContextID, input.PricingQuoteID)
                if err != nil {
                        return nil, err
                }
                if quote.CheckoutIntentID != input.CheckoutIntentID || quote.ClientID != input.ClientID || quote.StoreID != input.StoreID ||
                        quote.CartSnapshotHash != input.CartSnapshotHash || quote.TotalMinorUnits != input.AmountMinorUnits || quote.Currency != input.Currency {
                        return nil, pricing.ErrCheckoutQuoteConflict
                }
                input.PricingQuoteHash = quote.Hash
                input.PricingQuoteVersion = quote.Version
                input.PricingQuoteExpiresAt = quote.ExpiresAt.UTC().Format(time.RFC3339Nano)
                input.Allocation = quote.Allocation
        }
        if err := payment.ValidatePaymentAllocation(input.Allocation, input.AmountMinorUnits); err != nil {
                return nil, err
        }
        var existing *PaymentSession
        switch {
        case input.CheckoutIntentID != "":
                existing, err = getPaymentSessionByCheckoutIntent(db, input.OperatorContextID, input.CheckoutIntentID)
        case input.SpecialRequestID != "":
                existing, err = getPaymentSessionBySpecialRequest(db, input.OperatorContextID, input.SpecialRequestID)
        case input.SubscriptionPurchaseID != "":
                existing, err = getPaymentSessionBySubscriptionPurchase(db, input.OperatorContextID, input.SubscriptionPurchaseID)
        default:
                existing, err = getPaymentSessionByTopUpReference(db, input.OperatorContextID, input.TopUpReference)
        }
        if err != nil {
                return nil, err
        }
        if existing != nil {
                // The allocation is part of what makes a replay the same request: a
                // second call for the same source carrying a different breakdown is a
                // different financial claim, not a retry, so it must conflict rather
                // than silently return the first session.
                if existing.ClientID != input.ClientID ||
                        existing.OperatorContextID != input.OperatorContextID ||
                        existing.StoreID != input.StoreID ||
                        existing.PaymentMethod != input.PaymentMethod ||
                        existing.AmountMinorUnits != input.AmountMinorUnits ||
                        existing.Currency != input.Currency ||
                        existing.PricingQuoteID != input.PricingQuoteID ||
                        stringValue(existing.CommercialProductReference) != input.CommercialProductReference ||
                        stringValue(existing.TopUpActorType) != input.TopUpActorType ||
                        !sameAllocation(existing.Allocation, input.Allocation) {
                        return nil, ErrIdempotencyConflict
                }
                return existing, nil
        }

        const q = `
                INSERT INTO wlt_payment_sessions
                        (checkout_intent_id, special_request_id, subscription_purchase_id,
                         commercial_product_reference, topup_reference, topup_actor_type,
                         operator_context_id, client_id, store_id,
                         payment_method, status, amount_minor_units, currency,
                         wallet_amount_minor_units, cash_on_delivery_amount_minor_units, financial_purpose,
                         cart_snapshot_hash, pricing_quote_id, pricing_quote_hash, pricing_quote_version,
                         pricing_quote_expires_at, idempotency_key, correlation_id)
                VALUES (NULLIF($1, ''), NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''),
                        $7, $8, $9, $10, CASE WHEN $10 IN ('cod', 'mixed') THEN 'cod_pending' ELSE 'reference_created' END, $11, $12, $13, $14, $15,
                        $16, NULLIF($17, ''), NULLIF($18, ''), NULLIF($19, 0), NULLIF($20, '')::timestamptz,
                        $21, $22)
                RETURNING ` + paymentSessionCols

        // The session and its allocation are one financial fact and are written in
        // one transaction: a session must never become visible carrying a partial
        // breakdown. The deferred conservation trigger added in wlt-908 re-checks
        // the completed set at COMMIT.
        tx, err := db.Begin()
        if err != nil {
                return nil, err
        }
        defer func() { _ = tx.Rollback() }()
        if input.CheckoutIntentID != "" {
                quote, err := pricing.LoadCheckoutQuoteForSession(context.Background(), tx, input.OperatorContextID, input.PricingQuoteID)
                if err != nil {
                        return nil, err
                }
                if quote.CheckoutIntentID != input.CheckoutIntentID || quote.ClientID != input.ClientID || quote.StoreID != input.StoreID ||
                        quote.CartSnapshotHash != input.CartSnapshotHash || quote.TotalMinorUnits != input.AmountMinorUnits || quote.Currency != input.Currency {
                        return nil, pricing.ErrCheckoutQuoteConflict
                }
                input.PricingQuoteHash = quote.Hash
                input.PricingQuoteVersion = quote.Version
                input.PricingQuoteExpiresAt = quote.ExpiresAt.UTC().Format(time.RFC3339Nano)
                input.Allocation = quote.Allocation
        }
        if input.SpecialRequestID != "" {
                quote, err := pricing.LoadSpecialRequestQuoteForSession(context.Background(), tx, input.OperatorContextID, input.PricingQuoteID)
                if err != nil {
                        return nil, err
                }
                if quote.SpecialRequestID != input.SpecialRequestID || quote.ClientID != input.ClientID || quote.AmountMinorUnits != input.AmountMinorUnits || quote.Currency != input.Currency {
                        return nil, pricing.ErrSpecialRequestQuoteConflict
                }
                input.PricingQuoteHash = quote.QuoteHash
                input.PricingQuoteVersion = quote.QuoteVersion
                input.PricingQuoteExpiresAt = quote.ExpiresAt.UTC().Format(time.RFC3339Nano)
        }
        if err := payment.ValidatePaymentAllocation(input.Allocation, input.AmountMinorUnits); err != nil {
                return nil, err
        }
        tenderAllocation, err := deriveCheckoutTenderAllocation(context.Background(), tx, input)
        if err != nil {
                return nil, err
        }

        session, err := scanPaymentSession(tx.QueryRow(q,
                input.CheckoutIntentID,
                input.SpecialRequestID,
                input.SubscriptionPurchaseID,
                input.CommercialProductReference,
                input.TopUpReference,
                input.TopUpActorType,
                input.OperatorContextID,
                input.ClientID,
                input.StoreID,
                input.PaymentMethod,
                input.AmountMinorUnits,
                input.Currency,
                tenderAmount(tenderAllocation, "wallet"),
                tenderAmount(tenderAllocation, "cash_on_delivery"),
                string(purpose),
                input.CartSnapshotHash,
                input.PricingQuoteID,
                input.PricingQuoteHash,
                input.PricingQuoteVersion,
                input.PricingQuoteExpiresAt,
                input.IdempotencyKey,
                input.CorrelationID,
        ))
        if err != nil {
                return nil, err
        }

        for _, line := range input.Allocation {
                if _, err := tx.Exec(`
                        INSERT INTO wlt_payment_allocation_components
                                (payment_session_id, operator_context_id, component, amount_minor_units, currency)
                        VALUES ($1, $2, $3, $4, $5)`,
                        session.ID,
                        input.OperatorContextID,
                        string(line.Component),
                        line.AmountMinorUnits,
                        input.Currency,
                ); err != nil {
                        return nil, err
                }
        }

        if err := tx.Commit(); err != nil {
                return nil, err
        }
        session.Allocation = append([]payment.AllocationLine(nil), input.Allocation...)
        session.TenderAllocation = tenderAllocation
        return session, nil
}

func deriveCheckoutTenderAllocation(ctx context.Context, tx *sql.Tx, input CreatePaymentSessionInput) (*TenderAllocation, error) {
        if input.CheckoutIntentID == "" {
                return nil, nil
        }

        allocation := &TenderAllocation{Currency: input.Currency}
        switch input.PaymentMethod {
        case "cod":
                allocation.CashOnDeliveryAmountMinorUnits = input.AmountMinorUnits
        case "wallet", "mixed":
                var available int64
                var status, currency string
                err := tx.QueryRowContext(ctx, `
                        SELECT status, currency, available_balance_minor_units
                        FROM wlt_wallets
                        WHERE operator_context_id = $1 AND actor_type = 'client' AND actor_id = $2
                        FOR UPDATE`, input.OperatorContextID, input.ClientID).Scan(&status, &currency, &available)
                if errors.Is(err, sql.ErrNoRows) {
                        if input.PaymentMethod == "wallet" {
                                return nil, fmt.Errorf("client wallet is required for wallet checkout")
                        }
                        allocation.CashOnDeliveryAmountMinorUnits = input.AmountMinorUnits
                        return allocation, nil
                }
                if err != nil {
                        return nil, fmt.Errorf("load client wallet for checkout tender allocation: %w", err)
                }
                if currency != input.Currency {
                        return nil, fmt.Errorf("client wallet currency %s does not match checkout currency %s", currency, input.Currency)
                }
                if status != "active" {
                        if input.PaymentMethod == "wallet" {
                                return nil, fmt.Errorf("client wallet is not active for wallet checkout")
                        }
                        allocation.CashOnDeliveryAmountMinorUnits = input.AmountMinorUnits
                        return allocation, nil
                }
                if available < 0 {
                        available = 0
                }
                if input.PaymentMethod == "wallet" && available < input.AmountMinorUnits {
                        return nil, fmt.Errorf("client wallet balance is insufficient for wallet checkout")
                }
                if available > input.AmountMinorUnits {
                        available = input.AmountMinorUnits
                }
                allocation.WalletAmountMinorUnits = available
                allocation.CashOnDeliveryAmountMinorUnits = input.AmountMinorUnits - available
        default:
                return nil, fmt.Errorf("unsupported checkout payment method %q", input.PaymentMethod)
        }
        return allocation, nil
}

func tenderAmount(allocation *TenderAllocation, kind string) any {
        if allocation == nil {
                return nil
        }
        if kind == "wallet" {
                return allocation.WalletAmountMinorUnits
        }
        return allocation.CashOnDeliveryAmountMinorUnits
}

// sameAllocation compares two breakdowns as sets: the wire order of components
// carries no financial meaning, so reordering the same numbers is still the
// same claim and must replay rather than conflict.
func sameAllocation(left, right []payment.AllocationLine) bool {
        if len(left) != len(right) {
                return false
        }
        byComponent := make(map[payment.AllocationComponent]int64, len(left))
        for _, line := range left {
                byComponent[line.Component] = line.AmountMinorUnits
        }
        for _, line := range right {
                amount, ok := byComponent[line.Component]
                if !ok || amount != line.AmountMinorUnits {
                        return false
                }
        }
        return true
}

// loadAllocation reads the persisted breakdown for a session. Components are
// ordered by name so a readback is stable for auditing and comparison.
func loadAllocation(db *sql.DB, sessionID string) ([]payment.AllocationLine, error) {
        rows, err := db.Query(`
                SELECT component, amount_minor_units
                FROM wlt_payment_allocation_components
                WHERE payment_session_id = $1
                ORDER BY component`, sessionID)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        var lines []payment.AllocationLine
        for rows.Next() {
                var line payment.AllocationLine
                if err := rows.Scan(&line.Component, &line.AmountMinorUnits); err != nil {
                        return nil, err
                }
                lines = append(lines, line)
        }
        return lines, rows.Err()
}

// attachAllocation fills in the breakdown on a session that was just read.
// A nil session is passed through so callers can chain it onto a lookup that
// legitimately found nothing.
func attachAllocation(db *sql.DB, session *PaymentSession, err error) (*PaymentSession, error) {
        if err != nil || session == nil {
                return session, err
        }
        allocation, err := loadAllocation(db, session.ID)
        if err != nil {
                return nil, err
        }
        session.Allocation = allocation
        return session, nil
}

func stringValue(value *string) string {
        if value == nil {
                return ""
        }
        return *value
}

func GetPaymentSession(db *sql.DB, sessionID string) (*PaymentSession, error) {
        if sessionID == "" {
                return nil, fmt.Errorf("paymentSessionId is required")
        }
        const q = `
                SELECT ` + paymentSessionCols + `
                FROM wlt_payment_sessions
                WHERE id = $1`
        row := db.QueryRow(q, sessionID)
        session, err := scanPaymentSession(row)
        if err == sql.ErrNoRows {
                return nil, nil
        }
        return attachAllocation(db, session, err)
}

func HandleCreatePaymentSession(db *sql.DB) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
                if !requireDshServiceCaller(w, r) {
                        return
                }
                var input CreatePaymentSessionInput
                if !decodeJSON(w, r, &input) {
                        return
                }
                if input.CheckoutIntentID != "" && input.PricingQuoteID == "" {
                        shared.SendError(w, http.StatusBadRequest, "PRICING_QUOTE_REQUIRED", "checkout payment sessions require a canonical WLT pricing quote identity")
                        return
                }
                operatorContextID, err := shared.RequireOperatorContext(r.Context())
                if err != nil {
                        shared.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_BOUND", "server-owned financial OperatorContext is unavailable")
                        return
                }
                input.OperatorContextID = operatorContextID
                input.IdempotencyKey = r.Header.Get("Idempotency-Key")
                input.CorrelationID = r.Header.Get("X-Correlation-ID")
                if input.IdempotencyKey == "" {
                        shared.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key is required")
                        return
                }
                if input.CorrelationID == "" {
                        shared.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
                        return
                }
                session, err := CreatePaymentSession(db, input)
                if errors.Is(err, ErrIdempotencyConflict) {
                        shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "payment source was already used with a different payload")
                        return
                }
                if err != nil {
                        shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
                        return
                }
                shared.SendJSON(w, http.StatusCreated, map[string]any{"paymentSession": session})
        }
}

func getPaymentSessionByCheckoutIntent(db *sql.DB, operatorContextID string, checkoutIntentID string) (*PaymentSession, error) {
        q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE checkout_intent_id = $1`
        args := []any{checkoutIntentID}
        if operatorContextID != "" {
                q += ` AND operator_context_id = $2`
                args = append(args, operatorContextID)
        }
        session, err := scanPaymentSession(db.QueryRow(q, args...))
        if errors.Is(err, sql.ErrNoRows) {
                return nil, nil
        }
        return attachAllocation(db, session, err)
}

func getPaymentSessionBySpecialRequest(db *sql.DB, operatorContextID string, specialRequestID string) (*PaymentSession, error) {
        q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE special_request_id = $1`
        args := []any{specialRequestID}
        if operatorContextID != "" {
                q += ` AND operator_context_id = $2`
                args = append(args, operatorContextID)
        }
        session, err := scanPaymentSession(db.QueryRow(q, args...))
        if errors.Is(err, sql.ErrNoRows) {
                return nil, nil
        }
        return attachAllocation(db, session, err)
}

func getPaymentSessionBySubscriptionPurchase(db *sql.DB, operatorContextID string, purchaseID string) (*PaymentSession, error) {
        q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE subscription_purchase_id = $1`
        args := []any{purchaseID}
        if operatorContextID != "" {
                q += ` AND operator_context_id = $2`
                args = append(args, operatorContextID)
        }
        session, err := scanPaymentSession(db.QueryRow(q, args...))
        if errors.Is(err, sql.ErrNoRows) {
                return nil, nil
        }
        return attachAllocation(db, session, err)
}

func getPaymentSessionByTopUpReference(db *sql.DB, operatorContextID string, topUpReference string) (*PaymentSession, error) {
        q := `SELECT ` + paymentSessionCols + ` FROM wlt_payment_sessions WHERE topup_reference = $1`
        args := []any{topUpReference}
        if operatorContextID != "" {
                q += ` AND operator_context_id = $2`
                args = append(args, operatorContextID)
        }
        session, err := scanPaymentSession(db.QueryRow(q, args...))
        if errors.Is(err, sql.ErrNoRows) {
                return nil, nil
        }
        return attachAllocation(db, session, err)
}

func requireDshServiceCaller(w http.ResponseWriter, r *http.Request) bool {
        return shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh")
}

func scanPaymentSession(row *sql.Row) (*PaymentSession, error) {
        var session PaymentSession
        var walletAmount, cashOnDeliveryAmount sql.NullInt64
        err := row.Scan(
                &session.ID,
                &session.CheckoutIntentID,
                &session.SpecialRequestID,
                &session.SubscriptionPurchaseID,
                &session.CommercialProductReference,
                &session.TopUpReference,
                &session.TopUpActorType,
                &session.OperatorContextID,
                &session.ClientID,
                &session.StoreID,
                &session.PaymentMethod,
                &session.Status,
                &session.ProviderReference,
                &session.AmountMinorUnits,
                &session.Currency,
                &walletAmount,
                &cashOnDeliveryAmount,
                &session.FinancialPurpose,
                &session.PricingQuoteID,
                &session.PricingQuoteHash,
                &session.PricingQuoteVersion,
                &session.PricingQuoteExpiresAt,
                &session.CapturedAt,
                &session.CreatedAt,
                &session.UpdatedAt,
        )
        if err != nil {
                return nil, err
        }
        if walletAmount.Valid != cashOnDeliveryAmount.Valid {
                return nil, fmt.Errorf("payment session has a partial checkout tender allocation")
        }
        if walletAmount.Valid {
                session.TenderAllocation = &TenderAllocation{
                        WalletAmountMinorUnits:         walletAmount.Int64,
                        CashOnDeliveryAmountMinorUnits: cashOnDeliveryAmount.Int64,
                        Currency:                       session.Currency,
                }
        }
        return &session, nil
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
        decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
        decoder.DisallowUnknownFields()
        if err := decoder.Decode(target); err != nil {
                shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
                return false
        }
        return true
}
