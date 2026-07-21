from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str, *, allow_new: bool = True) -> None:
    text = read(relative)
    if old in text:
        write(relative, text.replace(old, new, 1))
        return
    if allow_new and new in text:
        return
    raise RuntimeError(f"missing anchor in {relative}: {old[:140]!r}")


def close_order_runtime() -> None:
    relative = "services/dsh/frontend/app-partner/orders/usePartnerOrdersRuntime.ts"
    write(
        relative,
        '''import React from 'react';
import {
  createDshOrderLifecycleHttpClient,
  resolveDshOrderApiBaseUrl,
  type DshUpdateOrderStatusRequest,
} from '../../shared/orders/dsh-order-lifecycle-client';
import { fetchDshRuntimeOrders } from '../../shared/operations/dsh-operational-runtime-adapter';
import { mapRuntimeRowToPartnerOrderItem } from '../../shared/partner/partner.adapters';
import { usePlatformVars } from '../../shared/platform/PlatformVarsProvider';

type PartnerOrderItemLike = ReturnType<typeof mapRuntimeRowToPartnerOrderItem>;
type PartnerOrdersState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';

export type PartnerOrderMutationAction = 'accept' | 'prepare' | 'ready';
export type PartnerOrderMutationResult =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly message: string };

const transitionStatusByAction: Record<PartnerOrderMutationAction, DshUpdateOrderStatusRequest['status']> = {
  accept: 'store_accepted',
  prepare: 'preparing',
  ready: 'ready_for_pickup',
};

function mutationErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') return error.message;
    if ('body' in error && typeof error.body === 'string' && error.body.trim()) return error.body;
  }
  return 'رفض DSH انتقال حالة الطلب. تم تحديث القائمة من الخادم دون نجاح محلي.';
}

export function usePartnerOrdersRuntime(route: string) {
  const { dshClientId } = usePlatformVars();
  const [orders, setOrders] = React.useState<readonly PartnerOrderItemLike[]>([]);
  const [state, setState] = React.useState<PartnerOrdersState>(dshClientId ? 'loading' : 'disabled');

  const orderLifecycleClient = React.useMemo(
    () => (dshClientId
      ? createDshOrderLifecycleHttpClient(resolveDshOrderApiBaseUrl(), undefined, {
          clientId: dshClientId,
          scope: 'partner',
        })
      : null),
    [dshClientId],
  );

  const fetchOrders = React.useCallback(async (): Promise<void> => {
    if (!dshClientId) {
      setOrders([]);
      setState('disabled');
      return;
    }
    try {
      const result = await fetchDshRuntimeOrders({ limit: 100, scope: 'partner' }, dshClientId, 'partner');
      if (result.kind === 'ok') {
        const nextOrders = result.orders.map(mapRuntimeRowToPartnerOrderItem);
        setOrders(nextOrders);
        setState(nextOrders.length === 0 ? 'empty' : 'ready');
      } else if (result.kind === 'offline') {
        setState('offline');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }, [dshClientId]);

  React.useEffect(() => {
    if (route !== 'inbox') return;
    setState(dshClientId ? 'loading' : 'disabled');
    void fetchOrders();
  }, [route, dshClientId, fetchOrders]);

  const transitionOrder = React.useCallback(
    async (orderId: string, action: PartnerOrderMutationAction): Promise<PartnerOrderMutationResult> => {
      if (!orderLifecycleClient || !orderId.trim()) {
        return { ok: false, message: 'لا توجد جلسة شريك أو رقم طلب صالح لتنفيذ العملية.' };
      }
      try {
        await orderLifecycleClient.updateOrderStatus(orderId, {
          actor: 'partner',
          status: transitionStatusByAction[action],
        });
        // Mandatory read-after-write: UI truth is rebuilt only from DSH.
        await fetchOrders();
        return { ok: true, message: 'تم تنفيذ انتقال الطلب وتأكيده من DSH.' };
      } catch (error) {
        await fetchOrders();
        return { ok: false, message: mutationErrorMessage(error) };
      }
    },
    [orderLifecycleClient, fetchOrders],
  );

  const markReady = React.useCallback(
    (orderId: string) => transitionOrder(orderId, 'ready'),
    [transitionOrder],
  );

  return {
    orders,
    state,
    transitionOrder,
    markReady,
    refresh: fetchOrders,
  } as const;
}
''',
    )


