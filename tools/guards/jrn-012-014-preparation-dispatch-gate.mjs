import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function source(path) {
  return readFileSync(path, 'utf8');
}

const lifecycle = source('services/dsh/backend/internal/orders/lifecycle.go');
const preparation = source('services/dsh/backend/internal/orders/preparation.go');
const handoff = source('services/dsh/backend/internal/dispatch/store_captain_handoff.go');
const dispatch = source('services/dsh/backend/internal/dispatch/dispatch.go');
const routes = source('services/dsh/backend/internal/http/server.go');
const partnerApi = source('services/dsh/frontend/shared/orders/orders.api.ts');
const partnerCommands = source('services/dsh/frontend/shared/orders/use-partner-order-commands.ts');
const dispatchSurface = source('services/dsh/frontend/control-panel/operations/OrderJourneyDispatchAssignmentScreen.tsx');
const captainOptions = source('services/dsh/frontend/shared/operations/use-dispatch-captain-options.ts');
const partnerStoreSurface = source('services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx');

// JRN-012: public compatibility entry points must execute the authoritative
// timing implementation instead of the former generic lifecycle transition.
assert.match(lifecycle, /func AcceptOrder[\s\S]*return AcceptOrderWithPreparation\(db, orderID, actorID\)/);
assert.match(lifecycle, /func MarkPreparing[\s\S]*return MarkPreparingWithTiming\(db, orderID, actorID\)/);
assert.match(lifecycle, /func MarkReadyForPickup[\s\S]*return MarkReadyWithTiming\(db, orderID, actorID\)/);
assert.match(preparation, /accepted_at=NOW\(\)[\s\S]*estimated_ready_at=NOW\(\)\+make_interval/);
assert.match(preparation, /preparation_started_at=COALESCE\(preparation_started_at,NOW\(\)\)/);
assert.match(preparation, /ready_at=COALESCE\(ready_at,NOW\(\)\)/);

// JRN-013: captain pickup remains impossible before both store and captain
// custody confirmations are recorded in the same transaction.
assert.match(handoff, /next == DeliveryPickedUp[\s\S]*requireStoreCaptainHandoffConfirmed/);
assert.match(handoff, /next == DeliveryPickedUp[\s\S]*completeStoreCaptainHandoff/);
assert.match(routes, /POST \/dsh\/captain\/dispatch\/assignments\/\{assignmentId\}\/status", protected\.handleGovernedUpdateDeliveryStatus/);
assert.doesNotMatch(routes, /POST \/dsh\/captain\/dispatch\/assignments\/\{assignmentId\}\/status", protected\.handleUpdateDeliveryStatus/);

// JRN-014: operator assignment starts only from ready_for_pickup and creates
// assignment + delivery atomically. Workforce options are loaded through a
// dedicated shared controller, never by a surface API call or broad barrel.
assert.match(routes, /POST \/dsh\/operator\/dispatch\/assignments", protected\.handleCreateDispatchAssignment/);
assert.match(dispatch, /TransitionDispatchOrder[\s\S]*StatusReadyForPickup[\s\S]*StatusDriverAssigned/);
assert.match(dispatch, /INSERT INTO dsh_assignments[\s\S]*INSERT INTO dsh_deliveries[\s\S]*tx\.Commit/);
assert.match(partnerApi, /\/dsh\/partner\/order-workboard/);
assert.match(partnerCommands, /confirmStoreCaptainHandoff/);
assert.match(partnerCommands, /await refreshOrders\(\)/);
assert.match(dispatchSurface, /useDispatchCaptainOptions/);
assert.doesNotMatch(dispatchSurface, /workforce\.api/);
assert.doesNotMatch(dispatchSurface, /from ['"]\.\.\/\.\.\/shared\/workforce['"]/);
assert.match(captainOptions, /listCaptains\(\{ status: 'active', limit: 200 \}\)/);
assert.match(captainOptions, /workforceErrorMessage\(error\)/);
assert.match(captainOptions, /useEffect\(\(\) => \{[\s\S]*void reload\(\);[\s\S]*\}, \[reload\]\)/);
assert.match(captainOptions, /from '\.\.\/workforce\/workforce\.api'/);

// Cross-journey dependency repair: the repository-wide sovereign boundary is
// required by this closure gate. Partner surfaces must consume the public
// shared boundary rather than reaching into its API adapter implementation.
assert.match(partnerStoreSurface, /from '\.\.\/\.\.\/shared\/partner'/);
assert.doesNotMatch(partnerStoreSurface, /shared\/partner\/partner\.api/);

console.log('[jrn-012-014-preparation-dispatch] PASS');
