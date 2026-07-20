from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise RuntimeError(f"{label} anchor not found")
    return text.replace(old, new, 1)


def replace_block(text: str, start_token: str, end_token: str, replacement: str, label: str) -> str:
    start = text.find(start_token)
    if start == -1:
        if replacement.strip() and replacement.strip() in text:
            return text
        raise RuntimeError(f"{label} start not found")
    end = text.find(end_token, start)
    if end == -1:
        raise RuntimeError(f"{label} end not found")
    return text[:start] + replacement + text[end:]


def write_migration() -> None:
    write(
        "services/wlt/database/migrations/wlt-025_cod_collector_identity.sql",
        """-- WLT-025: COD custody belongs to the actual cash collector, not always a captain.
BEGIN;

ALTER TABLE wlt_cod_records
  ADD COLUMN IF NOT EXISTS collector_type text,
  ADD COLUMN IF NOT EXISTS collector_id text;

UPDATE wlt_cod_records
SET collector_type = COALESCE(NULLIF(collector_type, ''), 'captain'),
    collector_id = COALESCE(NULLIF(collector_id, ''), captain_id)
WHERE collector_type IS NULL OR collector_id IS NULL OR collector_type = '' OR collector_id = '';

ALTER TABLE wlt_cod_records
  ALTER COLUMN captain_id DROP NOT NULL,
  ALTER COLUMN collector_type SET NOT NULL,
  ALTER COLUMN collector_id SET NOT NULL;

ALTER TABLE wlt_cod_records
  DROP CONSTRAINT IF EXISTS wlt_cod_records_collector_type_chk;
ALTER TABLE wlt_cod_records
  ADD CONSTRAINT wlt_cod_records_collector_type_chk
  CHECK (collector_type IN ('captain','store_courier','partner_store'));

ALTER TABLE wlt_cod_records
  DROP CONSTRAINT IF EXISTS wlt_cod_records_captain_projection_chk;
ALTER TABLE wlt_cod_records
  ADD CONSTRAINT wlt_cod_records_captain_projection_chk
  CHECK (
    (collector_type = 'captain' AND captain_id = collector_id)
    OR (collector_type <> 'captain' AND captain_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS wlt_cod_records_collector_idx
  ON wlt_cod_records(collector_type, collector_id, created_at DESC);

COMMIT;
""",
    )


def patch_dsh_wlt_client() -> None:
    path = "services/dsh/backend/internal/wlt/client.go"
    text = read(path)
    start = text.find("type NotifyDeliveryCompletedInput struct {")
    end = text.find("type DeliverFieldCommissionInput struct {", start)
    if start == -1 or end == -1:
        if "type NotifyDeliveryCollectionInput struct" in text and "func (c *Client) NotifyDeliveryCollection" in text:
            return
        raise RuntimeError("DSH WLT COD client block not found")
    block = r'''type NotifyDeliveryCollectionInput struct {
	OrderID          string `json:"orderId"`
	CollectorType    string `json:"collectorType"`
	CollectorID      string `json:"collectorId"`
	PartnerID        string `json:"partnerId"`
	CheckoutIntentID string `json:"checkoutIntentId"`
	CorrelationID    string `json:"-"`
	IdempotencyKey   string `json:"-"`
}

// NotifyDeliveryCollection creates one WLT-owned COD custody record after a
// governed delivery proof. WLT derives amount/currency from its own payment
// session. DSH sends only operational identities and never a monetary amount.
func (c *Client) NotifyDeliveryCollection(ctx context.Context, input NotifyDeliveryCollectionInput) error {
	if !c.Configured() {
		return fmt.Errorf("WLT COD custody handoff is not configured")
	}
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.CollectorType = strings.TrimSpace(input.CollectorType)
	input.CollectorID = strings.TrimSpace(input.CollectorID)
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	if input.OrderID == "" || input.CollectorType == "" || input.CollectorID == "" || input.PartnerID == "" || input.CheckoutIntentID == "" {
		return fmt.Errorf("order, collector, partner, and checkout intent are required for COD custody")
	}
	body, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("encode WLT COD custody request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/cod-records", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build WLT COD custody request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = input.OrderID
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = deterministicMutationKey("cod-custody-create", input.OrderID, input.CheckoutIntentID, input.CollectorType, input.CollectorID)
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return fmt.Errorf("prepare WLT COD custody request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT COD custody: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT COD custody returned HTTP %d", response.StatusCode)
	}
	return nil
}

'''
    write(path, text[:start] + block + text[end:])


