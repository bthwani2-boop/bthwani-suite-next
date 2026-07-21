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
// assignment + delivery atomically; partner surfaces consume server actions.
assert.match(dispatch, /TransitionDispatchOrder[\s\S]*StatusReadyForPickup[\s\S]*StatusDriverAssigned/);
assert.match(dispatch, /INSERT INTO dsh_assignments[\s\S]*INSERT INTO dsh_deliveries[\s\S]*tx\.Commit/);
assert.match(partnerApi, /\/dsh\/partner\/order-workboard/);
assert.match(partnerCommands, /confirmStoreCaptainHandoff/);
assert.match(partnerCommands, /await refreshOrders\(\)/);

console.log('[jrn-012-014-preparation-dispatch] PASS');
