from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str) -> None:
    text = read(relative)
    if old in text:
        write(relative, text.replace(old, new, 1))
        return
    if new in text:
        return
    raise RuntimeError(f"missing anchor in {relative}: {old[:160]!r}")


def replace_all(relative: str, replacements: dict[str, str]) -> None:
    text = read(relative)
    for old, new in replacements.items():
        text = text.replace(old, new)
    write(relative, text)


# Partner team audit closure.
replace_once(
    "services/dsh/backend/internal/partner/model.go",
    '''type TeamMemberActionInput struct {
\tAction  string `json:"action"`
\tActorID string `json:"-"`
}''',
    '''type TeamMemberActionInput struct {
\tAction         string `json:"action"`
\tActorID        string `json:"-"`
\tReason         string `json:"-"`
\tCorrelationID  string `json:"-"`
\tIdempotencyKey string `json:"-"`
}''',
)
replace_once(
    "services/dsh/backend/internal/partner/handler.go",
    '''\t\tinput.ActorID = actorID
\t\terr := ExecuteStoreTeamMemberAction(db, r.PathValue("storeId"), r.PathValue("memberId"), input)''',
    '''\t\tinput.ActorID = actorID
\t\tinput.Reason = "partner_team_action:" + input.Action
\t\tinput.CorrelationID = correlationID(r)
\t\tinput.IdempotencyKey = idempotencyKey(r)
\t\terr := ExecuteStoreTeamMemberAction(db, r.PathValue("storeId"), r.PathValue("memberId"), input)''',
)
replace_once(
    "services/dsh/backend/internal/partner/repository.go",
    '''\tdefer tx.Rollback()

\tvar currentStoreID, fromStatus string''',
    '''\tdefer tx.Rollback()

\tif input.IdempotencyKey != "" {
\t\tvar replayed bool
\t\tif err := tx.QueryRow(`
\t\t\tSELECT EXISTS (
\t\t\t\tSELECT 1
\t\t\t\tFROM dsh_store_team_member_actions
\t\t\t\tWHERE store_id = $1 AND idempotency_key = $2
\t\t\t)`, storeID, input.IdempotencyKey).Scan(&replayed); err != nil {
\t\t\treturn err
\t\t}
\t\tif replayed {
\t\t\treturn nil
\t\t}
\t}

\tvar currentStoreID, fromStatus string''',
)
replace_once(
    "services/dsh/backend/internal/partner/repository.go",
    '''\tif _, err := tx.Exec(`
\t\tINSERT INTO dsh_store_team_member_actions (
\t\t\tmember_id, store_id, action_label, from_status, to_status, actor_id
\t\t) VALUES ($1, $2, $3, $4, $5, $6)`,
\t\tmemberID, storeID, input.Action, fromStatus, toStatus, input.ActorID); err != nil {''',
    '''\tif _, err := tx.Exec(`
\t\tINSERT INTO dsh_store_team_member_actions (
\t\t\tmember_id, store_id, action_label, from_status, to_status, actor_id,
\t\t\treason, correlation_id, idempotency_key
\t\t) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
\t\tmemberID, storeID, input.Action, fromStatus, toStatus, input.ActorID,
\t\tinput.Reason, input.CorrelationID, input.IdempotencyKey); err != nil {''',
)
replace_once(
    "services/dsh/database/tests/dsh-058_partner_team_idempotency.sql",
    '''    member_id, store_id, action_label, from_status, to_status, actor_id, reason
  ) VALUES (
    v_member_id, v_test_store_id, 'activate', 'active', 'active', v_actor_id, 'retry'
  );''',
    '''    member_id, store_id, action_label, from_status, to_status, actor_id,
    reason, correlation_id, idempotency_key
  ) VALUES (
    v_member_id, v_test_store_id, 'activate', 'active', 'active', v_actor_id,
    'retry', 'test-correlation', 'test-idempotency'
  );''',
)