def patch_wlt_cod_domain() -> None:
    path = "services/wlt/backend/internal/cod/cod.go"
    text = read(path)
    text = replace_once(
        text,
        '''type CodRecord struct {
	ID               string  `json:"id"`
	OrderID          string  `json:"orderId"`
	CaptainID        string  `json:"captainId"`
	PartnerID        string  `json:"partnerId"`''',
        '''type CodRecord struct {
	ID               string  `json:"id"`
	OrderID          string  `json:"orderId"`
	CaptainID        string  `json:"captainId,omitempty"`
	CollectorType    string  `json:"collectorType"`
	CollectorID      string  `json:"collectorId"`
	PartnerID        string  `json:"partnerId"`''',
        "CodRecord collector fields",
    )
    text = replace_once(
        text,
        '''type CreateCodRecordInput struct {
	OrderID   string `json:"orderId"`
	CaptainID string `json:"captainId"`
	PartnerID string `json:"partnerId"`''',
        '''type CreateCodRecordInput struct {
	OrderID       string `json:"orderId"`
	CaptainID     string `json:"captainId,omitempty"`
	CollectorType string `json:"collectorType"`
	CollectorID   string `json:"collectorId"`
	PartnerID     string `json:"partnerId"`''',
        "CreateCodRecordInput collector fields",
    )
    text = replace_once(
        text,
        '''const codCols = `id, order_id, captain_id, partner_id, amount_minor_units, currency,
	status, collected_at, remitted_at, created_at, updated_at`''',
        '''const codCols = `id, order_id, COALESCE(captain_id,''), collector_type, collector_id, partner_id, amount_minor_units, currency,
	status, collected_at, remitted_at, created_at, updated_at`''',
        "COD columns",
    )
    text = text.replace(
        '''		&c.ID, &c.OrderID, &c.CaptainID, &c.PartnerID,
		&c.AmountMinorUnits, &c.Currency, &c.Status,''',
        '''		&c.ID, &c.OrderID, &c.CaptainID, &c.CollectorType, &c.CollectorID, &c.PartnerID,
		&c.AmountMinorUnits, &c.Currency, &c.Status,''',
    )
    start = text.find("func CreateCodRecord(db *sql.DB, input CreateCodRecordInput) (*CodRecord, error) {")
    end = text.find("func getCodRecordByOrder", start)
    if start == -1 or end == -1:
        raise RuntimeError("CreateCodRecord block not found")
    create_block = r'''func normalizeCollector(input CreateCodRecordInput) (string, string, string, error) {
	collectorType := strings.TrimSpace(input.CollectorType)
	collectorID := strings.TrimSpace(input.CollectorID)
	captainID := strings.TrimSpace(input.CaptainID)
	if collectorType == "" && captainID != "" {
		collectorType = "captain"
		collectorID = captainID
	}
	if collectorType == "captain" && collectorID == "" {
		collectorID = captainID
	}
	switch collectorType {
	case "captain", "store_courier", "partner_store":
	default:
		return "", "", "", fmt.Errorf("collectorType must be captain, store_courier, or partner_store")
	}
	if collectorID == "" {
		return "", "", "", fmt.Errorf("collectorId is required")
	}
	if collectorType == "captain" {
		captainID = collectorID
	} else {
		captainID = ""
	}
	return collectorType, collectorID, captainID, nil
}

func CreateCodRecord(db *sql.DB, input CreateCodRecordInput) (*CodRecord, error) {
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	if input.OrderID == "" || input.PartnerID == "" || input.CheckoutIntentID == "" {
		return nil, fmt.Errorf("orderId, partnerId, and checkoutIntentId are required")
	}
	collectorType, collectorID, captainID, err := normalizeCollector(input)
	if err != nil {
		return nil, err
	}

	existing, err := getCodRecordByOrder(db, input.OrderID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.CollectorType != collectorType || existing.CollectorID != collectorID || existing.PartnerID != input.PartnerID {
			return nil, ErrCodStateConflict
		}
		return existing, nil
	}
	session, err := reference.GetPaymentSessionByCheckoutIntent(db, input.CheckoutIntentID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, fmt.Errorf("no WLT payment session found for checkoutIntentId %q", input.CheckoutIntentID)
	}
	if session.PaymentMethod != "cod" {
		return nil, fmt.Errorf("checkoutIntentId %q is not a COD payment session", input.CheckoutIntentID)
	}
	if session.AmountMinorUnits <= 0 {
		return nil, fmt.Errorf("checkoutIntentId %q has no positive COD amount", input.CheckoutIntentID)
	}
	currency := session.Currency
	if currency == "" {
		currency = "YER"
	}

	const q = `
		INSERT INTO wlt_cod_records
		  (order_id, captain_id, collector_type, collector_id, partner_id, amount_minor_units, currency)
		VALUES ($1, NULLIF($2,''), $3, $4, $5, $6, $7)
		ON CONFLICT (order_id) DO NOTHING
		RETURNING ` + codCols
	row := db.QueryRow(q, input.OrderID, captainID, collectorType, collectorID, input.PartnerID, session.AmountMinorUnits, currency)
	created, err := scanCodRecord(row)
	if errors.Is(err, sql.ErrNoRows) {
		existing, getErr := getCodRecordByOrder(db, input.OrderID)
		if getErr != nil {
			return nil, getErr
		}
		if existing == nil || existing.CollectorType != collectorType || existing.CollectorID != collectorID || existing.PartnerID != input.PartnerID {
			return nil, ErrCodStateConflict
		}
		return existing, nil
	}
	return created, err
}

'''
    text = text[:start] + create_block + text[end:]
    start = text.find("func ListCodRecords(db *sql.DB, captainID, partnerID string) ([]*CodRecord, error) {")
    end = text.find("// ErrCodStateConflict", start)
    if start == -1 or end == -1:
        raise RuntimeError("ListCodRecords block not found")
    list_block = r'''func ListCodRecords(db *sql.DB, captainID, partnerID, orderID string) ([]*CodRecord, error) {
	var q string
	var arg string
	if captainID = strings.TrimSpace(captainID); captainID != "" {
		q = `SELECT ` + codCols + ` FROM wlt_cod_records WHERE collector_type='captain' AND collector_id = $1 ORDER BY created_at DESC`
		arg = captainID
	} else if partnerID = strings.TrimSpace(partnerID); partnerID != "" {
		q = `SELECT ` + codCols + ` FROM wlt_cod_records WHERE partner_id = $1 ORDER BY created_at DESC`
		arg = partnerID
	} else if orderID = strings.TrimSpace(orderID); orderID != "" {
		q = `SELECT ` + codCols + ` FROM wlt_cod_records WHERE order_id = $1 ORDER BY created_at DESC`
		arg = orderID
	} else {
		return nil, fmt.Errorf("captainId, partnerId, or orderId query parameter is required")
	}
	rows, err := db.Query(q, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var records []*CodRecord
	for rows.Next() {
		c, err := scanCodRecordRow(rows)
		if err != nil {
			return nil, err
		}
		records = append(records, c)
	}
	return records, rows.Err()
}

'''
    text = text[:start] + list_block + text[end:]
    text = replace_once(
        text,
        'records, err := ListCodRecords(db, q.Get("captainId"), q.Get("partnerId"))',
        'records, err := ListCodRecords(db, q.Get("captainId"), q.Get("partnerId"), q.Get("orderId"))',
        "COD list handler",
    )
    write(path, text)


