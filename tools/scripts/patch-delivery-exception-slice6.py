from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def patch_operations_screen() -> None:
    path = "services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx"
    text = read(path)

    if "cancelOrder," not in text:
        text = text.replace(
            "import type { DshDeliveryException } from '../../shared/dispatch/dispatch.types';\n",
            "import type { DshDeliveryException } from '../../shared/dispatch/dispatch.types';\nimport {\n  FINANCIAL_CLOSURE_LABELS,\n  cancelOrder,\n  fetchOrderCancellation,\n  type DshOrderCancellation,\n} from '../../shared/orders';\n",
            1,
        )

    if "function financialTone" not in text:
        anchor = "function isEligibleCaptain(captain: Captain): boolean {"
        block = '''function financialTone(status: DshOrderCancellation['financialClosureStatus']): 'danger' | 'warning' | 'success' | 'neutral' | 'info' {\n  if (status === 'failed') return 'danger';\n  if (status === 'pending') return 'warning';\n  if (status === 'refund_requested') return 'info';\n  if (status === 'session_expired' || status === 'refund_completed' || status === 'no_action') return 'success';\n  return 'neutral';\n}\n\nfunction isNotFound(error: unknown): boolean {\n  const typed = error as { status?: number; body?: { code?: string } };\n  return typed.status === 404 || typed.body?.code === 'NOT_FOUND';\n}\n\n'''
        if anchor not in text:
            raise RuntimeError("operations helper anchor not found")
        text = text.replace(anchor, block + anchor, 1)

    if "returnCancellations" not in text:
        text = text.replace(
            "  const [selectedDeliveryId, setSelectedDeliveryId] = React.useState<string | null>(null);\n",
            "  const [selectedDeliveryId, setSelectedDeliveryId] = React.useState<string | null>(null);\n  const [selectedReturnId, setSelectedReturnId] = React.useState<string | null>(null);\n  const [returnCancellations, setReturnCancellations] = React.useState<Readonly<Record<string, DshOrderCancellation | null>>>({});\n",
            1,
        )

    old_load = '''      setState({\n        kind: 'ready',\n        readiness,\n        delivery: [...open, ...acknowledged],\n        returns: resolved.filter((item) => item.resolutionAction === 'return_to_store'),\n      });'''
    new_load = '''      const returns = resolved.filter((item) => item.resolutionAction === 'return_to_store');\n      const cancellationEntries = await Promise.all(returns.map(async (item) => {\n        try {\n          return [item.orderId, await fetchOrderCancellation('operator', item.orderId)] as const;\n        } catch (error) {\n          if (isNotFound(error)) return [item.orderId, null] as const;\n          throw error;\n        }\n      }));\n      setReturnCancellations(Object.fromEntries(cancellationEntries));\n      setState({\n        kind: 'ready',\n        readiness,\n        delivery: [...open, ...acknowledged],\n        returns,\n      });'''
    if new_load not in text:
        if old_load not in text:
            raise RuntimeError("operations return load anchor not found")
        text = text.replace(old_load, new_load, 1)

    text = text.replace(
        "  }, [selectedReadinessId, selectedDeliveryId]);",
        "  }, [selectedReadinessId, selectedDeliveryId, selectedReturnId]);",
        1,
    )

    if "const cancelReturnedOrder" not in text:
        anchor = "  const resolveReadiness = React.useCallback"
        block = '''  const cancelReturnedOrder = React.useCallback(async (item: DshDeliveryException) => {\n    if (!item.returnedAt) {\n      setActionState({ kind: 'error', id: item.id, message: 'لا يمكن الإلغاء المالي قبل استلام المتجر للمرتجع.' });\n      return;\n    }\n    if (note.trim().length < 5) {\n      setActionState({ kind: 'error', id: item.id, message: 'اكتب سبب الإلغاء المالي بعد فحص المرتجع.' });\n      return;\n    }\n    setActionState({ kind: 'submitting', id: item.id });\n    try {\n      const cancellation = await cancelOrder('operator', item.orderId, {\n        reasonCode: 'operational_failure',\n        reasonNote: `إلغاء بعد استلام المرتجع: ${note.trim()}`,\n        correlationId: `returned-delivery-exception-${item.id}`,\n      });\n      setReturnCancellations((current) => ({ ...current, [item.orderId]: cancellation }));\n      await load();\n    } catch (error) {\n      setActionState({ kind: 'error', id: item.id, message: error instanceof Error ? error.message : 'تعذر تنفيذ الإلغاء المالي الحاكم.' });\n    }\n  }, [load, note]);\n\n'''
        if anchor not in text:
            raise RuntimeError("operations cancellation action anchor not found")
        text = text.replace(anchor, block + anchor, 1)

    if "const selectedReturn =" not in text:
        text = text.replace(
            "  const selectedReadiness = state.readiness.find((item) => item.id === selectedReadinessId) ?? null;\n",
            "  const selectedReadiness = state.readiness.find((item) => item.id === selectedReadinessId) ?? null;\n  const selectedReturn = state.returns.find((item) => item.id === selectedReturnId) ?? null;\n",
            1,
        )

    old_return_cards = '''        ) : state.returns.map((item) => (\n          <Card key={`return-${item.id}`} padding={4} gap={2}>\n            <Text role="bodyStrong" align="start">الطلب: {item.orderId}</Text>\n            <Text role="caption" tone="muted" align="start">الكابتن: {item.captainId}</Text>\n            <Badge label={item.returnedAt ? 'استلم المتجر المرتجع' : 'في طريق العودة إلى المتجر'} tone={item.returnedAt ? 'success' : 'warning'} />\n            <Text role="bodySm" align="start">{item.resolutionNote}</Text>\n            <Button label="فتح الطلب الحي" tone="ghost" size="sm" fullWidth={false} onPress={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: item.orderId }))} />\n          </Card>\n        ))}'''
    new_return_cards = '''        ) : state.returns.map((item) => {\n          const cancellation = returnCancellations[item.orderId];\n          return (\n            <Card key={`return-${item.id}`} padding={4} gap={2}>\n              <Text role="bodyStrong" align="start">الطلب: {item.orderId}</Text>\n              <Text role="caption" tone="muted" align="start">الكابتن: {item.captainId}</Text>\n              <Badge label={item.returnedAt ? 'استلم المتجر المرتجع' : 'في طريق العودة إلى المتجر'} tone={item.returnedAt ? 'success' : 'warning'} />\n              <Text role="bodySm" align="start">{item.resolutionNote}</Text>\n              {cancellation ? (\n                <>\n                  <Badge label={FINANCIAL_CLOSURE_LABELS[cancellation.financialClosureStatus]} tone={financialTone(cancellation.financialClosureStatus)} />\n                  {cancellation.financialReference ? <Text role="caption" align="start">المرجع المالي: {cancellation.financialReference}</Text> : null}\n                  {cancellation.financialFailure ? <Text role="caption" tone="danger" align="start">{cancellation.financialFailure}</Text> : null}\n                </>\n              ) : item.returnedAt ? (\n                <Badge label="بانتظار قرار الإلغاء المالي" tone="warning" />\n              ) : null}\n              <Box gap={2} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>\n                {item.returnedAt ? <Button label={cancellation ? 'فتح الإغلاق المالي' : 'بدء الإغلاق المالي'} tone="secondary" size="sm" onPress={() => { setSelectedDeliveryId(null); setSelectedReadinessId(null); setSelectedReturnId(item.id); }} /> : null}\n                <Button label="فتح الطلب الحي" tone="ghost" size="sm" onPress={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: item.orderId }))} />\n              </Box>\n            </Card>\n          );\n        })}'''
    if new_return_cards not in text:
        if old_return_cards not in text:
            raise RuntimeError("operations return cards anchor not found")
        text = text.replace(old_return_cards, new_return_cards, 1)

    if "إغلاق المرتجع ماليًا" not in text:
        anchor = "      {selectedDelivery ? ("
        block = '''      {selectedReturn ? (\n        <Card padding={4} gap={3}>\n          <Text role="titleSm" align="start">إغلاق المرتجع ماليًا</Text>\n          <Text role="bodySm" align="start">الطلب: {selectedReturn.orderId}</Text>\n          {returnCancellations[selectedReturn.orderId] ? (\n            <>\n              <Badge\n                label={FINANCIAL_CLOSURE_LABELS[returnCancellations[selectedReturn.orderId]!.financialClosureStatus]}\n                tone={financialTone(returnCancellations[selectedReturn.orderId]!.financialClosureStatus)}\n              />\n              {returnCancellations[selectedReturn.orderId]!.financialReference ? (\n                <Text role="caption">المرجع المالي: {returnCancellations[selectedReturn.orderId]!.financialReference}</Text>\n              ) : null}\n              {returnCancellations[selectedReturn.orderId]!.financialFailure ? (\n                <Text role="caption" tone="danger">{returnCancellations[selectedReturn.orderId]!.financialFailure}</Text>\n              ) : null}\n              <Button label="تحديث نتيجة WLT" tone="secondary" onPress={() => void load()} />\n            </>\n          ) : (\n            <>\n              <Text role="bodySm" tone="muted">لن ينشئ DSH استردادًا مباشرًا. سيُنشئ أمر الإلغاء سجلًا واحدًا وOutbox واحدًا، ثم يقرر WLT تحرير الجلسة أو طلب الاسترداد.</Text>\n              <TextField label="سبب الإلغاء بعد فحص المرتجع" value={note} onChangeText={setNote} placeholder="سجل حالة المرتجع وسبب عدم إعادة التنفيذ" multiline />\n              {actionState.kind === 'error' && actionState.id === selectedReturn.id ? <Text role="caption" tone="danger">{actionState.message}</Text> : null}\n              <Button label="إلغاء الطلب وبدء الإغلاق المالي" tone="danger" disabled={actionState.kind === 'submitting' || note.trim().length < 5} onPress={() => void cancelReturnedOrder(selectedReturn)} />\n            </>\n          )}\n          <Button label="إغلاق التفاصيل" tone="ghost" onPress={() => setSelectedReturnId(null)} />\n        </Card>\n      ) : null}\n\n'''
        if anchor not in text:
            raise RuntimeError("operations return financial panel anchor not found")
        text = text.replace(anchor, block + anchor, 1)

    write(path, text)