# Runtime collection cardinality must be stable for zero, one, or many media files.
replace_once(
    "infra/docker/scripts/runtime.ps1",
    '''  $ExpectedFiles = $Manifest.media | Select-Object -ExpandProperty relativeSourcePath

  $MediaDirectory = (Resolve-Path "services/dsh/database/seeds/local/media").Path
  $Missing = $ExpectedFiles | Where-Object { -not (Test-Path (Join-Path $MediaDirectory $_)) }''',
    '''  $ExpectedFiles = @($Manifest.media | Select-Object -ExpandProperty relativeSourcePath)

  $MediaDirectory = (Resolve-Path "services/dsh/database/seeds/local/media").Path
  $Missing = @($ExpectedFiles | Where-Object { -not (Test-Path (Join-Path $MediaDirectory $_)) })''',
)

# Durable DSH -> WLT events carry the tenant through enqueue, claim, retry,
# reversal creation, and both delivery implementations.
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox.go",
    '''\t"fmt"
\t"time"''',
    '''\t"fmt"
\t"strings"
\t"time"''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox.go",
    '''func Enqueue(tx *sql.Tx, eventType, orderID, captainID, partnerID, checkoutIntentID string) error {
\t_, err := tx.Exec(`
    INSERT INTO dsh_wlt_outbox_events
      (event_type,order_id,captain_id,partner_id,checkout_intent_id)
    VALUES ($1,NULLIF($2,'')::uuid,$3,$4,NULLIF($5,'')::uuid)
    ON CONFLICT DO NOTHING`, eventType, orderID, captainID, partnerID, checkoutIntentID)''',
    '''func Enqueue(tx *sql.Tx, eventType, tenantID, orderID, captainID, partnerID, checkoutIntentID string) error {
\ttenantID = strings.TrimSpace(tenantID)
\tif tx == nil || tenantID == "" {
\t\treturn fmt.Errorf("enqueue wlt outbox event: tenant context is required")
\t}
\t_, err := tx.Exec(`
    INSERT INTO dsh_wlt_outbox_events
      (event_type,tenant_id,order_id,captain_id,partner_id,checkout_intent_id)
    VALUES ($1,$2,NULLIF($3,'')::uuid,$4,$5,NULLIF($6,'')::uuid)
    ON CONFLICT DO NOTHING`, eventType, tenantID, orderID, captainID, partnerID, checkoutIntentID)''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox.go",
    '''           client_id,tenant_id,points,reversal_of_reference,
            external_reference,payload,reversal_requested,attempt_count''',
    '''           COALESCE(client_id,''),tenant_id,COALESCE(points,0),COALESCE(reversal_of_reference,''),
            COALESCE(external_reference,''),COALESCE(payload,'{}'::jsonb),COALESCE(reversal_requested,FALSE),attempt_count''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox.go",
    '''\tvar eventType, orderID, partnerID, checkoutIntentID, clientID string''',
    '''\tvar eventType, tenantID, orderID, partnerID, checkoutIntentID, clientID string''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox.go",
    '''    SELECT event_type,COALESCE(order_id::text,''),COALESCE(partner_id,''),
           COALESCE(checkout_intent_id::text,''),client_id,points,
           reversal_requested,payload''',
    '''    SELECT event_type,tenant_id,COALESCE(order_id::text,''),COALESCE(partner_id,''),
           COALESCE(checkout_intent_id::text,''),COALESCE(client_id,''),COALESCE(points,0),
           COALESCE(reversal_requested,FALSE),COALESCE(payload,'{}'::jsonb)''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox.go",
    '''\t).Scan(
\t\t&eventType, &orderID, &partnerID, &checkoutIntentID, &clientID,
\t\t&points, &reversalRequested, &payload,
\t)''',
    '''\t).Scan(
\t\t&eventType, &tenantID, &orderID, &partnerID, &checkoutIntentID, &clientID,
\t\t&points, &reversalRequested, &payload,
\t)''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox.go",
    '''      INSERT INTO dsh_wlt_outbox_events
        (event_type,order_id,captain_id,partner_id,checkout_intent_id,
         client_id,points,reversal_of_reference,payload)
      VALUES ('loyalty_reversed',$1::uuid,'',$2,NULLIF($3,'')::uuid,$4,$5,$6,$7)
      ON CONFLICT DO NOTHING`, orderID, partnerID, checkoutIntentID, clientID, points, externalReference, reversalPayload); err != nil {''',
    '''      INSERT INTO dsh_wlt_outbox_events
        (event_type,tenant_id,order_id,captain_id,partner_id,checkout_intent_id,
         client_id,points,reversal_of_reference,payload)
      VALUES ('loyalty_reversed',$1,$2::uuid,'',$3,NULLIF($4,'')::uuid,$5,$6,$7,$8)
      ON CONFLICT DO NOTHING`, tenantID, orderID, partnerID, checkoutIntentID, clientID, points, externalReference, reversalPayload); err != nil {''',
)
replace_once(
    "services/dsh/backend/internal/orders/lifecycle.go",
    '''type DeliveryCompletionContext struct {
\tCheckoutIntentID string
\tPaymentMethod    string
\tPartnerID        string
}''',
    '''type DeliveryCompletionContext struct {
\tTenantID         string
\tCheckoutIntentID string
\tPaymentMethod    string
\tPartnerID        string
}''',
)
replace_once(
    "services/dsh/backend/internal/orders/lifecycle.go",
    '''\t\tSELECT o.checkout_intent_id::text, ci.payment_method, s.partner_id''',
    '''\t\tSELECT ci.tenant_id, o.checkout_intent_id::text, ci.payment_method, s.partner_id''',
)
replace_once(
    "services/dsh/backend/internal/orders/lifecycle.go",
    '''\t).Scan(&context.CheckoutIntentID, &context.PaymentMethod, &partnerID)''',
    '''\t).Scan(&context.TenantID, &context.CheckoutIntentID, &context.PaymentMethod, &partnerID)''',
)
replace_once(
    "services/dsh/backend/internal/dispatch/dispatch.go",
    '''return wltoutbox.Enqueue(tx, wltoutbox.EventTypeDeliveryCompleted, orderID, captainID, deliveryCtx.PartnerID, deliveryCtx.CheckoutIntentID)''',
    '''return wltoutbox.Enqueue(tx, wltoutbox.EventTypeDeliveryCompleted, deliveryCtx.TenantID, orderID, captainID, deliveryCtx.PartnerID, deliveryCtx.CheckoutIntentID)''',
)
replace_once(
    "services/dsh/backend/internal/partnerdelivery/service.go",
    '''\t\twltoutbox.EventTypeDeliveryCompleted,
\t\torderID,''',
    '''\t\twltoutbox.EventTypeDeliveryCompleted,
\t\tdeliveryCtx.TenantID,
\t\torderID,''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox_db_test.go",
    '''\tclientID := "wlt-outbox-test-client-" + suffix''',
    '''\ttenantID := "tenant-wlt-outbox-test"
\tclientID := "wlt-outbox-test-client-" + suffix''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox_db_test.go",
    '''\t\tINSERT INTO dsh_checkout_intents (client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
\t\tVALUES ($1, $2::uuid, $3, 'payment_pending', 'cod', $4)''',
    '''\t\tINSERT INTO dsh_checkout_intents (tenant_id, client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
\t\tVALUES ($1, $2, $3::uuid, $4, 'payment_pending', 'cod', $5)''',
)
replace_once(
    "services/dsh/backend/internal/wltoutbox/wltoutbox_db_test.go",
    '''\t\tclientID, cartID, storeID, "wlt-ps-"+suffix,''',
    '''\t\ttenantID, clientID, cartID, storeID, "wlt-ps-"+suffix,''',
)
replace_all(
    "services/dsh/backend/internal/wltoutbox/wltoutbox_db_test.go",
    {
        'Enqueue(tx, EventTypeDeliveryCompleted, orderID, "captain-1", "partner-1", checkoutIntentID)':
            'Enqueue(tx, EventTypeDeliveryCompleted, "tenant-wlt-outbox-test", orderID, "captain-1", "partner-1", checkoutIntentID)'
    },
)

