from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"anchor not found: {label}")
    return text.replace(old, new, 1)


# Backend: the actor-scoped partner workboard is the authority for executable actions.
path = "services/dsh/backend/internal/http/partner_order_workboard.go"
text = read(path)
text = replace_once(
    text,
    '\tUpdatedAt        time.Time                   `json:"updatedAt"`\n}',
    '\tAllowedActions   []string                    `json:"allowedActions"`\n\tUpdatedAt        time.Time                   `json:"updatedAt"`\n}',
    "partner workboard allowed actions field",
)
helper = '''func partnerOrderAllowedActions(status, fulfillmentMode string) []string {
\tswitch strings.TrimSpace(status) {
\tcase "pending":
\t\treturn []string{"accept", "reject"}
\tcase "store_accepted":
\t\treturn []string{"prepare"}
\tcase "preparing":
\t\treturn []string{"ready"}
\tcase "ready_for_pickup":
\t\tif fulfillmentMode == "partner_delivery" || fulfillmentMode == "pickup" {
\t\t\treturn []string{"handoff"}
\t\t}
\t}
\treturn []string{}
}

'''
anchor = "// GET /dsh/partner/order-workboard?status=...\n"
if helper not in text:
    if anchor not in text:
        raise RuntimeError("partner workboard handler anchor not found")
    text = text.replace(anchor, helper + anchor, 1)
text = replace_once(
    text,
    '''\t\tif order.Items == nil {
\t\t\torder.Items = []partnerOrderWorkboardItem{}
\t\t}
\t\torders = append(orders, order)''',
    '''\t\tif order.Items == nil {
\t\t\torder.Items = []partnerOrderWorkboardItem{}
\t\t}
\t\torder.AllowedActions = partnerOrderAllowedActions(order.Status, order.FulfillmentMode)
\t\torders = append(orders, order)''',
    "partner workboard action projection",
)
write(path, text)

write(
    "services/dsh/backend/internal/http/partner_order_workboard_test.go",
    '''package http

import (
\t"reflect"
\t"testing"
)

func TestPartnerOrderAllowedActions(t *testing.T) {
\ttests := []struct {
\t\tname   string
\t\tstatus string
\t\tmode   string
\t\twant   []string
\t}{
\t\t{name: "pending decision", status: "pending", mode: "bthwani_delivery", want: []string{"accept", "reject"}},
\t\t{name: "accepted preparation", status: "store_accepted", mode: "bthwani_delivery", want: []string{"prepare"}},
\t\t{name: "preparing ready", status: "preparing", mode: "bthwani_delivery", want: []string{"ready"}},
\t\t{name: "bthwani waits after ready", status: "ready_for_pickup", mode: "bthwani_delivery", want: []string{}},
\t\t{name: "partner delivery handoff", status: "ready_for_pickup", mode: "partner_delivery", want: []string{"handoff"}},
\t\t{name: "pickup handoff", status: "ready_for_pickup", mode: "pickup", want: []string{"handoff"}},
\t\t{name: "terminal read only", status: "delivered", mode: "bthwani_delivery", want: []string{}},
\t}
\tfor _, tt := range tests {
\t\tt.Run(tt.name, func(t *testing.T) {
\t\t\tif got := partnerOrderAllowedActions(tt.status, tt.mode); !reflect.DeepEqual(got, tt.want) {
\t\t\t\tt.Fatalf("partnerOrderAllowedActions(%q,%q)=%v want %v", tt.status, tt.mode, got, tt.want)
\t\t\t}
\t\t})
\t}
}
''',
)

# OpenAPI: partner-only command capability projection.
path = "services/dsh/contracts/dsh.openapi.yaml"
text = read(path)
partner_path = '''  /dsh/partner/order-workboard:
    get:
      operationId: getDshPartnerOrderWorkboard
      summary: Return actor-scoped partner orders with server-authoritative executable actions.
      tags: [DshOrders]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: status
          in: query
          required: false
          schema: { type: string }
      responses:
        "200":
          description: Partner order workboard returned.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshPartnerOrderWorkboardResponse" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }

'''
if "  /dsh/partner/order-workboard:\n" not in text:
    if "\ncomponents:\n" not in text:
        raise RuntimeError("OpenAPI components boundary not found")
    text = text.replace("\ncomponents:\n", "\n" + partner_path + "components:\n", 1)