def write_db_test() -> None:
    write(
        "services/dsh/backend/internal/orders/returned_cancellation_db_test.go",
        r'''package orders

import (
	"fmt"
	"testing"
	"time"
)

func TestReturnedOrderCancellationCreatesOneGovernedFinancialHandoffDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusReturnedStore))
	correlationID := fmt.Sprintf("returned-order-cancel-%d", time.Now().UnixNano())
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id=$1`, paymentSessionID)
	})

	input := CancellationInput{
		OrderID:       order.ID,
		ActorID:       "operator-return-closure-test",
		ActorRole:     "operator",
		ReasonCode:    "operational_failure",
		ReasonNote:    "returned order inspected and cannot be redelivered",
		CorrelationID: correlationID,
	}
	first, err := CancelOrder(db, input)
	if err != nil {
		t.Fatalf("returned-order CancelOrder failed: %v", err)
	}
	second, err := CancelOrder(db, input)
	if err != nil {
		t.Fatalf("returned-order idempotent replay failed: %v", err)
	}
	if first.Status != StatusCancelledByOperator || second.Status != StatusCancelledByOperator {
		t.Fatalf("expected operator cancellation, got first=%s second=%s", first.Status, second.Status)
	}

	var cancellationCount, outboxCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, order.ID).Scan(&cancellationCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_checkout_financial_closure_outbox WHERE order_id=$1::uuid AND event_type='cancel_for_order'`, order.ID).Scan(&outboxCount); err != nil {
		t.Fatal(err)
	}
	if cancellationCount != 1 || outboxCount != 1 {
		t.Fatalf("expected one cancellation and one financial handoff, got cancellations=%d outbox=%d", cancellationCount, outboxCount)
	}

	projection, err := GetCancellation(db, order.ID)
	if err != nil {
		t.Fatalf("GetCancellation failed: %v", err)
	}
	if projection.ActorRole != "operator" || projection.ReasonCode != "operational_failure" {
		t.Fatalf("unexpected returned-order cancellation projection: %+v", projection)
	}
	if projection.FinancialClosureStatus != "pending" || projection.FinancialReference != "" {
		t.Fatalf("expected pending WLT handoff without fabricated reference, got status=%q ref=%q", projection.FinancialClosureStatus, projection.FinancialReference)
	}
}
''',
    )


