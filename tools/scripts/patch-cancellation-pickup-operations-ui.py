from pathlib import Path

controller_path = Path("services/dsh/frontend/shared/pickup/use-pickup-controller.tsx")
controller = controller_path.read_text(encoding="utf-8")
old_effect = '''  useEffect(() => {
    if (autoLoad) void loadList();
  }, [autoLoad, loadList]);'''
new_effect = '''  useEffect(() => {
    if (!autoLoad) return;
    void loadList();
    const interval = setInterval(() => void loadList(), 15_000);
    return () => clearInterval(interval);
  }, [autoLoad, loadList]);'''
if old_effect not in controller and new_effect not in controller:
    raise RuntimeError("operator pickup polling anchor not found")
controller = controller.replace(old_effect, new_effect, 1)
controller_path.write_text(controller, encoding="utf-8")

screen_path = Path("services/dsh/frontend/control-panel/operations/PickupWorkbenchScreen.tsx")
screen = screen_path.read_text(encoding="utf-8")
old_block = '''          listState.data.map((session) => {
            const expired = new Date(session.expiresAt).getTime() < Date.now();
            const pending = actionPendingFor === session.orderId;
            const action = session.usedAt
              ? undefined
              : {
                  id: `extend-${session.id}`,
                  label: pending ? 'جارٍ التمديد...' : 'تمديد ساعتين',
                  onAction: () => void handleExtend(session.orderId, session.version),
                };
            return (
              <WebControlPanelDecisionRow
                key={session.id}
                entityId={session.id}
                entityLabel={`طلب: ${session.orderId} — عميل: ${session.clientId}`}
                status={session.usedAt ? 'verified' : expired ? 'expired' : 'active'}
                statusTone={session.usedAt ? 'success' : expired ? 'danger' : 'warning'}
                reason={`المحاولات: ${session.attemptCount}/${session.maxAttempts}`}
                sla={`ينتهي: ${new Date(session.expiresAt).toLocaleString('ar-SA')}`}
                {...(action ? { primaryAction: action } : {})}
              />
            );
          })'''
new_block = '''          listState.data.map((session) => {
            const cancelled = session.status === 'cancelled' || Boolean(session.cancelledAt);
            const consumed = Boolean(session.usedAt);
            const expired = !cancelled && !consumed && new Date(session.expiresAt).getTime() < Date.now();
            const pending = actionPendingFor === session.orderId;
            const action = session.status === 'active' && !cancelled && !consumed
              ? {
                  id: `extend-${session.id}`,
                  label: pending ? 'جارٍ التمديد...' : 'تمديد ساعتين',
                  onAction: () => void handleExtend(session.orderId, session.version),
                }
              : undefined;
            const status = cancelled
              ? 'cancelled'
              : consumed
                ? session.status
                : expired
                  ? 'expired'
                  : session.status;
            const statusTone = cancelled || expired
              ? 'danger'
              : consumed
                ? 'success'
                : 'warning';
            const reason = cancelled
              ? `سبب الإلغاء: ${session.cancellationReason || 'إلغاء الطلب'}`
              : `المحاولات: ${session.attemptCount}/${session.maxAttempts}`;
            const sla = cancelled && session.cancelledAt
              ? `ألغي: ${new Date(session.cancelledAt).toLocaleString('ar-SA')}`
              : `ينتهي: ${new Date(session.expiresAt).toLocaleString('ar-SA')}`;
            return (
              <WebControlPanelDecisionRow
                key={session.id}
                entityId={session.id}
                entityLabel={`طلب: ${session.orderId} — عميل: ${session.clientId}`}
                status={status}
                statusTone={statusTone}
                reason={reason}
                sla={sla}
                {...(action ? { primaryAction: action } : {})}
              />
            );
          })'''
if old_block not in screen and new_block not in screen:
    raise RuntimeError("pickup workbench cancellation rendering anchor not found")
screen = screen.replace(old_block, new_block, 1)
screen_path.write_text(screen, encoding="utf-8")

Path("tools/scripts/patch-cancellation-pickup-operations-ui.py").unlink(missing_ok=True)
print("Pickup operations now polls live state, renders cancellation truth, and disables invalid extension actions.")
