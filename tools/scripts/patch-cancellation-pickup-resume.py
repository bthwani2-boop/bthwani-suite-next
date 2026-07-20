from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def patch_backend() -> None:
    write(
        "services/dsh/backend/internal/pickup/partner_state.go",
        r'''package pickup

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

type PartnerStage string

const (
	PartnerStageNotReady        PartnerStage = "not_ready"
	PartnerStageReady           PartnerStage = "ready"
	PartnerStageNotified        PartnerStage = "notified"
	PartnerStageCustomerArrived PartnerStage = "customer_arrived"
	PartnerStageVerified        PartnerStage = "verified"
	PartnerStageNoShow          PartnerStage = "no_show"
	PartnerStageCancelled       PartnerStage = "cancelled"
)

func isPickupCancellationOrderStatus(status string) bool {
	return strings.HasPrefix(status, "cancelled_") || status == "failed_payment" || status == "failed_dispatch"
}

// ResolvePartnerStage returns the resumable partner-facing pickup stage from
// the sovereign order/session state and the latest durable pickup audit event.
func ResolvePartnerStage(db *sql.DB, orderID, orderStatus string, session *PickupSession) (PartnerStage, error) {
	if isPickupCancellationOrderStatus(orderStatus) {
		return PartnerStageCancelled, nil
	}
	if session == nil {
		if orderStatus == "ready_for_pickup" {
			return PartnerStageReady, nil
		}
		return PartnerStageNotReady, nil
	}

	switch session.Status {
	case SessionCancelled:
		return PartnerStageCancelled, nil
	case SessionVerified, SessionConsumed:
		return PartnerStageVerified, nil
	case SessionNoShow:
		return PartnerStageNoShow, nil
	case SessionActive:
		if !session.ExpiresAt.After(time.Now().UTC()) {
			return PartnerStageReady, nil
		}
	default:
		return PartnerStageReady, nil
	}

	var action string
	err := db.QueryRow(`
		SELECT action
		FROM dsh_pickup_audit_events
		WHERE entity_id IN ($1, $2)
		  AND action IN ('issue_otp', 'notify_customer', 'customer_arrived')
		ORDER BY created_at DESC
		LIMIT 1`,
		session.ID, orderID,
	).Scan(&action)
	if errors.Is(err, sql.ErrNoRows) {
		return PartnerStageReady, nil
	}
	if err != nil {
		return "", err
	}

	switch action {
	case "customer_arrived":
		return PartnerStageCustomerArrived, nil
	case "notify_customer":
		return PartnerStageNotified, nil
	default:
		return PartnerStageReady, nil
	}
}
''',
    )

    path = "services/dsh/backend/internal/http/server.go"
    text = read(path)
    route = 'mux.HandleFunc("GET /dsh/partner/orders/{orderId}/pickup", protected.handleGetPartnerPickupState)'
    if route not in text:
        anchor = 'mux.HandleFunc("POST /dsh/partner/orders/{orderId}/pickup/mark-ready", protected.handlePickupMarkReady)'
        if anchor not in text:
            raise RuntimeError("partner pickup route anchor not found")
        text = text.replace(anchor, route + "\n\t" + anchor, 1)
    write(path, text)

    path = "services/dsh/backend/internal/http/pickup.go"
    text = read(path)
    if "handleGetPartnerPickupState" not in text:
        anchor = "func (s *protectedStoreServer) handlePickupMarkReady"
        handler = r'''func (s *protectedStoreServer) handleGetPartnerPickupState(w http.ResponseWriter, r *http.Request) {
	_, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	if ownedOrder.FulfillmentMode != "pickup" {
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_INVALID_TRANSITION", "order is not a pickup order")
		return
	}

	session, err := pickup.GetByOrderID(s.db, ownedOrder.ID)
	if errors.Is(err, pickup.ErrNotFound) {
		session = nil
		err = nil
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load pickup session")
		return
	}

	stage, err := pickup.ResolvePartnerStage(s.db, ownedOrder.ID, string(ownedOrder.Status), session)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve pickup stage")
		return
	}

	var sessionPayload any
	if session != nil {
		sessionPayload = marshalPickupSession(session)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"session": sessionPayload,
		"stage":   stage,
	})
}

'''
        if anchor not in text:
            raise RuntimeError("partner pickup handler anchor not found")
        text = text.replace(anchor, handler + anchor, 1)
    write(path, text)

    write(
        "services/dsh/backend/internal/pickup/partner_state_db_test.go",
        r'''package pickup

import (
	"context"
	"testing"
	"time"
)

func TestResolvePartnerStageResumesAndCancelsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	service := NewService(db)
	ctx := context.Background()

	_, session := issuedSession(t, service, fixture)
	stage, err := ResolvePartnerStage(db, fixture.orderID, "ready_for_pickup", session)
	if err != nil || stage != PartnerStageReady {
		t.Fatalf("expected ready after issue, got stage=%q err=%v", stage, err)
	}

	if err := service.NotifyCustomer(ctx, fixture.orderID, "partner-1", "partner", "stage-notify"); err != nil {
		t.Fatalf("notify customer: %v", err)
	}
	stage, err = ResolvePartnerStage(db, fixture.orderID, "ready_for_pickup", session)
	if err != nil || stage != PartnerStageNotified {
		t.Fatalf("expected notified, got stage=%q err=%v", stage, err)
	}

	if err := service.CustomerArrived(ctx, fixture.orderID, "partner-1", "partner", "stage-arrived"); err != nil {
		t.Fatalf("customer arrived: %v", err)
	}
	stage, err = ResolvePartnerStage(db, fixture.orderID, "ready_for_pickup", session)
	if err != nil || stage != PartnerStageCustomerArrived {
		t.Fatalf("expected customer_arrived, got stage=%q err=%v", stage, err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_orders
		SET status='cancelled_by_operator',
		    cancellation_reason_code='operational_failure',
		    cancellation_note='pickup cancelled by operations',
		    cancelled_at=NOW()
		WHERE id=$1::uuid`, fixture.orderID); err != nil {
		t.Fatalf("cancel pickup order: %v", err)
	}
	cancelled, err := Get(db, session.ID)
	if err != nil {
		t.Fatalf("reload cancelled session: %v", err)
	}
	stage, err = ResolvePartnerStage(db, fixture.orderID, "cancelled_by_operator", cancelled)
	if err != nil || stage != PartnerStageCancelled {
		t.Fatalf("expected cancelled, got stage=%q err=%v", stage, err)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_pickup_sessions
		SET status='active', cancelled_at=NULL, cancellation_reason=NULL,
		    expires_at=$2, updated_at=NOW()
		WHERE id=$1`, session.ID, time.Now().UTC().Add(-time.Minute)); err != nil {
		t.Fatalf("force expiry: %v", err)
	}
	expired, err := Get(db, session.ID)
	if err != nil {
		t.Fatalf("reload expired session: %v", err)
	}
	stage, err = ResolvePartnerStage(db, fixture.orderID, "ready_for_pickup", expired)
	if err != nil || stage != PartnerStageReady {
		t.Fatalf("expected ready for expired code reissue, got stage=%q err=%v", stage, err)
	}
}
''',
    )