def close_orders_model() -> None:
    relative = "services/dsh/frontend/app-partner/orders/usePartnerOrdersModel.ts"
    text = read(relative)
    text = text.replace(
        "import { usePartnerOrdersRuntime } from './usePartnerOrdersRuntime';",
        "import {\n  usePartnerOrdersRuntime,\n  type PartnerOrderMutationAction,\n  type PartnerOrderMutationResult,\n} from './usePartnerOrdersRuntime';",
        1,
    )
    old = '''  const { orders: partnerOrders, state: partnerOrdersState, markReady: handleMarkReady, refresh } = usePartnerOrdersRuntime(route) as {
    orders: readonly PartnerOrderItem[];
    state: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';
    markReady: (orderId: string) => void;
    refresh: () => void;
  };'''
    new = '''  const {
    orders: partnerOrders,
    state: partnerOrdersState,
    transitionOrder: handleOrderTransition,
    markReady: handleMarkReady,
    refresh,
  } = usePartnerOrdersRuntime(route) as {
    orders: readonly PartnerOrderItem[];
    state: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';
    transitionOrder: (orderId: string, action: PartnerOrderMutationAction) => Promise<PartnerOrderMutationResult>;
    markReady: (orderId: string) => Promise<PartnerOrderMutationResult>;
    refresh: () => Promise<void>;
  };'''
    if old in text:
        text = text.replace(old, new, 1)
    elif "transitionOrder: handleOrderTransition" not in text:
        raise RuntimeError("partner orders model runtime anchor missing")
    text = text.replace(
        "    handleMarkReady,\n    refresh,",
        "    handleOrderTransition,\n    handleMarkReady,\n    refresh,",
        1,
    )
    write(relative, text)


def close_surface_model() -> None:
    relative = "services/dsh/frontend/app-partner/useDshPartnerSurfaceModel.ts"
    text = read(relative)
    order_import = "import type { PartnerOrderItem } from '../shared/orders';\n"
    replacement = order_import + "import type { PartnerOrderMutationAction, PartnerOrderMutationResult } from './orders/usePartnerOrdersRuntime';\n"
    if "PartnerOrderMutationAction" not in text:
        if order_import not in text:
            raise RuntimeError("surface model order import anchor missing")
        text = text.replace(order_import, replacement, 1)
    text = text.replace(
        "  handleMarkReady: (orderId: string) => void;\n",
        "  handleOrderTransition: (orderId: string, action: PartnerOrderMutationAction) => Promise<PartnerOrderMutationResult>;\n"
        "  handleMarkReady: (orderId: string) => Promise<PartnerOrderMutationResult>;\n",
        1,
    )
    text = text.replace(
        "    handleMarkReady: orders.handleMarkReady,\n",
        "    handleOrderTransition: orders.handleOrderTransition,\n    handleMarkReady: orders.handleMarkReady,\n",
        1,
    )
    write(relative, text)


def close_surface_composition() -> None:
    relative = "services/dsh/frontend/app-partner/DshPartnerSurface.tsx"
    text = read(relative)
    text = text.replace(
        "  const handleMarkReady = actions.handleMarkReady;\n",
        "  const handleOrderTransition = actions.handleOrderTransition;\n  const handleMarkReady = actions.handleMarkReady;\n",
        1,
    )
    text = text.replace(
        "      handleMarkReady={handleMarkReady}\n",
        "      handleOrderTransition={handleOrderTransition}\n      handleMarkReady={handleMarkReady}\n",
        1,
    )
    write(relative, text)