def patch_wlt_contract() -> None:
    path = "services/wlt/contracts/wlt.openapi.yaml"
    text = read(path)
    start = text.find("    WltCodRecord:\n")
    end = text.find("    WltCodRecordResponse:\n", start)
    if start == -1 or end == -1:
        raise RuntimeError("WLT COD schema block not found")
    block = '''    WltCodRecord:
      type: object
      required:
        - id
        - orderId
        - collectorType
        - collectorId
        - partnerId
        - amountMinorUnits
        - currency
        - status
        - createdAt
        - updatedAt
      properties:
        id: { type: string }
        orderId: { type: string }
        captainId:
          type: string
          description: Compatibility projection, present only when collectorType is captain.
        collectorType:
          type: string
          enum: [captain, store_courier, partner_store]
        collectorId: { type: string, minLength: 1 }
        partnerId: { type: string }
        amountMinorUnits: { type: integer, format: int64, minimum: 1 }
        currency: { type: string }
        status:
          type: string
          enum: [pending_collection, collected, remitted, disputed, resolved]
        collectedAt: { type: [string, 'null'], format: date-time }
        remittedAt: { type: [string, 'null'], format: date-time }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    WltCreateCodRecordRequest:
      type: object
      additionalProperties: false
      description: >-
        Internal DSH-only custody handoff. Monetary values are forbidden in the
        request and are always derived from WLT's payment session.
      required: [orderId, collectorType, collectorId, partnerId, checkoutIntentId]
      properties:
        orderId: { type: string, minLength: 1 }
        collectorType:
          type: string
          enum: [captain, store_courier, partner_store]
        collectorId: { type: string, minLength: 1 }
        captainId:
          type: string
          description: Deprecated compatibility input for captain collectors.
        partnerId: { type: string, minLength: 1 }
        checkoutIntentId: { type: string, minLength: 1 }

'''
    write(path, text[:start] + block + text[end:])