schemas = '''    DshPartnerOrderAction:
      type: string
      enum: [accept, reject, prepare, ready, handoff]

    DshPartnerOrderWorkboardOrder:
      allOf:
        - $ref: "#/components/schemas/DshOrder"
        - type: object
          required: [allowedActions]
          properties:
            allowedActions:
              type: array
              uniqueItems: true
              items: { $ref: "#/components/schemas/DshPartnerOrderAction" }

    DshPartnerOrderWorkboardResponse:
      type: object
      required: [orders, total]
      properties:
        orders:
          type: array
          items: { $ref: "#/components/schemas/DshPartnerOrderWorkboardOrder" }
        total: { type: integer, minimum: 0 }

'''
if "    DshPartnerOrderAction:\n" not in text:
    if "  schemas:\n" not in text:
        raise RuntimeError("OpenAPI schemas anchor not found")
    text = text.replace("  schemas:\n", "  schemas:\n" + schemas, 1)
write(path, text)

# Shared generated-facing order types.
path = "services/dsh/frontend/shared/orders/orders.types.ts"
text = read(path)
text = replace_once(
    text,
    "export type DshOrderStatus = GeneratedDshOrderStatus;\n",
    '''export type DshOrderStatus = GeneratedDshOrderStatus;
export type DshPartnerOrderAction = components["schemas"]["DshPartnerOrderAction"];
export type DshPartnerOrder = components["schemas"]["DshPartnerOrderWorkboardOrder"];
''',
    "partner order generated types",
)
write(path, text)

path = "services/dsh/frontend/shared/orders/orders.api.ts"
text = read(path)
text = replace_once(
    text,
    'import type { DshOrder, DshCreateOrderInput, DshRejectOrderInput } from "./orders.types";',
    'import type { DshOrder, DshPartnerOrder, DshCreateOrderInput, DshRejectOrderInput } from "./orders.types";',
    "partner order API import",
)
text = text.replace(
    "): Promise<readonly DshOrder[]> {\n  const params = new URLSearchParams();",
    "): Promise<readonly DshPartnerOrder[]> {\n  const params = new URLSearchParams();",
    1,
)
text = text.replace(
    'const data = await request<{ orders: DshOrder[] }>(\n    `/dsh/partner/order-workboard',
    'const data = await request<{ orders: DshPartnerOrder[] }>(\n    `/dsh/partner/order-workboard',
    1,
)
write(path, text)

# Partner adapter must receive the server action set and must never invent one.
path = "services/dsh/frontend/shared/partner/partner.adapters.ts"
text = read(path)
text = replace_once(
    text,
    "import type { DshOrder } from '../orders/orders.types';",
    "import type { DshOrder, DshPartnerOrder, DshPartnerOrderAction } from '../orders/orders.types';",
    "partner adapter order imports",
)
text = replace_once(
    text,
    "  readonly updatedAt?: string;\n  readonly items?: readonly {",
    "  readonly updatedAt?: string;\n  readonly allowedActions?: readonly DshPartnerOrderAction[];\n  readonly items?: readonly {",
    "partner canonical allowed actions",
)
text = text.replace(
    "export function mapDshOrderToPartnerOrderItem(order: DshOrder): PartnerOrderItem {",
    "export function mapDshOrderToPartnerOrderItem(order: DshPartnerOrder): PartnerOrderItem {",
    1,
)
validation_anchor = "  const acceptanceRisk = status === 'needs_accept' && elapsed.minutes >= 10;\n\n  return {"
validation = '''  const acceptanceRisk = status === 'needs_accept' && elapsed.minutes >= 10;
  if (!Array.isArray(raw.allowedActions)) {
    throw new Error(`partner order ${orderId} is missing server allowedActions`);
  }
  const allowedActions = [...raw.allowedActions];

  return {'''
