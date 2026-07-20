from __future__ import annotations

import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def run_existing_governed_patch() -> None:
    script = ROOT / "tools/scripts/patch-cancellation-journey-final.py"
    if script.exists():
        namespace = runpy.run_path(str(script))
        namespace["main"]()


def patch_pickup_operational_guards() -> None:
    path = "services/dsh/backend/internal/pickup/service.go"
    text = read(path)

    for function_name, end_marker in [
        ("func (s *Service) NotifyCustomer", "// IssueOtp"),
        ("func (s *Service) CustomerArrived", "// VerifyOtp"),
    ]:
        start = text.index(function_name)
        end = text.index(end_marker, start)
        block = text[start:end]
        if 'lockPickupOrder(tx, orderID, orders.StatusReadyForPickup)' not in block:
            block = block.replace(
                'lockPickupOrder(tx, orderID, "")',
                'lockPickupOrder(tx, orderID, orders.StatusReadyForPickup)',
                1,
            )
            text = text[:start] + block + text[end:]

    write(path, text)


def patch_captain_surface() -> None:
    path = "services/dsh/frontend/shared/dispatch/dispatch.types.ts"
    text = read(path)
    text = text.replace('  cancelled: "ملغاة",', '  cancelled: "ألغيت المهمة بسبب إلغاء الطلب",')
    write(path, text)

    path = "services/dsh/frontend/shared/dispatch/dispatch.states.ts"
    text = read(path)
    if "trackingCancelledState" not in text:
        anchor = '''export function trackingDeliveredState(assignment: DshDispatchAssignment): DshTrackingState {\n  return { kind: "delivered", assignment };\n}\n'''
        replacement = anchor + '''\nexport function trackingCancelledState(assignment: DshDispatchAssignment): DshTrackingState {\n  return { kind: "cancelled", assignment };\n}\n'''
        if anchor not in text:
            raise RuntimeError("tracking delivered state anchor not found")
        text = text.replace(anchor, replacement, 1)
    write(path, text)

    path = "services/dsh/frontend/shared/dispatch/dispatch.controller-core.ts"
    text = read(path)
    if "trackingCancelledState," not in text:
        text = text.replace("  trackingActiveState,\n", "  trackingActiveState,\n  trackingCancelledState,\n", 1)
    old = '''export function resolveTrackingSuccess(assignment: DshDispatchAssignment): DshTrackingState {\n  return assignment.delivery.status === "delivered"\n    ? trackingDeliveredState(assignment)\n    : trackingActiveState(assignment);\n}'''
    new = '''export function resolveTrackingSuccess(assignment: DshDispatchAssignment): DshTrackingState {\n  if (assignment.status === "cancelled" || assignment.delivery.status === "cancelled") {\n    return trackingCancelledState(assignment);\n  }\n  return assignment.delivery.status === "delivered"\n    ? trackingDeliveredState(assignment)\n    : trackingActiveState(assignment);\n}'''
    if old in text:
        text = text.replace(old, new, 1)
    text = text.replace(
        'if (error.kind === "conflict") return { kind: "error" as const, message: "الحالة الحالية لا تسمح بهذا الانتقال." };',
        'if (error.kind === "conflict") return { kind: "error" as const, message: "ألغيت المهمة أو تغيرت حالتها؛ أغلقت الإجراءات غير الصالحة." };',
    )
    write(path, text)

    path = "services/dsh/frontend/shared/delivery/captain-inbox.model.ts"
    text = read(path)
    if "export function isCaptainAssignmentActive" not in text:
        anchor = "export type CaptainInboxFetchState = Extract<DshCaptainOrdersScreenState, 'ready' | 'loading' | 'empty' | 'error'>;\n"
        addition = anchor + "\nexport function isCaptainAssignmentActive(assignment: DshDispatchAssignment): boolean {\n  return (assignment.status === 'offered' || assignment.status === 'accepted') && assignment.delivery.status !== 'cancelled';\n}\n"
        if anchor not in text:
            raise RuntimeError("captain inbox type anchor not found")
        text = text.replace(anchor, addition, 1)
    text = text.replace(
        "      const data = await fetchCaptainDispatchAssignments();",
        "      const data = (await fetchCaptainDispatchAssignments()).filter(isCaptainAssignmentActive);",
        1,
    )
    old_effect = '''  React.useEffect(() => {\n    refresh();\n  }, [refresh]);'''
    new_effect = '''  React.useEffect(() => {\n    refresh();\n    const interval = setInterval(refresh, 10_000);\n    return () => clearInterval(interval);\n  }, [refresh]);'''
    if old_effect in text:
        text = text.replace(old_effect, new_effect, 1)
    write(path, text)

    path = "services/dsh/frontend/shared/delivery/captain.surface-model.ts"
    text = read(path)
    if "orderModel.setActiveAssignmentId('');" not in text:
        anchor = '''  React.useEffect(() => {\n    lifecycle.setInboxState(inboxModel.fetchState);\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [inboxModel.fetchState]);\n'''
        addition = anchor + '''\n  React.useEffect(() => {\n    if (!orderModel.activeAssignmentId || inboxModel.fetchState === 'loading' || activeAssignment) return;\n    orderModel.setActiveAssignmentId('');\n    orderModel.setActiveOrderId('');\n    orderModel.setActiveOrderExpanded(false);\n    lifecycle.setIsPickupSheetVisible(false);\n    lifecycle.setIsDeliverySheetVisible(false);\n    navModel.goToInbox();\n  }, [activeAssignment, inboxModel.fetchState, lifecycle, navModel, orderModel]);\n'''
        if anchor not in text:
            raise RuntimeError("captain surface inbox anchor not found")
        text = text.replace(anchor, addition, 1)
    write(path, text)


def patch_stale_action_refresh() -> None:
    path = "services/dsh/frontend/shared/dispatch/use-dispatch-controller.ts"
    text = read(path)
    for action in ("accept", "decline", "status", "pod"):
        old = f'''    }} catch (error) {{\n      setActionState(resolveDispatchActionError(classifyDispatchError(error), "{action}"));\n    }}'''
        new = f'''    }} catch (error) {{\n      const classified = classifyDispatchError(error);\n      setActionState(resolveDispatchActionError(classified, "{action}"));\n      if (classified.kind === "conflict" || classified.kind === "not_found") await load();\n    }}'''
        if old in text:
            text = text.replace(old, new, 1)
    write(path, text)


def cleanup_temporary_files() -> None:
    for path in [
        ".github/workflows/cancellation-journey-contract.yml",
        ".github/workflows/cancellation-journey-format.yml",
        ".github/workflows/cancellation-journey-recheck.yml",
        ".github/workflows/cancellation-journey-source.yml",
        ".github/workflows/cancellation-journey-final-patch.yml",
        ".github/workflows/cancellation-journey-final-closure.yml",
        ".github/cancellation-journey-contract-trigger",
        ".github/cancellation-journey-format-trigger",
        ".github/cancellation-journey-recheck-trigger",
        ".github/cancellation-journey-source-trigger",
        ".github/cancellation-journey-final-patch-trigger",
        ".github/cancellation-journey-final-trigger",
        "tools/scripts/patch-cancellation-journey-final.py",
        "tools/scripts/close-cancellation-refund-reconciliation.py",
    ]:
        (ROOT / path).unlink(missing_ok=True)


def main() -> None:
    run_existing_governed_patch()
    patch_pickup_operational_guards()
    patch_captain_surface()
    patch_stale_action_refresh()
    cleanup_temporary_files()
    print("Focused cancellation journey closure patch applied without replacing the explicit pickup state model.")


if __name__ == "__main__":
    main()