def patch_boundary_types() -> None:
    path = "services/wlt/frontend/shared/dsh/wlt-dsh-boundary.types.ts"
    text = read(path)
    text = replace_once(
        text,
        '''export type WltDshCodReference = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly partnerId: string;''',
        '''export type WltCodCollectorType = "captain" | "store_courier" | "partner_store";

export type WltDshCodReference = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId?: string;
  readonly collectorType: WltCodCollectorType;
  readonly collectorId: string;
  readonly partnerId: string;''',
        "WLT DSH COD boundary",
    )
    write(path, text)


def patch_captain_ui() -> None:
    path = "services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshCaptainBridge.tsx"
    text = read(path)
    for token in ["  Button,\n", "  Surface,\n", "  TextField,\n", "  radius,\n"]:
        text = text.replace(token, "")
    constant_start = text.find("const WLT_MUTATIONS_NOT_APPROVED_MESSAGE =")
    type_start = text.find("type WltDshFinanceSummaryRecord", constant_start)
    if constant_start != -1 and type_start != -1:
        text = text[:constant_start] + text[type_start:]
    old_func_start = text.find("function codReferenceToRecord(ref: WltDshCodReference)")
    old_func_end = text.find("function RecordRow", old_func_start)
    if old_func_start == -1 or old_func_end == -1:
        raise RuntimeError("captain COD row mapper not found")
    mapper = '''function codReferenceToRecord(ref: WltDshCodReference): WltDshFinanceSummaryRecord {
  const isRemitted = ref.status === 'remitted' || ref.remittedAt != null;
  const isCollected = ref.status === 'collected' || ref.collectedAt != null;
  return {
    id: ref.id,
    title: `تحصيل طلب #${ref.orderId}`,
    subtitle: 'نقد عند الاستلام COD',
    timeLabel: ref.collectedAt ?? ref.createdAt,
    amountLabel: formatMinorUnitsToLabel(ref.amountMinorUnits, ref.currency, isCollected && !isRemitted ? '-' : ''),
    tone: isCollected && !isRemitted ? 'negative' : 'neutral',
    statusLabel: isRemitted ? 'تم الإيداع' : isCollected ? 'عهدة بانتظار الإيداع' : 'بانتظار إثبات التحصيل',
    statusTone: isRemitted ? 'success' : isCollected ? 'warning' : 'info',
    kind: 'captain-cod-liability',
  };
}

'''
    text = text[:old_func_start] + mapper + text[old_func_end:]
    local_start = text.find("  // Eligibility, earnings and settlement mutation actions")
    return_start = text.find("  return (", local_start)
    if local_start == -1 or return_start == -1:
        raise RuntimeError("captain fake finance state block not found")
    replacement = '''  const codPendingCollectionCount = codController.state.kind === 'loaded'
    ? codController.state.records.filter((record) => record.status === 'pending_collection').length
    : 0;
  const codCollectedOutstandingCount = codController.state.kind === 'loaded'
    ? codController.state.records.filter((record) => record.status === 'collected' && record.remittedAt == null).length
    : 0;

'''
    text = text[:local_start] + replacement + text[return_start:]
    eligibility_start = text.find("          {/* 1. الأهلية والشحن */}")
    cod_comment = text.find("          {/* 2. ذمة COD */}", eligibility_start)
    if eligibility_start == -1 or cod_comment == -1:
        raise RuntimeError("captain local eligibility section not found")
    text = text[:eligibility_start] + "          {/* 1. عهدة COD الحية من WLT */}\n" + text[cod_comment + len("          {/* 2. ذمة COD */}\n"):]
    text = text.replace("title=\"ذمة COD\"", "title=\"عهدة النقد عند الاستلام\"")
    text = text.replace(
        "subtitle={`الذمة القائمة: ${formatMinorUnitsToLabel(codOutstandingMinorUnits, codCurrency)}`}",
        "subtitle={`العهدة المحصّلة غير المودعة: ${formatMinorUnitsToLabel(codOutstandingMinorUnits, codCurrency)}`}",
    )
    text = text.replace(
        "{ label: 'المبلغ المحصّل — ذمة قائمة', value: formatMinorUnitsToLabel(codOutstandingMinorUnits, codCurrency), tone: 'warning' },\n                    { label: 'دورة التسوية', value: 'أسبوعية - كل خميس', tone: 'default' },\n                    { label: 'الإجراء التالي', value: 'إيداع المبلغ بالبنك قبل موعد التسوية', tone: 'info' },",
        "{ label: 'بانتظار إثبات التحصيل', value: codPendingCollectionCount.toLocaleString(), tone: codPendingCollectionCount > 0 ? 'info' : 'default' },\n                    { label: 'عهد محصّلة غير مودعة', value: codCollectedOutstandingCount.toLocaleString(), tone: codCollectedOutstandingCount > 0 ? 'warning' : 'default' },\n                    { label: 'إجمالي العهدة القائمة', value: formatMinorUnitsToLabel(codOutstandingMinorUnits, codCurrency), tone: codOutstandingMinorUnits > 0 ? 'warning' : 'success' },",
    )
    text = text.replace(
        ".filter((r) => r.status !== 'remitted' && r.remittedAt == null)",
        ".filter((r) => r.status === 'collected' && r.remittedAt == null)",
    )
    for forbidden in ["eligibilityBalance", "isEligible", "showFundingForm", "selectedMethod", "paymentMethods", "2,000 ر.ي", "أسبوعية - كل خميس"]:
        if forbidden in text:
            raise RuntimeError(f"captain local finance residue remains: {forbidden}")
    write(path, text)