text = replace_once(text, validation_anchor, validation, "partner adapter action validation")
text = replace_once(
    text,
    "    status,\n    priority:",
    "    status,\n    allowedActions,\n    priority:",
    "partner item action projection",
)
write(path, text)

path = "services/dsh/frontend/shared/orders/orders.contract.ts"
text = read(path)
if "import type { DshPartnerOrderAction } from './orders.types';" not in text:
    text = text.replace(
        "import type { DshOrderJourneyStageId, DshOrderLifecycleStatus } from './orders.state-machine';\n",
        "import type { DshOrderJourneyStageId, DshOrderLifecycleStatus } from './orders.state-machine';\nimport type { DshPartnerOrderAction } from './orders.types';\n",
        1,
    )
text = replace_once(
    text,
    "  status: PartnerOrderStatus;\n  priority:",
    "  status: PartnerOrderStatus;\n  allowedActions: readonly DshPartnerOrderAction[];\n  priority:",
    "partner order item actions",
)
write(path, text)

# Canonical command hook: no status-derived permissions.
write(
    "services/dsh/frontend/app-partner/orders/usePartnerOrderCommands.ts",
    '''import React from 'react';
import {
  acceptOrder,
  classifyOrderError,
  markOrderPreparing,
  markOrderReady,
} from '../../shared/orders/orders.api';
import type { DshPartnerOrderAction } from '../../shared/orders/orders.types';

export type PartnerOrderMutationCommand = 'accept' | 'prepare' | 'ready';

export type PartnerOrderCommandState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting'; readonly command: PartnerOrderMutationCommand; readonly orderId: string }
  | { readonly kind: 'success'; readonly command: PartnerOrderMutationCommand; readonly orderId: string }
  | { readonly kind: 'error'; readonly command: PartnerOrderMutationCommand; readonly orderId: string; readonly message: string };

export function resolvePartnerOrderMutation(
  actionId: string,
  allowedActions: readonly DshPartnerOrderAction[],
): PartnerOrderMutationCommand | null {
  if (actionId === 'accept' && allowedActions.includes('accept')) return 'accept';
  if (actionId === 'ready' && allowedActions.includes('ready')) return 'ready';
  if (actionId === 'prepare') {
    if (allowedActions.includes('prepare')) return 'prepare';
    if (allowedActions.includes('ready')) return 'ready';
  }
  return null;
}

function resolveErrorMessage(error: unknown): string {
  const classified = classifyOrderError(error);
  if (classified.kind === 'permission_denied') return 'لا تملك صلاحية تنفيذ هذا الإجراء على الطلب.';
  if (classified.kind === 'offline') return 'تعذر الاتصال. لم يتم تغيير حالة الطلب.';
  if (classified.kind === 'conflict') return classified.message ?? 'تغيرت حالة الطلب. أعد تحميل القائمة.';
  if (classified.kind === 'not_found') return 'الطلب غير موجود أو لم يعد ضمن نطاق المتجر.';
  return classified.message ?? 'تعذر تنفيذ عملية الطلب.';
}

export function usePartnerOrderCommands(refreshOrders: () => void | Promise<void>) {
  const [state, setState] = React.useState<PartnerOrderCommandState>({ kind: 'idle' });

  const execute = React.useCallback(async (
    command: PartnerOrderMutationCommand,
    orderId: string,
  ): Promise<boolean> => {
    if (!orderId) return false;
    setState({ kind: 'submitting', command, orderId });
    try {
      if (command === 'accept') await acceptOrder(orderId);
      else if (command === 'prepare') await markOrderPreparing(orderId);
      else await markOrderReady(orderId);
      await refreshOrders();
      setState({ kind: 'success', command, orderId });
      return true;
    } catch (error) {
      setState({ kind: 'error', command, orderId, message: resolveErrorMessage(error) });
      await refreshOrders();
      return false;
    }
  }, [refreshOrders]);

  const reset = React.useCallback(() => setState({ kind: 'idle' }), []);
  return { state, execute, reset } as const;
}
''',
)