def close_orders_screen() -> None:
    relative = "services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx"
    text = read(relative)
    text = text.replace("type OrderHubAction =", "export type OrderHubAction =", 1)
    result_type = '''
export type PartnerOrderActionExecutionResult =
  | { readonly ok: true; readonly message?: string }
  | { readonly ok: false; readonly message: string };
'''
    if "export type PartnerOrderActionExecutionResult" not in text:
        marker = "export type OrderStageFilterId ="
        idx = text.find(marker)
        if idx < 0:
            raise RuntimeError("order action result insertion anchor missing")
        text = text[:idx] + result_type + "\n" + text[idx:]
    text = text.replace(
        "  onOpenOrderAction?: (actionId: OrderHubAction, orderId: string) => void;",
        "  onOpenOrderAction?: (actionId: OrderHubAction, orderId: string) => Promise<PartnerOrderActionExecutionResult> | PartnerOrderActionExecutionResult;",
        1,
    )
    state_anchor = "  const [activeActionOrderId, setActiveActionOrderId] = React.useState<string | null>(null);\n"
    state_block = state_anchor + "  const [actionExecution, setActionExecution] = React.useState<\n    | { readonly kind: 'idle' }\n    | { readonly kind: 'running'; readonly orderId: string }\n    | { readonly kind: 'success'; readonly message: string }\n    | { readonly kind: 'error'; readonly message: string }\n  >({ kind: 'idle' });\n"
    if "const [actionExecution" not in text:
        if state_anchor not in text:
            raise RuntimeError("order action execution state anchor missing")
        text = text.replace(state_anchor, state_block, 1)

    old_open = '''  function openPrimaryAction(item: PartnerOrderItem) {
    setSelectedOrderId(item.id);
    const action = resolveOrderAction(item.status);
    if (action === 'accept') {
      setAcceptingOrderId(item.id);
      setAcceptSheetVisible(true);
      return;
    }
    onOpenOrderAction?.(action, item.id);
  }
'''
    new_open = '''  async function executeOrderAction(action: OrderHubAction, orderId: string): Promise<void> {
    if (!onOpenOrderAction) {
      setActionExecution({ kind: 'error', message: 'هذا الإجراء غير مربوط بمحرك الطلبات.' });
      return;
    }
    setActionExecution({ kind: 'running', orderId });
    try {
      const result = await onOpenOrderAction(action, orderId);
      if (!result.ok) {
        setActionExecution({ kind: 'error', message: result.message });
        return;
      }
      setActionExecution({
        kind: 'success',
        message: result.message ?? 'تم تنفيذ الإجراء وتأكيد حالة الطلب من DSH.',
      });
    } catch (error) {
      setActionExecution({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر تنفيذ إجراء الطلب.',
      });
    }
  }

  function openPrimaryAction(item: PartnerOrderItem) {
    setSelectedOrderId(item.id);
    const action = resolveOrderAction(item.status);
    if (action === 'details') {
      setExpandedOrderId(item.id);
      setActiveActionOrderId(null);
      return;
    }
    if (action === 'accept') {
      setAcceptingOrderId(item.id);
      setAcceptSheetVisible(true);
      return;
    }
    void executeOrderAction(action, item.id);
  }
'''
    if old_open in text:
        text = text.replace(old_open, new_open, 1)
    elif "async function executeOrderAction" not in text:
        raise RuntimeError("openPrimaryAction anchor missing")

    text = text.replace("onIssueAction={() => onOpenOrderAction?.('issue', focusOrder.id)}", "onIssueAction={() => void executeOrderAction('issue', focusOrder.id)}")
    text = text.replace("onIssueAction={() => onOpenOrderAction?.('issue', item.id)}", "onIssueAction={() => void executeOrderAction('issue', item.id)}")
    text = text.replace("if (acceptingOrderId) onOpenOrderAction?.('accept', acceptingOrderId);", "if (acceptingOrderId) void executeOrderAction('accept', acceptingOrderId);")

    feedback_anchor = "        <Divider />\n\n        {/* ─── Focus Order Zone"
    feedback = '''        <Divider />

        {actionExecution.kind === 'running' ? (
          <StateView loading title="جاري تنفيذ إجراء الطلب في DSH…" />
        ) : actionExecution.kind === 'error' ? (
          <StateView tone="danger" title="فشل إجراء الطلب" description={actionExecution.message} />
        ) : actionExecution.kind === 'success' ? (
          <StateView tone="success" title="تم تأكيد الإجراء" description={actionExecution.message} />
        ) : null}

        {/* ─── Focus Order Zone'''
    if feedback_anchor in text:
        text = text.replace(feedback_anchor, feedback, 1)
    elif "actionExecution.kind === 'running'" not in text:
        raise RuntimeError("order action feedback insertion anchor missing")

    old_props = '''export type PartnerOrdersInboxScreenProps = {
  state?: PartnerOrdersInboxScreenState;
  items?: readonly PartnerOrdersInboxListItem[];
  searchMode?: boolean | undefined;
  onCloseSearch?: (() => void) | undefined;
  // ML-020: explicit mark-ready callback — triggered when partner confirms order ready for pickup
  onMarkReady?: (orderId: string) => void;
  onOpenNextOrder?: (orderId: string) => void;
  onRetry?: (() => void) | undefined;
};'''
    new_props = '''export type PartnerOrdersInboxScreenProps = {
  state?: PartnerOrdersInboxScreenState;
  items?: readonly PartnerOrdersInboxListItem[];
  searchMode?: boolean | undefined;
  onCloseSearch?: (() => void) | undefined;
  onOpenOrderAction?: (actionId: OrderHubAction, orderId: string) => Promise<PartnerOrderActionExecutionResult> | PartnerOrderActionExecutionResult;
  onRetry?: (() => void) | undefined;
};'''
    if old_props in text:
        text = text.replace(old_props, new_props, 1)
    elif "onOpenOrderAction?: (actionId: OrderHubAction" not in text[text.find("export type PartnerOrdersInboxScreenProps"):]:
        raise RuntimeError("partner inbox props anchor missing")

    old_wrapper = '''export function PartnerOrdersInboxScreen({ state = 'empty', items, searchMode, onCloseSearch, onMarkReady, onOpenNextOrder, onRetry }: PartnerOrdersInboxScreenProps) {
  return (
    <DshPartnerOrdersScreen
      state={state}
      items={items}
      searchMode={searchMode}
      onCloseSearch={onCloseSearch}
      onOpenOrderAction={(actionId, orderId) => {
        if (actionId === 'ready') {
          onMarkReady?.(orderId);
          return;
        }
        onOpenNextOrder?.(orderId);
      }}
      onRetry={onRetry}
    />
  );
}'''
    new_wrapper = '''export function PartnerOrdersInboxScreen({ state = 'empty', items, searchMode, onCloseSearch, onOpenOrderAction, onRetry }: PartnerOrdersInboxScreenProps) {
  return (
    <DshPartnerOrdersScreen
      state={state}
      items={items}
      searchMode={searchMode}
      onCloseSearch={onCloseSearch}
      onOpenOrderAction={onOpenOrderAction}
      onRetry={onRetry}
    />
  );
}'''
    if old_wrapper in text:
        text = text.replace(old_wrapper, new_wrapper, 1)
    elif "onOpenOrderAction={onOpenOrderAction}" not in text:
        raise RuntimeError("partner inbox wrapper anchor missing")
    write(relative, text)


