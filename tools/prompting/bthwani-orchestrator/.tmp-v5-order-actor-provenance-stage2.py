from pathlib import Path
import hashlib
import json
import re


def replace(path, old, new, expected=1):
    p = Path(path)
    text = p.read_text()
    actual = text.count(old)
    if actual != expected:
        raise SystemExit(f"{path}: expected {expected} exact matches, found {actual}: {old!r}")
    p.write_text(text.replace(old, new))


replace(
    "services/dsh/backend/internal/orders/decision.go",
    "INSERT INTO dsh_order_status_events(order_id, actor_role, from_status, to_status, note)\n\t\t\tVALUES($1::uuid, 'partner', $2, $3, $4)`,\n\t\t\tinput.OrderID, string(StatusPending),",
    "INSERT INTO dsh_order_status_events(order_id, actor_id, actor_role, from_status, to_status, note)\n\t\t\tVALUES($1::uuid, $2, 'partner', $3, $4, $5)`,\n\t\t\tinput.OrderID, input.ActorID, string(StatusPending),",
    expected=2,
)

replace(
    "services/dsh/backend/internal/orders/preparation.go",
    "INSERT INTO dsh_order_status_events(order_id, actor_role, from_status, to_status, note)\n\t\tVALUES($1::uuid,'partner',$2,$3,$4)`,\n\t\torderID,\n\t\tstring(StatusPending),",
    "INSERT INTO dsh_order_status_events(order_id, actor_id, actor_role, from_status, to_status, note)\n\t\tVALUES($1::uuid,$2,'partner',$3,$4,$5)`,\n\t\torderID,\n\t\tactorID,\n\t\tstring(StatusPending),",
)

replace(
    "services/dsh/backend/internal/orders/cancellation_saga.go",
    "INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note)\n\t\t\tVALUES($1::uuid,$2,$3,$4,$5)`,\n\t\t\tcaseItem.OrderID, caseItem.ActorRole, caseItem.FromStatus, caseItem.ToStatus, caseItem.ReasonCode,",
    "INSERT INTO dsh_order_status_events(order_id,actor_id,actor_role,from_status,to_status,note)\n\t\t\tVALUES($1::uuid,$2,$3,$4,$5,$6)`,\n\t\t\tcaseItem.OrderID, caseItem.ActorID, caseItem.ActorRole, caseItem.FromStatus, caseItem.ToStatus, caseItem.ReasonCode,",
)

delivery = "services/dsh/backend/internal/dispatch/delivery_exceptions.go"
replace(
    delivery,
    "INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note)\n\t\t\tVALUES($1::uuid,'operator',$2,'driver_assigned',$3)`, current.OrderID, orderStatus, \"delivery exception reassigned to another captain\")",
    "INSERT INTO dsh_order_status_events(order_id,actor_id,actor_role,from_status,to_status,note)\n\t\t\tVALUES($1::uuid,$2,'operator',$3,'driver_assigned',$4)`, current.OrderID, actorID, orderStatus, \"delivery exception reassigned to another captain\")",
)
replace(
    delivery,
    "INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'operator',$2,'returning_to_store',$3)`, current.OrderID, orderStatus, note)",
    "INSERT INTO dsh_order_status_events(order_id,actor_id,actor_role,from_status,to_status,note) VALUES($1::uuid,$2,'operator',$3,'returning_to_store',$4)`, current.OrderID, actorID, orderStatus, note)",
)
replace(
    delivery,
    "INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'captain','returning_to_store','return_arrived_store','captain arrived at store with returned order')`, orderID)",
    "INSERT INTO dsh_order_status_events(order_id,actor_id,actor_role,from_status,to_status,note) VALUES($1::uuid,$2,'captain','returning_to_store','return_arrived_store','captain arrived at store with returned order')`, orderID, captainID)",
)
replace(
    delivery,
    "INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note) VALUES($1::uuid,'partner','return_arrived_store','returned_to_store','store accepted returned order custody')`, orderID)",
    "INSERT INTO dsh_order_status_events(order_id,actor_id,actor_role,from_status,to_status,note) VALUES($1::uuid,$2,'partner','return_arrived_store','returned_to_store','store accepted returned order custody')`, orderID, actorID)",
)