path = "services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx"
text = read(path)
text = text.replace(
    "() => items.filter((item) => item.status === 'new' || item.status === 'needs_accept'),",
    "() => items.filter((item) => item.allowedActions.includes('accept') || item.allowedActions.includes('reject')),",
    1,
)
text = text.replace(
    "if (actionId === 'issue' && (item.status === 'new' || item.status === 'needs_accept')) {",
    "if (actionId === 'issue' && item.allowedActions.includes('reject')) {",
    1,
)
text = text.replace(
    "    if (actionId === 'handoff') {\n      if (item.orderMode === 'partner_delivery' || item.orderMode === 'pickup') {",
    "    if (actionId === 'handoff') {\n      if (!item.allowedActions.includes('handoff')) {\n        onNavigateAction('details', orderId);\n        return;\n      }\n      if (item.orderMode === 'partner_delivery' || item.orderMode === 'pickup') {",
    1,
)
text = text.replace(
    "const mutation = resolvePartnerOrderMutation(actionId, item.status);",
    "const mutation = resolvePartnerOrderMutation(actionId, item.allowedActions);",
    1,
)
text = text.replace('label="قبول وبدء التجهيز"', 'label="قبول الطلب"', 1)
write(path, text)

path = "services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx"
text = read(path)
old = '''function resolveOrderAction(status: PartnerOrderStatus): OrderHubAction {
  if (status === 'new' || status === 'needs_accept') return 'accept';
  if (status === 'preparation_started' || status === 'preparing' || status === 'items_ready') return 'prepare';
  if (status === 'ready') return 'ready';
  if (status === 'handoff' || status === 'captain_assigned' || status === 'captain_arriving') return 'handoff';
  if (status === 'delivering') return 'delivering';
  if (status === 'cancelled') return 'issue';
  return 'details';
}'''
new = '''function resolveOrderAction(item: PartnerOrderItem): OrderHubAction {
  if (item.allowedActions.includes('accept')) return 'accept';
  if (item.allowedActions.includes('prepare') || item.allowedActions.includes('ready')) return 'prepare';
  if (item.allowedActions.includes('handoff')) return 'handoff';
  if (item.status === 'delivering') return 'delivering';
  if (item.status === 'cancelled') return 'issue';
  return 'details';
}'''
text = replace_once(text, old, new, "partner primary action resolver")
text = text.replace("const action = resolveOrderAction(item.status);", "const action = resolveOrderAction(item);", 1)
# Remove the legacy mark-ready-only surface adapter.
text = text.replace("  // ML-020: explicit mark-ready callback — triggered when partner confirms order ready for pickup\n  onMarkReady?: (orderId: string) => void;\n", "", 1)
text = text.replace(
    "export function PartnerOrdersInboxScreen({ state = 'empty', items, searchMode, onCloseSearch, onMarkReady, onOpenNextOrder, onRetry }: PartnerOrdersInboxScreenProps) {",
    "export function PartnerOrdersInboxScreen({ state = 'empty', items, searchMode, onCloseSearch, onOpenNextOrder, onRetry }: PartnerOrdersInboxScreenProps) {",
    1,
)
text = text.replace(
    '''      onOpenOrderAction={(actionId, orderId) => {
        if (actionId === 'ready') {
          onMarkReady?.(orderId);
          return;
        }
        onOpenNextOrder?.(orderId);
      }}''',
    '''      onOpenOrderAction={(_actionId, orderId) => {
        onOpenNextOrder?.(orderId);
      }}''',
    1,
)
write(path, text)