def patch_order_sorting() -> None:
    path = "services/dsh/backend/internal/orders/orders.go"
    text = read(path)
    old = '''\t\t\t\t\tWHEN 'arrived_customer' THEN 8\n\t\t\t\t\tWHEN 'delivered' THEN 9\n\t\t\t\t\tWHEN 'cancelled' THEN 10\n\t\t\t\t\tELSE 99'''
    new = '''\t\t\t\t\tWHEN 'arrived_customer' THEN 8\n\t\t\t\t\tWHEN 'returning_to_store' THEN 9\n\t\t\t\t\tWHEN 'returned_to_store' THEN 10\n\t\t\t\t\tWHEN 'delivered' THEN 11\n\t\t\t\t\tWHEN 'cancelled_by_client' THEN 12\n\t\t\t\t\tWHEN 'cancelled_by_store' THEN 13\n\t\t\t\t\tWHEN 'cancelled_by_operator' THEN 14\n\t\t\t\t\tWHEN 'cancelled_no_driver' THEN 15\n\t\t\t\t\tWHEN 'failed_payment' THEN 16\n\t\t\t\t\tWHEN 'failed_dispatch' THEN 17\n\t\t\t\t\tELSE 99'''
    if new not in text:
        if old not in text:
            raise RuntimeError("legacy operator order sorting anchor not found")
        text = text.replace(old, new, 1)
    write(path, text)


def main() -> None:
    patch_operations_screen()
    write_db_test()
    patch_order_sorting()
    print("Returned-order governed cancellation and financial handoff slice applied.")


if __name__ == "__main__":
    main()