def close_route_renderer() -> None:
    relative = "services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx"
    text = read(relative)
    text = text.replace(
        'import { OrdersInboxScreen } from "./orders/OrdersInboxScreen";',
        'import {\n  OrdersInboxScreen,\n  type OrderHubAction,\n  type PartnerOrderActionExecutionResult,\n} from "./orders/OrdersInboxScreen";',
        1,
    )
    runtime_import = 'import type { PartnerOrderMutationAction, PartnerOrderMutationResult } from "./orders/usePartnerOrdersRuntime";\n'
    if runtime_import not in text:
        anchor = 'import type { PartnerOrderItem } from "../shared/orders/orders.contract";\n'
        if anchor not in text:
            raise RuntimeError("route renderer runtime type import anchor missing")
        text = text.replace(anchor, anchor + runtime_import, 1)
    text = text.replace(
        "  handleMarkReady: (orderId: string) => void;\n",
        "  handleOrderTransition: (orderId: string, action: PartnerOrderMutationAction) => Promise<PartnerOrderMutationResult>;\n"
        "  handleMarkReady: (orderId: string) => Promise<PartnerOrderMutationResult>;\n",
        1,
    )
    text = text.replace(
        "    handleMarkReady,\n",
        "    handleOrderTransition,\n    handleMarkReady,\n",
        1,
    )
    handler_anchor = '''  const activePartnerOrder = React.useMemo(
    () =>
      partnerOrders.find((order) => order.id === activeOrderId) ??
      partnerOrders[0],
    [activeOrderId, partnerOrders],
  );
'''
    handler_block = handler_anchor + '''
  const handleOrderAction = React.useCallback(async (
    action: OrderHubAction,
    orderId: string,
  ): Promise<PartnerOrderActionExecutionResult> => {
    setActiveOrderId(orderId);
    if (action === "accept" || action === "prepare" || action === "ready") {
      return handleOrderTransition(orderId, action);
    }
    if (action === "issue") {
      setRoute("order-rejection");
      return { ok: true, message: "تم فتح قرار الرفض والأسباب المرتبطة بالطلب." };
    }
    if (action === "handoff") {
      openSupportCommandFromOperationalFlow("order-handoff", "orders");
      return { ok: true, message: "تم فتح مسار التسليم المملوك لنمط الطلب." };
    }
    if (action === "delivering") {
      openSupportCommandFromOperationalFlow("order-out-for-delivery", "orders");
      return { ok: true, message: "تم فتح متابعة التوصيل الفعلية للطلب." };
    }
    return { ok: true, message: "تفاصيل الطلب معروضة داخل صندوق الطلبات." };
  }, [handleOrderTransition, openSupportCommandFromOperationalFlow, setActiveOrderId, setRoute]);
'''
    if "const handleOrderAction = React.useCallback" not in text:
        if handler_anchor not in text:
            raise RuntimeError("route renderer order action insertion anchor missing")
        text = text.replace(handler_anchor, handler_block, 1)
    text = text.replace(
        "        onMarkReady={handleMarkReady}\n        onRetry={refreshOrders}",
        "        onOpenOrderAction={handleOrderAction}\n        onRetry={refreshOrders}",
        1,
    )
    write(relative, text)