# Decision screen actions are also server gated.
path = "services/dsh/frontend/app-partner/orders/OperationalOrderDecisionScreen.tsx"
text = read(path)
text = replace_once(
    text,
    "  const commands = usePartnerOrderCommands(refreshOrders);\n",
    "  const commands = usePartnerOrderCommands(refreshOrders);\n  const canAccept = Boolean(order?.allowedActions.includes('accept'));\n  const canReject = Boolean(order?.allowedActions.includes('reject'));\n",
    "decision allowed actions",
)
text = replace_once(
    text,
    "      onAccept={() => {\n        void commands.execute('accept', orderId).then((ok) => {",
    "      canAccept={canAccept}\n      canReject={canReject}\n      onAccept={() => {\n        if (!canAccept) return;\n        void commands.execute('accept', orderId).then((ok) => {",
    "decision accept guard",
)
text = text.replace(
    "      onReject={(reasonId, reasonNote) => {\n        void cancellation.submit({",
    "      onReject={(reasonId, reasonNote) => {\n        if (!canReject) return;\n        void cancellation.submit({",
    1,
)
write(path, text)

path = "services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx"
text = read(path)
text = replace_once(
    text,
    "  onAccept: () => void;\n  onReject:",
    "  canAccept?: boolean;\n  canReject?: boolean;\n  onAccept: () => void;\n  onReject:",
    "decision screen capability props",
)
text = replace_once(
    text,
    "  rejectionReasons,\n  onAccept,",
    "  rejectionReasons,\n  canAccept = true,\n  canReject = true,\n  onAccept,",
    "decision screen capability defaults",
)
text = replace_once(
    text,
    '''        <Box gap={3} style={{ marginTop: spacing[4] }}>
          <Button label="قبول الطلب وبدء التحضير" tone="primary" onPress={onAccept} />
          <Button
            label="إلغاء الطلب مع سبب"
            tone="danger"
            onPress={() => setShowRejectionPanel(true)}
          />
        </Box>''',
    '''        <Box gap={3} style={{ marginTop: spacing[4] }}>
          {canAccept ? <Button label="قبول الطلب" tone="primary" onPress={onAccept} /> : null}
          {canReject ? (
            <Button
              label="إلغاء الطلب مع سبب"
              tone="danger"
              onPress={() => setShowRejectionPanel(true)}
            />
          ) : null}
          {!canAccept && !canReject ? (
            <StateView tone="warning" title="لا يوجد قرار متاح" description="تغيرت حالة الطلب. ارجع إلى لوحة الطلبات لقراءة الحالة الحالية." />
          ) : null}
        </Box>''',
    "decision screen gated buttons",
)
write(path, text)

# Remove the obsolete mark-ready-only runtime chain.
write(
    "services/dsh/frontend/app-partner/orders/usePartnerOrdersRuntime.ts",
    '''import React from 'react';
import {
  classifyOrderError,
  fetchPartnerOrders,
} from '../../shared/orders/orders.api';
import { mapDshOrderToPartnerOrderItem } from '../../shared/partner/partner.adapters';
import type { PartnerOrderItem } from '../../shared/orders/orders.contract';

type PartnerOrdersState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled' | 'partial';

/** Actor-scoped partner workboard. Mutations live in usePartnerOrderCommands. */
export function usePartnerOrdersRuntime(route: string) {
  const [orders, setOrders] = React.useState<readonly PartnerOrderItem[]>([]);
  const [state, setState] = React.useState<PartnerOrdersState>(route === 'inbox' ? 'loading' : 'disabled');

  const fetchOrders = React.useCallback(async () => {
    try {
      const result = await fetchPartnerOrders();
      const nextOrders = result.map(mapDshOrderToPartnerOrderItem);
      setOrders(nextOrders);
      setState(nextOrders.length === 0 ? 'empty' : 'ready');
    } catch (error) {
      const classified = classifyOrderError(error);
      setState(classified.kind === 'offline' ? 'offline' : 'error');
    }
  }, []);

  React.useEffect(() => {
    if (route !== 'inbox') {
      setState('disabled');
      return;
    }
    setState('loading');
    void fetchOrders();
  }, [route, fetchOrders]);

  return { orders, state, refresh: fetchOrders } as const;
}
''',
)