# Central catalog bootstrap must use sovereign IDs, truthful media types, and
# the required image-before-approval sequence.
replace_all(
    "tools/scripts/bootstrap-products.json",
    {
        '"domain-grocery"': '"domain-groceries"',
        '"node-grocery"': '"node-supermarket"',
        '"domain-restaurant"': '"domain-restaurants"',
        '"node-restaurant"': '"node-restaurants"',
    },
)
replace_once(
    "tools/scripts/bootstrap-dev-data.mjs",
    '''  const fileStats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const assetIdentity = `${intendedEntityType}:${intendedEntityId}:${intendedRole}:${fileName}`;''',
    '''  const fileStats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName).toLowerCase();
  const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  const assetIdentity = `${intendedEntityType}:${intendedEntityId}:${intendedRole}:${fileName}`;''',
)
replace_all(
    "tools/scripts/bootstrap-dev-data.mjs",
    {"mimeType: 'image/png'": "mimeType", "'Content-Type': 'image/png'": "'Content-Type': mimeType"},
)
replace_once(
    "tools/scripts/bootstrap-dev-data.mjs",
    '''      const adopted = await transitionProposal(operatorToken, proposal.id, 'catalog-adopted');
      await transitionProposal(operatorToken, proposal.id, 'catalog-approved');

      const fixturePath''',
    '''      const adopted = await transitionProposal(operatorToken, proposal.id, 'catalog-adopted');

      const fixturePath''',
)
replace_once(
    "tools/scripts/bootstrap-dev-data.mjs",
    '''        'canonical_product_image',
      );

      console.log(`Setting assortment for ${storeId}...`);''',
    '''        'canonical_product_image',
      );

      await transitionProposal(operatorToken, proposal.id, 'catalog-approved');

      console.log(`Setting assortment for ${storeId}...`);''',
)