truth = "services/dsh/backend/internal/orders/order_truth.go"
replace(
    truth,
    "VALUES ($1::uuid,$2,'system','',$3,$4,'order created from eligible checkout','order.created',$5,$6,1,$7::jsonb)\n\t\tRETURNING id::text`, orderID, input.OperatorContextID, \"\", string(StatusPending), input.CorrelationID, input.CheckoutIntentID, eventMetadata,",
    "VALUES ($1::uuid,$2,'client',$3,$4,$5,'order created from eligible checkout','order.created',$6,$7,1,$8::jsonb)\n\t\tRETURNING id::text`, orderID, input.OperatorContextID, input.ClientID, \"\", string(StatusPending), input.CorrelationID, input.CheckoutIntentID, eventMetadata,",
)
replace(
    truth,
    "jsonb_build_object('orderId',$2::text,'checkoutIntentId',$5::text,'correlationId',$4::text,'version',1))\n\t\tON CONFLICT (operator_context_id,event_id) DO NOTHING`,\n\t\tinput.OperatorContextID, orderID, eventID, input.CorrelationID, input.CheckoutIntentID,",
    "jsonb_build_object('orderId',$2::text,'checkoutIntentId',$5::text,'correlationId',$4::text,'actorId',$6::text,'actorRole','client','version',1))\n\t\tON CONFLICT (operator_context_id,event_id) DO NOTHING`,\n\t\tinput.OperatorContextID, orderID, eventID, input.CorrelationID, input.CheckoutIntentID, input.ClientID,",
)
replace(
    truth,
    "\tActorRole     string          `json:\"actorRole\"`\n\tFromStatus",
    "\tActorRole     string          `json:\"actorRole\"`\n\tActorID       string          `json:\"actorId,omitempty\"`\n\tFromStatus",
)
replace(
    truth,
    "SELECT id::text, event_type, actor_role, from_status, to_status, correlation_id,\n\t\t       causation_id, order_version, metadata, created_at",
    "SELECT id::text, event_type, actor_role, actor_id, from_status, to_status, correlation_id,\n\t\t       causation_id, order_version, metadata, created_at",
)
replace(
    truth,
    "eventRows.Scan(&event.ID, &event.Type, &event.ActorRole, &event.FromStatus, &event.ToStatus, &event.CorrelationID, &event.CausationID, &event.OrderVersion, &metadata, &event.CreatedAt)",
    "eventRows.Scan(&event.ID, &event.Type, &event.ActorRole, &event.ActorID, &event.FromStatus, &event.ToStatus, &event.CorrelationID, &event.CausationID, &event.OrderVersion, &metadata, &event.CreatedAt)",
)

queries = "services/dsh/backend/internal/orders/order_truth_queries.go"
replace(
    queries,
    "\tif truth.AllowedActions == nil {\n\t\ttruth.AllowedActions = []string{\"view\"}\n\t}\n\tif viewerRole == \"partner\" || viewerRole == \"operator\" {",
    "\tif truth.AllowedActions == nil {\n\t\ttruth.AllowedActions = []string{\"view\"}\n\t}\n\tif viewerRole != \"operator\" {\n\t\tfor index := range truth.StatusTimeline {\n\t\t\ttruth.StatusTimeline[index].ActorID = \"\"\n\t\t}\n\t}\n\tif viewerRole == \"partner\" || viewerRole == \"operator\" {",
)

replace(
    "services/dsh/frontend/shared/order-truth/order-truth.types.ts",
    "  readonly actorRole: string;\n  readonly fromStatus:",
    "  readonly actorRole: string;\n  readonly actorId?: string;\n  readonly fromStatus:",
)

contract = Path("services/dsh/contracts/dsh.order-truth.openapi.yaml")
contract_text = contract.read_text()
pattern = r"(    OrderEvent:\n[\s\S]*?        actorRole:\n          type: string\n)"
match = re.search(pattern, contract_text)
if not match:
    raise SystemExit("OrderEvent.actorRole schema anchor not found")