path = "services/dsh/frontend/app-partner/orders/usePartnerOrdersModel.ts"
text = read(path)
text = text.replace(
    "  const { orders: partnerOrders, state: partnerOrdersState, markReady: handleMarkReady, refresh } = usePartnerOrdersRuntime(route) as {",
    "  const { orders: partnerOrders, state: partnerOrdersState, refresh } = usePartnerOrdersRuntime(route) as {",
    1,
)
text = text.replace("    markReady: (orderId: string) => void;\n", "", 1)
text = text.replace("    handleMarkReady,\n", "", 1)
write(path, text)

path = "services/dsh/frontend/app-partner/useDshPartnerSurfaceModel.ts"
text = read(path)
text = text.replace("  handleMarkReady: (orderId: string) => void;\n", "", 1)
text = text.replace("    handleMarkReady: orders.handleMarkReady,\n", "", 1)
write(path, text)

path = "services/dsh/frontend/app-partner/DshPartnerSurface.tsx"
text = read(path)
text = text.replace("  const handleMarkReady = actions.handleMarkReady;\n", "", 1)
text = text.replace("      handleMarkReady={handleMarkReady}\n", "", 1)
write(path, text)

path = "services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx"
text = read(path)
text = text.replace("  handleMarkReady: (orderId: string) => void;\n", "", 1)
text = text.replace("    handleMarkReady,\n", "", 1)
text = text.replace("        onMarkReady={handleMarkReady}\n", "", 1)
write(path, text)

# Delete private dead controllers that violate actor-scoped partner API semantics.
write(
    "services/dsh/frontend/shared/orders/use-orders-controller.ts",
    '''import { useCallback, useEffect, useState } from "react";
import {
  classifyOrderError,
  createOrder,
  fetchClientOrder,
  fetchClientOrders,
} from "./orders.api";
import type {
  DshCreateOrderInput,
  DshOrder,
  DshOrderActionState,
  DshOrderDetailState,
  DshOrdersListState,
} from "./orders.types";
import {
  beginOrderAction,
  beginOrdersLoad,
  resolveCreateOrderError,
  resolveCreateOrderSuccess,
  resolveOrdersLoadError,
  resolveOrdersLoadSuccess,
} from "./orders.controller-core";
import { orderActionIdleState, ordersIdleState } from "./orders.states";

export function useClientOrdersController() {
  const [state, setState] = useState<DshOrdersListState>(ordersIdleState());
  const load = useCallback(async () => {
    setState(beginOrdersLoad());
    try {
      setState(resolveOrdersLoadSuccess(await fetchClientOrders()));
    } catch (error) {
      setState(resolveOrdersLoadError(classifyOrderError(error), "client"));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { state, reload: load };
}

export function useCreateOrderController() {
  const [state, setState] = useState<DshOrderActionState>(orderActionIdleState());
  const submit = useCallback(async (input: DshCreateOrderInput) => {
    setState(beginOrderAction());
    try {
      setState(resolveCreateOrderSuccess(await createOrder(input)));
    } catch (error) {
      setState(resolveCreateOrderError(classifyOrderError(error)));
    }
  }, []);
  const reset = useCallback(() => setState(orderActionIdleState()), []);
  return { state, submit, reset };
}

export type { DshOrder, DshOrdersListState, DshOrderActionState };

export function useClientOrderDetailController(orderId: string) {
  const [state, setState] = useState<DshOrderDetailState>({ kind: "loading" });
  const load = useCallback(async () => {
    try {
      setState({ kind: "success", order: await fetchClientOrder(orderId) });
    } catch {
      setState({ kind: "error", message: "تعذر تحميل تفاصيل الطلب." });
    }
  }, [orderId]);
  useEffect(() => {
    void load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);
  return { state, reload: load };
}
''',
)

print("Applied order preparation slice one: server-authoritative partner actions and cleaned stale local inference.")