# Missing sovereign identifiers are client errors; unexpected catalog failures
# remain safe externally but become diagnosable in service logs.
replace_once(
    "services/dsh/backend/internal/http/centralcatalog.go",
    '''\t"errors"
\t"net/http"''',
    '''\t"errors"
\t"log"
\t"net/http"''',
)
replace_once(
    "services/dsh/backend/internal/http/centralcatalog.go",
    '''\tdefault:
\t\tstore.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "central catalog operation failed")''',
    '''\tdefault:
\t\tlog.Printf("central catalog operation failed: %v", err)
\t\tstore.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "central catalog operation failed")''',
)
replace_once(
    "services/dsh/backend/internal/centralcatalog/centralcatalog.go",
    '''\terr := db.QueryRowContext(ctx, `SELECT is_manual_request FROM dsh_catalog_domains WHERE id=$1`, input.DomainID).Scan(&isManual)
\tif err != nil {
\t\treturn ProductProposal{}, err
\t}''',
    '''\terr := db.QueryRowContext(ctx, `SELECT is_manual_request FROM dsh_catalog_domains WHERE id=$1`, input.DomainID).Scan(&isManual)
\tif errors.Is(err, sql.ErrNoRows) {
\t\treturn ProductProposal{}, fmt.Errorf("%w: DOMAIN_NOT_FOUND", ErrInvalid)
\t}
\tif err != nil {
\t\treturn ProductProposal{}, fmt.Errorf("resolve proposal domain: %w", err)
\t}''',
)
replace_once(
    "services/dsh/backend/internal/centralcatalog/centralcatalog.go",
    '''\tif err != nil {
\t\treturn ProductProposal{}, err
\t}
\treturn GetProposal(ctx, db, id)
}''',
    '''\tif err != nil {
\t\treturn ProductProposal{}, fmt.Errorf("insert product proposal: %w", err)
\t}
\tproposal, err := GetProposal(ctx, db, id)
\tif err != nil {
\t\treturn ProductProposal{}, fmt.Errorf("read created product proposal: %w", err)
\t}
\treturn proposal, nil
}''',
)

Path(__file__).unlink()