if "actorId:" in match.group(1):
    raise SystemExit("OrderEvent.actorId already exists unexpectedly")
insertion = match.group(1) + "        actorId:\n          type: string\n          description: Authenticated actor identifier; returned only to operator-scoped readers and redacted from client and partner responses.\n"
contract.write_text(contract_text[:match.start()] + insertion + contract_text[match.end():])

test_path = Path("services/dsh/backend/internal/orders/actor_provenance_redaction_test.go")
if test_path.exists():
    raise SystemExit(f"{test_path}: unexpected pre-existing file")
test_path.write_text('''package orders\n\nimport "testing"\n\nfunc TestRedactOrderTruthForViewerActorProvenance(t *testing.T) {\n\tfor _, tc := range []struct {\n\t\tname string\n\t\trole string\n\t\twant string\n\t}{\n\t\t{name: "client redacted", role: "client", want: ""},\n\t\t{name: "partner redacted", role: "partner", want: ""},\n\t\t{name: "operator retained", role: "operator", want: "actor-123"},\n\t} {\n\t\tt.Run(tc.name, func(t *testing.T) {\n\t\t\ttruth := &OrderTruth{StatusTimeline: []OrderTruthEvent{{ActorID: "actor-123", ActorRole: "captain"}}}\n\t\t\tRedactOrderTruthForViewer(truth, tc.role)\n\t\t\tif got := truth.StatusTimeline[0].ActorID; got != tc.want {\n\t\t\t\tt.Fatalf("ActorID after redaction = %q, want %q", got, tc.want)\n\t\t\t}\n\t\t})\n\t}\n}\n''')

migration = Path("services/dsh/database/migrations/dsh-1008_order_event_actor_provenance.sql")
if migration.exists():
    raise SystemExit(f"{migration}: unexpected pre-existing migration")
migration_text = '''-- V5 RC-ORDER-ACTOR-PROVENANCE: complete the forward-only actor identity cutover.\nBEGIN;\n\nALTER TABLE dsh_order_status_events\n  ADD CONSTRAINT dsh_order_status_events_actor_id_required\n  CHECK (NULLIF(BTRIM(actor_id), '') IS NOT NULL) NOT VALID;\n\nCREATE OR REPLACE FUNCTION dsh_publish_order_event_to_outbox()\nRETURNS TRIGGER LANGUAGE plpgsql AS $$\nBEGIN\n  INSERT INTO dsh_order_event_outbox\n    (operator_context_id,order_id,event_id,event_type,correlation_id,causation_id,payload)\n  VALUES\n    (NEW.operator_context_id,NEW.order_id,NEW.id,NEW.event_type,NEW.correlation_id,NEW.causation_id,\n     jsonb_build_object(\n       'eventId',NEW.id,\n       'eventType',NEW.event_type,\n       'orderId',NEW.order_id,\n       'fromStatus',NEW.from_status,\n       'toStatus',NEW.to_status,\n       'actorRole',NEW.actor_role,\n       'actorId',NEW.actor_id,\n       'correlationId',NEW.correlation_id,\n       'causationId',NEW.causation_id,\n       'orderVersion',NEW.order_version,\n       'metadata',NEW.metadata,\n       'occurredAt',NEW.created_at\n     ))\n  ON CONFLICT (operator_context_id,event_id) DO NOTHING;\n  RETURN NEW;\nEND $$;\n\nCOMMIT;\n'''
migration.write_text(migration_text)

manifest_path = Path("services/dsh/database/migrations/manifest.extensions.json")
manifest = json.loads(manifest_path.read_text())
if any(entry["file"] == migration.name for entry in manifest["migrations"]):
    raise SystemExit("dsh-1008 already registered")
if max(entry["ordinal"] for entry in manifest["migrations"]) != 254:
    raise SystemExit("migration extension frontier moved; reconcile before execution")
digest = hashlib.sha256(migration.read_bytes()).hexdigest()
manifest["migrations"].append({
    "ordinal": 255,
    "file": migration.name,
    "sha256": digest,
    "historicalPrefix": "1008",
    "state": "ACTIVE",
})
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