def patch_contract() -> None:
    path = "services/dsh/contracts/dsh.openapi.yaml"
    text = read(path)
    old_stage = "enum: [not_ready, ready, notified, customer_arrived, verified, no_show]"
    new_stage = "enum: [not_ready, ready, notified, customer_arrived, verified, no_show, cancelled]"
    if old_stage in text:
        text = text.replace(old_stage, new_stage, 1)
    write(path, text)


def patch_frontend() -> None:
    path = "services/dsh/frontend/shared/pickup/pickup.api.ts"
    text = read(path)
    text = text.replace(
        'export type PartnerPickupStage = "not_ready" | "ready" | "notified" | "customer_arrived" | "verified" | "no_show";',
        'export type PartnerPickupStage = "not_ready" | "ready" | "notified" | "customer_arrived" | "verified" | "no_show" | "cancelled";',
    )
    write(path, text)

    path = "services/dsh/frontend/shared/pickup/pickup.types.ts"
    text = read(path)
    if '| "PICKUP_CANCELLED"' not in text:
        text = text.replace(
            '  | "VERSION_CONFLICT"\n',
            '  | "VERSION_CONFLICT"\n  | "PICKUP_CANCELLED"\n',
            1,
        )
    write(path, text)

    path = "services/dsh/frontend/shared/pickup/use-pickup-controller.tsx"
    text = read(path)
    old_effect = '''  useEffect(() => {
    void load();
  }, [load]);'''
    new_effect = '''  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 10_000);
    return () => clearInterval(interval);
  }, [load]);'''
    if old_effect in text:
        text = text.replace(old_effect, new_effect, 1)

    old_catch = '''    } catch (error) {
      const { message, classified } = classifiedMessage(error, "تعذر تنفيذ الإجراء.");
      setState((current) => ({
        ...current,
        busy: false,
        isError: true,
        message,
        errorCode: classified.code,
      }));
      return false;
    }'''
    new_catch = '''    } catch (error) {
      const { message, classified } = classifiedMessage(error, "تعذر تنفيذ الإجراء.");
      if (classified.code === "PICKUP_CANCELLED") {
        try {
          const response = await fetchPartnerPickupState(orderId);
          setState({
            session: response.session,
            stage: response.stage,
            loaded: true,
            busy: false,
            isError: true,
            message,
            errorCode: classified.code,
          });
          return false;
        } catch {
          // Preserve the original governed cancellation error below.
        }
      }
      setState((current) => ({
        ...current,
        busy: false,
        isError: true,
        message,
        errorCode: classified.code,
      }));
      return false;
    }'''
    if old_catch in text:
        text = text.replace(old_catch, new_catch, 1)
    write(path, text)

    path = "services/dsh/frontend/app-partner/orders/PartnerFulfillmentActionsPanel.tsx"
    text = read(path)
    if "PICKUP_CANCELLED:" not in text:
        text = text.replace(
            "  PICKUP_CODE_ALREADY_USED: 'تم استخدام رمز الاستلام مسبقًا.',",
            "  PICKUP_CANCELLED: 'ألغيت جلسة الاستلام الذاتي مع إلغاء الطلب.',\n  PICKUP_CODE_ALREADY_USED: 'تم استخدام رمز الاستلام مسبقًا.',",
            1,
        )
    text = text.replace(
        "tone={stage === 'verified' ? 'success' : stage === 'no_show' ? 'danger' : 'action'}",
        "tone={stage === 'verified' ? 'success' : stage === 'no_show' || stage === 'cancelled' ? 'danger' : 'action'}",
        1,
    )
    segment = text[text.index("function PickupActions") :]
    if "{stage === 'cancelled' ? (" not in segment:
        anchor = '''      {stage === 'no_show' ? (
        <Text role="bodySm" tone="warning" style={{ textAlign }}>
          أغلقت جلسة الرمز كعدم حضور. يبقى قرار إلغاء الطلب أو تمديد النافذة بيد العمليات.
        </Text>
      ) : null}
'''
        addition = anchor + '''
      {stage === 'cancelled' ? (
        <Box layoutDirection="row" style={{ alignItems: 'center', gap: spacing[2] }}>
          <Icon name="close-circle" size={18} tone="danger" />
          <Text role="bodySm" tone="danger" style={{ textAlign }}>
            ألغيت جلسة الاستلام الذاتي مع الطلب، وتم تعطيل إصدار الرمز والتحقق والتمديد.
            {session?.cancellationReason ? ` السبب: ${session.cancellationReason}` : ''}
          </Text>
        </Box>
      ) : null}
'''
        if anchor not in text:
            raise RuntimeError("partner pickup cancellation panel anchor not found")
        text = text.replace(anchor, addition, 1)
    write(path, text)


