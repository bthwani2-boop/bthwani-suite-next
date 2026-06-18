# Visual Pattern Mining

No screen code, routes, runtime providers or business data were migrated. The donor screens are evidence only.

| source screen path | visible pattern | repeated? | target owner | suggested component/token/layout | reason | evidence | not copied reason |
|---|---|---|---|---|---|---|---|
| dsh/frontend/app-client/parts/home/HomeScreenShell.tsx | Header, horizontal filters, promo region, sectioned feed and explicit non-ready state | yes | shared/ui-kit + services/dsh/frontend/shared | Header, FilterBar, StateView; DSH Home shell remains service-owned | Generic hierarchy repeats across discovery screens | Header/filter/state composition and spacing usage | Screen owns DSH categories, handlers, promos and store records |
| dsh/frontend/app-client/parts/store/StoreScreenShell.tsx | Hero region, sticky category filters, list body and bottom interaction sheets | yes | services/dsh/frontend/shared + shared/app-shell | FilterBar and Sheet primitives; Store shell remains DSH-owned | Primitive interaction patterns are generic but data and gestures are not | Animated list, measurement picker and non-ready branches | React Native gestures, vibration, dimensions and store contracts |
| dsh/frontend/app-client/screens/CartScreen.tsx | Summary sections, selectable execution options and persistent primary action | yes | shared/ui-kit + services/dsh/frontend/shared | Surface, ListItem, ActionBar | Action hierarchy generalizes across transactional screens | Repeated section/action grouping | Cart prices, delivery modes and checkout logic are domain-owned |
| dsh/frontend/app-partner/screens/OrdersInboxScreen.tsx | Stage tabs, quick filters, urgency badges and dense operational rows | yes | shared/ui-kit + services/dsh/frontend/shared | Tabs, FilterBar, Badge, ListItem | Visual grammar applies to many operational queues | Explicit filter arrays and row states | SLA, order status, delivery mode and demo records are DSH contracts |
| dsh/frontend/app-captain/screens/DshCaptainOperationsScreen.tsx | Flat rows separated by borders with title, subtitle, metadata and trailing badge | yes | shared/ui-kit | ListItem | Generic, compact and RTL-safe queue row | Repeated FlatRow implementation | Captain actions and support-flow mapping are business logic |
| dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx | Toolbar filters above a dense table with selectable rows and state badges | yes | shared/ui-kit + services/dsh/frontend/shared | Toolbar, FilterBar, DataTable, Badge | Generic control-panel shell is reusable | Web table/filter composition | Columns, commands and live order model remain service-owned |
| dsh/frontend/control-panel/dashboard/ControlPanelDshClosureDashboardScreen.tsx | Page header, KPI surfaces and grouped dashboard sections | yes | shared/ui-kit + services/dsh/frontend/shared | Screen, Header, Surface, Toolbar | Reusable page rhythm without metric semantics | Repeated dashboard grouping | DSH closure metrics and actions are not generic |
| ui-kit/src/components/payment-decision.tsx and WLT-facing usages | Status surface with explanation and next action | yes | services/wlt/frontend/shared | StateView and ActionBar as primitives | State/action grammar is generic | Payment decision visual hierarchy | Payment outcomes, settlement and retry policies are WLT-owned |

## Verification status

- Structural extraction: verified by source inspection and new package typecheck.
- Visual parity: `BLOCKED_NEEDS_EVIDENCE`.
- Reason: no migrated runtime screen or screenshot comparison exists in FOUNDATION-008F, by design.