def close_partner_guard() -> None:
    relative = "tools/guards/partner/partner-surface-truth-gate.mjs"
    text = read(relative)
    route_marker = 'file: "services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx"'
    idx = text.find(route_marker)
    if idx >= 0:
        req_start = text.find("required: [", idx)
        req_end = text.find("],", req_start)
        if req_start >= 0 and req_end >= 0:
            block = text[req_start:req_end + 2]
            for marker in ['"onOpenOrderAction={handleOrderAction}"', '"handleOrderTransition"']:
                if marker not in block:
                    block = block[:-2] + f"      {marker},\n    ],"
            text = text[:req_start] + block + text[req_end + 2:]
    runtime_marker = 'file: "services/dsh/frontend/app-partner/orders/usePartnerOrdersRuntime.ts"'
    idx = text.find(runtime_marker)
    if idx >= 0:
        forbidden_start = text.find("forbidden: [", idx)
        forbidden_end = text.find("],", forbidden_start)
        if forbidden_start >= 0 and forbidden_end >= 0:
            block = text[forbidden_start:forbidden_end + 2]
            marker = '[/Optimistic update/g, "OPTIMISTIC_ORDER_SUCCESS_FORBIDDEN"]'
            if marker not in block:
                block = block[:-2] + f"      {marker},\n    ],"
            text = text[:forbidden_start] + block + text[forbidden_end + 2:]
        req_start = text.find("required: [", idx)
        req_end = text.find("],", req_start)
        if req_start >= 0 and req_end >= 0:
            block = text[req_start:req_end + 2]
            for marker in ['"transitionOrder"', '"Mandatory read-after-write"']:
                if marker not in block:
                    block = block[:-2] + f"      {marker},\n    ],"
            text = text[:req_start] + block + text[req_end + 2:]
    write(relative, text)


def remove_self() -> None:
    path = ROOT / "tools/scripts/apply-partner-order-actions-closure.py"
    if path.exists():
        path.unlink()


close_order_runtime()
close_orders_model()
close_surface_model()
close_surface_composition()
close_orders_screen()
close_route_renderer()
close_partner_guard()
remove_self()