def patch_typecheck_configs() -> None:
    path = "apps/app-partner/runtime/tsconfig.cancellation-journey.json"
    text = read(path)
    if "PartnerFulfillmentActionsPanel.tsx" not in text:
        text = text.replace(
            '    "../../../services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx",\n',
            '    "../../../services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx",\n'
            '    "../../../services/dsh/frontend/app-partner/orders/PartnerFulfillmentActionsPanel.tsx",\n',
            1,
        )
    if 'shared/pickup/**/*.ts"' not in text:
        text = text.replace(
            '    "../../../services/dsh/frontend/shared/orders/**/*.tsx",\n',
            '    "../../../services/dsh/frontend/shared/orders/**/*.tsx",\n'
            '    "../../../services/dsh/frontend/shared/pickup/**/*.ts",\n'
            '    "../../../services/dsh/frontend/shared/pickup/**/*.tsx",\n',
            1,
        )
    write(path, text)

    path = "apps/control-panel/runtime/tsconfig.cancellation-journey.json"
    text = read(path)
    if "PickupWorkbenchScreen.tsx" not in text:
        text = text.replace(
            '    "../../../services/dsh/frontend/control-panel/operations/OrderJourneyLiveOrdersScreen.tsx",\n',
            '    "../../../services/dsh/frontend/control-panel/operations/OrderJourneyLiveOrdersScreen.tsx",\n'
            '    "../../../services/dsh/frontend/control-panel/operations/PickupWorkbenchScreen.tsx",\n',
            1,
        )
    if 'shared/pickup/**/*.ts"' not in text:
        text = text.replace(
            '    "../../../services/dsh/frontend/shared/orders/**/*.tsx",\n',
            '    "../../../services/dsh/frontend/shared/orders/**/*.tsx",\n'
            '    "../../../services/dsh/frontend/shared/pickup/**/*.ts",\n'
            '    "../../../services/dsh/frontend/shared/pickup/**/*.tsx",\n',
            1,
        )
    write(path, text)


def main() -> None:
    patch_backend()
    patch_contract()
    patch_frontend()
    patch_typecheck_configs()
    (ROOT / "tools/scripts/patch-cancellation-pickup-resume.py").unlink(missing_ok=True)
    print("Pickup cancellation resume path patched across backend, contract, partner and operations surfaces.")


if __name__ == "__main__":
    main()