def patch_tests() -> None:
    path = "services/wlt/backend/internal/cod/cod_db_test.go"
    text = read(path)
    text = text.replace(
        "INSERT INTO wlt_cod_records (order_id, captain_id, partner_id, amount_minor_units, currency)\n\t\tVALUES ($1, 'captain-test', 'partner-test', 1000, 'YER')",
        "INSERT INTO wlt_cod_records (order_id, captain_id, collector_type, collector_id, partner_id, amount_minor_units, currency)\n\t\tVALUES ($1, 'captain-test', 'captain', 'captain-test', 'partner-test', 1000, 'YER')",
    )
    if "TestCreateCodRecordUsesWltSessionAndCollectorIdentity" not in text:
        text += r'''

func TestCreateCodRecordUsesWltSessionAndCollectorIdentity(t *testing.T) {
	db := getTestDB(t)
	if db == nil { return }
	defer db.Close()
	checkoutIntentID := fmt.Sprintf("checkout-cod-%d", time.Now().UnixNano())
	orderID := fmt.Sprintf("order-cod-%d", time.Now().UnixNano())
	if _, err := db.Exec(`INSERT INTO wlt_payment_sessions(checkout_intent_id,client_id,store_id,payment_method,status,amount_minor_units,currency) VALUES($1,'client-cod-test','store-cod-test','cod','cod_pending',432100,'YER')`, checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	input := CreateCodRecordInput{OrderID: orderID, CollectorType: "store_courier", CollectorID: "courier-cod-test", PartnerID: "partner-cod-test", CheckoutIntentID: checkoutIntentID}
	first, err := CreateCodRecord(db, input)
	if err != nil { t.Fatalf("create COD custody: %v", err) }
	second, err := CreateCodRecord(db, input)
	if err != nil { t.Fatalf("replay COD custody: %v", err) }
	if first.ID != second.ID { t.Fatalf("expected idempotent replay, got %s and %s", first.ID, second.ID) }
	if first.AmountMinorUnits != 432100 || first.Currency != "YER" { t.Fatalf("WLT session truth not used: %+v", first) }
	if first.CollectorType != "store_courier" || first.CollectorID != "courier-cod-test" || first.CaptainID != "" { t.Fatalf("collector identity mismatch: %+v", first) }
}

func TestCreateCodRecordRejectsNonCodSession(t *testing.T) {
	db := getTestDB(t)
	if db == nil { return }
	defer db.Close()
	checkoutIntentID := fmt.Sprintf("checkout-wallet-%d", time.Now().UnixNano())
	if _, err := db.Exec(`INSERT INTO wlt_payment_sessions(checkout_intent_id,client_id,store_id,payment_method,status,amount_minor_units,currency) VALUES($1,'client-wallet-test','store-wallet-test','wallet','authorized',1000,'YER')`, checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	_, err := CreateCodRecord(db, CreateCodRecordInput{OrderID: fmt.Sprintf("order-wallet-%d", time.Now().UnixNano()), CollectorType: "captain", CollectorID: "captain-wallet-test", PartnerID: "partner-wallet-test", CheckoutIntentID: checkoutIntentID})
	if err == nil { t.Fatal("expected non-COD payment session to be rejected") }
}
'''
    write(path, text)


def write_typecheck_config() -> None:
    write(
        "apps/app-captain/runtime/tsconfig.cod-custody-journey.json",
        '''{
  "extends": "./tsconfig.json",
  "include": [
    "next-env.d.ts",
    "../../../services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx",
    "../../../services/dsh/frontend/shared/finance-wlt-link/wlt/**/*.tsx",
    "../../../services/dsh/frontend/shared/finance-wlt-link/wlt-cod/**/*.ts",
    "../../../services/wlt/frontend/shared/dsh/**/*.ts",
    "../../../services/wlt/clients/**/*.ts",
    "../../../services/dsh/frontend/shared/_kernel/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "dist", "build"]
}
''',
    )


def main() -> None:
    write_migration()
    patch_dsh_wlt_client()
    patch_wlt_cod_domain()
    patch_wlt_contract()
    patch_boundary_types()
    patch_captain_ui()
    patch_tests()
    write_typecheck_config()
    print("Applied COD custody slice one.")


if __name__ == "__main__":
    main()
