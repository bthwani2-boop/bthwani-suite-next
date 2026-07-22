from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one anchor, found {count}: {old[:120]!r}")
    write(path, content.replace(old, new, 1))


def append_once(path: str, marker: str, block: str) -> None:
    content = read(path)
    if marker in content:
        return
    write(path, content.rstrip() + "\n\n" + block.strip() + "\n")


# 1. Register the missing client/operator information and execution routes.
replace_once(
    "services/dsh/backend/internal/http/server.go",
    '''\tmux.HandleFunc("GET /dsh/client/special-requests/{requestId}", protected.handleGetClientSpecialRequest)\n\tmux.HandleFunc("POST /dsh/client/special-requests/{requestId}/cancel", protected.handleCancelClientSpecialRequest)\n\tmux.HandleFunc("POST /dsh/client/special-requests/{requestId}/approve-quote", protected.handleApproveSpecialRequestQuote)\n\tmux.HandleFunc("GET /dsh/operator/special-requests", protected.handleListOperatorSpecialRequests)\n\tmux.HandleFunc("GET /dsh/operator/special-requests/{requestId}", protected.handleGetOperatorSpecialRequest)\n\tmux.HandleFunc("PATCH /dsh/operator/special-requests/{requestId}", protected.handleUpdateOperatorSpecialRequest)\n\tmux.HandleFunc("POST /dsh/operator/special-requests/{requestId}/dispatch", protected.handleAssignSpecialRequestDispatch)''',
    '''\tmux.HandleFunc("GET /dsh/client/special-requests/{requestId}", protected.handleGetClientSpecialRequest)\n\tmux.HandleFunc("GET /dsh/client/special-requests/{requestId}/information-exchange", protected.handleGetClientSpecialRequestInformation)\n\tmux.HandleFunc("POST /dsh/client/special-requests/{requestId}/information-response", protected.handleRespondSpecialRequestInformation)\n\tmux.HandleFunc("GET /dsh/client/special-requests/{requestId}/execution", protected.handleGetClientSpecialRequestExecution)\n\tmux.HandleFunc("POST /dsh/client/special-requests/{requestId}/cancel", protected.handleCancelClientSpecialRequest)\n\tmux.HandleFunc("POST /dsh/client/special-requests/{requestId}/approve-quote", protected.handleApproveSpecialRequestQuote)\n\tmux.HandleFunc("GET /dsh/operator/special-requests", protected.handleListOperatorSpecialRequests)\n\tmux.HandleFunc("GET /dsh/operator/special-requests/{requestId}", protected.handleGetOperatorSpecialRequest)\n\tmux.HandleFunc("GET /dsh/operator/special-requests/{requestId}/information-exchange", protected.handleGetOperatorSpecialRequestInformation)\n\tmux.HandleFunc("POST /dsh/operator/special-requests/{requestId}/information-request", protected.handleRequestSpecialRequestInformation)\n\tmux.HandleFunc("GET /dsh/operator/special-requests/{requestId}/execution", protected.handleGetOperatorSpecialRequestExecution)\n\tmux.HandleFunc("PATCH /dsh/operator/special-requests/{requestId}", protected.handleUpdateOperatorSpecialRequest)\n\tmux.HandleFunc("POST /dsh/operator/special-requests/{requestId}/dispatch", protected.handleAssignSpecialRequestDispatch)''',
)

# 2. Quote approval is valid only for the quote decision stage, never for a
# missing-information question that happens to share needs_customer_input.
replace_once(
    "services/dsh/backend/internal/http/specialrequests.go",
    '''\tif req.Status != specialrequests.StatusUnderReview && req.Status != specialrequests.StatusNeedsCustomerInput {\n\t\twriteSpecialRequestError(w, fmt.Errorf("%w: cannot approve quote from status %s", specialrequests.ErrConflict, req.Status), "special request not found")\n\t\treturn\n\t}''',
    '''\tif req.Status != specialrequests.StatusNeedsCustomerInput || req.WorkflowStage == nil || *req.WorkflowStage != "customer_approval" {\n\t\twriteSpecialRequestError(w, fmt.Errorf("%w: quote approval requires customer_approval stage", specialrequests.ErrConflict), "special request not found")\n\t\treturn\n\t}''',
)

# 3. Extend the existing dispatch exception overlay to the source fork already
# owned by assignments/deliveries.
replace_once(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    '''\tOrderID                 string\n\tCaptainID               string''',
    '''\tOrderID                 string\n\tSpecialRequestID        string\n\tCaptainID               string''',
)
replace_once(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    '''\tif current.OrderID == "" {\n\t\treturn nil, fmt.Errorf("%w: delivery exceptions require an order-backed assignment", ErrConflict)\n\t}\n\n\tvar tenantID string\n\tif err := tx.QueryRow(`SELECT tenant_id FROM dsh_orders WHERE id=$1::uuid FOR UPDATE`, current.OrderID).Scan(&tenantID); err != nil {\n\t\tif errors.Is(err, sql.ErrNoRows) {\n\t\t\treturn nil, ErrNotFound\n\t\t}\n\t\treturn nil, err\n\t}''',
    '''\tif current.OrderID == "" && current.SpecialRequestID == "" {\n\t\treturn nil, fmt.Errorf("%w: delivery exception source is missing", ErrConflict)\n\t}\n\n\tvar tenantID string\n\tif current.OrderID != "" {\n\t\tif err := tx.QueryRow(`SELECT tenant_id FROM dsh_orders WHERE id=$1::uuid FOR UPDATE`, current.OrderID).Scan(&tenantID); err != nil {\n\t\t\tif errors.Is(err, sql.ErrNoRows) {\n\t\t\t\treturn nil, ErrNotFound\n\t\t\t}\n\t\t\treturn nil, err\n\t\t}\n\t} else {\n\t\tif err := tx.QueryRow(`SELECT tenant_id FROM dsh_special_requests WHERE id=$1::uuid FOR UPDATE`, current.SpecialRequestID).Scan(&tenantID); err != nil {\n\t\t\tif errors.Is(err, sql.ErrNoRows) {\n\t\t\t\treturn nil, ErrNotFound\n\t\t\t}\n\t\t\treturn nil, err\n\t\t}\n\t}''',
)
replace_once(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    '''\t\tINSERT INTO dsh_delivery_exceptions (\n\t\t\ttenant_id, assignment_id, order_id, captain_id, reason_code, note,\n\t\t\tdelivery_status_at_report, severity, correlation_id,\n\t\t\treported_latitude, reported_longitude\n\t\t) VALUES ($1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11)\n\t\tRETURNING id::text`,\n\t\ttenantID, assignmentID, current.OrderID, captainID, string(input.ReasonCode), input.Note,\n\t\tstring(current.Delivery.Status), string(severityForDeliveryException(input.ReasonCode)), input.CorrelationID,\n\t\tinput.Latitude, input.Longitude,''',
    '''\t\tINSERT INTO dsh_delivery_exceptions (\n\t\t\ttenant_id, assignment_id, order_id, special_request_id, captain_id, reason_code, note,\n\t\t\tdelivery_status_at_report, severity, correlation_id,\n\t\t\treported_latitude, reported_longitude\n\t\t) VALUES ($1,$2::uuid,NULLIF($3,'')::uuid,NULLIF($4,'')::uuid,$5,$6,$7,$8,$9,$10,$11,$12)\n\t\tRETURNING id::text`,\n\t\ttenantID, assignmentID, current.OrderID, current.SpecialRequestID, captainID, string(input.ReasonCode), input.Note,\n\t\tstring(current.Delivery.Status), string(severityForDeliveryException(input.ReasonCode)), input.CorrelationID,\n\t\tinput.Latitude, input.Longitude,''',
)
replace_once(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    '''\tif newCaptainID == current.CaptainID {\n\t\treturn nil, fmt.Errorf("%w: replacement captain must differ from current captain", ErrInvalid)\n\t}\n\n\tvar assignmentStatus AssignmentStatus''',
    '''\tif newCaptainID == current.CaptainID {\n\t\treturn nil, fmt.Errorf("%w: replacement captain must differ from current captain", ErrInvalid)\n\t}\n\tif current.SpecialRequestID != "" {\n\t\tif _, err := resolveSpecialRequestExceptionReassignCaptainTx(tx, current, expectedVersion, newCaptainID, note, actorID); err != nil {\n\t\t\treturn nil, err\n\t\t}\n\t\tif err := tx.Commit(); err != nil {\n\t\t\treturn nil, err\n\t\t}\n\t\treturn GetDeliveryException(db, id)\n\t}\n\n\tvar assignmentStatus AssignmentStatus''',
)
replace_once(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    '''\tif current.Version != expectedVersion {\n\t\treturn nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)\n\t}\n\n\tvar deliveryStatus DeliveryStatus\n\tif err := db.QueryRow(`SELECT d.status FROM dsh_deliveries d WHERE d.assignment_id=$1::uuid`, current.AssignmentID).Scan(&deliveryStatus); err != nil {''',
    '''\tif current.Version != expectedVersion {\n\t\treturn nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)\n\t}\n\tif current.SpecialRequestID != "" {\n\t\treturn nil, fmt.Errorf("%w: special-request exceptions support retry_same_captain or reassign_captain; cancel_order is order-owned", ErrConflict)\n\t}\n\n\tvar deliveryStatus DeliveryStatus\n\tif err := db.QueryRow(`SELECT d.status FROM dsh_deliveries d WHERE d.assignment_id=$1::uuid`, current.AssignmentID).Scan(&deliveryStatus); err != nil {''',
)
# Target the return-to-store version check by its following assignmentStatus declaration.
replace_once(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    '''\tif current.Version != expectedVersion {\n\t\treturn nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)\n\t}\n\tvar assignmentStatus AssignmentStatus\n\tvar deliveryStatus DeliveryStatus\n\tvar orderStatus string''',
    '''\tif current.Version != expectedVersion {\n\t\treturn nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)\n\t}\n\tif current.SpecialRequestID != "" {\n\t\treturn nil, fmt.Errorf("%w: return_to_store is order/store-owned; use retry_same_captain or reassign_captain", ErrConflict)\n\t}\n\tvar assignmentStatus AssignmentStatus\n\tvar deliveryStatus DeliveryStatus\n\tvar orderStatus string''',
)
replace_once(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    '''const deliveryExceptionColumns = `\n\te.id::text, e.tenant_id, e.assignment_id::text, e.order_id::text, e.captain_id,''',
    '''const deliveryExceptionColumns = `\n\te.id::text, e.tenant_id, e.assignment_id::text, COALESCE(e.order_id::text, ''), COALESCE(e.special_request_id::text, ''), e.captain_id,''',
)
replace_once(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    '''\t\t&item.ID, &item.TenantID, &item.AssignmentID, &item.OrderID, &item.CaptainID,''',
    '''\t\t&item.ID, &item.TenantID, &item.AssignmentID, &item.OrderID, &item.SpecialRequestID, &item.CaptainID,''',
)
replace_once(
    "services/dsh/backend/internal/http/dispatch.go",
    '''\t\t"orderId": item.OrderID, "captainId": item.CaptainID,''',
    '''\t\t"orderId": item.OrderID, "specialRequestId": item.SpecialRequestID, "captainId": item.CaptainID,''',
)

# 4. Contract the source fork and the new JRN-022 resources.
common_path = "services/dsh/contracts/components/schemas/common.schemas.yaml"
common = read(common_path)
section_start = common.index("DshDeliveryException:\n")
section_end = common.index("\nDshDeliveryExceptionResponse:", section_start)
section = common[section_start:section_end]
section = section.replace("    - orderId\n", "")
section = section.replace(
    "    orderId: { type: string, format: uuid }\n",
    "    orderId: { type: [string, \"null\"], format: uuid }\n    specialRequestId: { type: [string, \"null\"], format: uuid }\n",
)
common = common[:section_start] + section + common[section_end:]
write(common_path, common)

append_once(
    common_path,
    "DshSpecialRequestInformationExchange:",
    '''
DshSpecialRequestInformationExchange:
  type: object
  additionalProperties: false
  required: [id, specialRequestId, clientId, requestedByOperatorId, question, status, requestVersionAtRequest, requestedAt, updatedAt]
  properties:
    id: { type: string, format: uuid }
    specialRequestId: { type: string, format: uuid }
    clientId: { type: string }
    requestedByOperatorId: { type: string }
    question: { type: string }
    response: { type: [string, "null"] }
    status: { type: string, enum: [pending, responded] }
    requestVersionAtRequest: { type: integer, minimum: 1 }
    requestVersionAtResponse: { type: [integer, "null"], minimum: 1 }
    requestedAt: { type: string, format: date-time }
    respondedAt: { type: [string, "null"], format: date-time }
    updatedAt: { type: string, format: date-time }

DshSpecialRequestInformationExchangeResponse:
  type: object
  additionalProperties: false
  required: [informationExchange]
  properties:
    informationExchange:
      oneOf:
        - $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestInformationExchange"
        - type: "null"

DshSpecialRequestInformationMutationResponse:
  type: object
  additionalProperties: false
  required: [request, informationExchange]
  properties:
    request: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestResponse" }
    informationExchange: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestInformationExchange" }

DshRequestSpecialRequestInformation:
  type: object
  additionalProperties: false
  required: [expectedVersion, question]
  properties:
    expectedVersion: { type: integer, minimum: 1 }
    question: { type: string, minLength: 5, maxLength: 2000 }

DshRespondSpecialRequestInformation:
  type: object
  additionalProperties: false
  required: [expectedVersion, exchangeId, response]
  properties:
    expectedVersion: { type: integer, minimum: 1 }
    exchangeId: { type: string, format: uuid }
    response: { type: string, minLength: 1, maxLength: 2000 }

DshSpecialRequestExecutionException:
  type: object
  additionalProperties: false
  required: [id, reasonCode, note, severity, status, reportedAt]
  properties:
    id: { type: string, format: uuid }
    reasonCode: { type: string }
    note: { type: string }
    severity: { type: string, enum: [medium, high, critical] }
    status: { type: string, enum: [open, acknowledged, resolved] }
    reportedAt: { type: string, format: date-time }
    acknowledgedAt: { type: [string, "null"], format: date-time }
    resolvedAt: { type: [string, "null"], format: date-time }
    resolutionAction: { type: [string, "null"] }
    resolutionNote: { type: [string, "null"] }

DshSpecialRequestExecution:
  type: object
  additionalProperties: false
  required: [specialRequestId]
  properties:
    specialRequestId: { type: string, format: uuid }
    assignmentId: { type: [string, "null"], format: uuid }
    captainId: { type: [string, "null"] }
    assignmentStatus: { type: [string, "null"] }
    assignmentCreatedAt: { type: [string, "null"], format: date-time }
    acceptedAt: { type: [string, "null"], format: date-time }
    assignmentCompletedAt: { type: [string, "null"], format: date-time }
    deliveryStatus: { type: [string, "null"] }
    podMethod: { type: [string, "null"] }
    podReference: { type: [string, "null"] }
    deliveryNote: { type: [string, "null"] }
    deliveryUpdatedAt: { type: [string, "null"], format: date-time }
    latestException:
      oneOf:
        - $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestExecutionException"
        - type: "null"

DshSpecialRequestExecutionResponse:
  type: object
  additionalProperties: false
  required: [execution]
  properties:
    execution: { $ref: "../../dsh.openapi.yaml#/components/schemas/DshSpecialRequestExecution" }
''',
)

replace_once(
    "services/dsh/contracts/dsh.openapi.yaml",
    '''  /dsh/client/special-requests/{requestId}/approve-quote:\n    $ref: "./paths/misc.paths.yaml#/~1dsh~1client~1special-requests~1{requestId}~1approve-quote"\n  /dsh/operator/special-requests:''',
    '''  /dsh/client/special-requests/{requestId}/approve-quote:\n    $ref: "./paths/misc.paths.yaml#/~1dsh~1client~1special-requests~1{requestId}~1approve-quote"\n  /dsh/client/special-requests/{requestId}/information-exchange:\n    $ref: "./paths/misc.paths.yaml#/~1dsh~1client~1special-requests~1{requestId}~1information-exchange"\n  /dsh/client/special-requests/{requestId}/information-response:\n    $ref: "./paths/misc.paths.yaml#/~1dsh~1client~1special-requests~1{requestId}~1information-response"\n  /dsh/client/special-requests/{requestId}/execution:\n    $ref: "./paths/misc.paths.yaml#/~1dsh~1client~1special-requests~1{requestId}~1execution"\n  /dsh/operator/special-requests:''',
)
replace_once(
    "services/dsh/contracts/dsh.openapi.yaml",
    '''  /dsh/operator/special-requests/{requestId}:\n    $ref: "./paths/operator.paths.yaml#/~1dsh~1operator~1special-requests~1{requestId}"\n  /dsh/operator/special-requests/{requestId}/dispatch:''',
    '''  /dsh/operator/special-requests/{requestId}:\n    $ref: "./paths/operator.paths.yaml#/~1dsh~1operator~1special-requests~1{requestId}"\n  /dsh/operator/special-requests/{requestId}/information-exchange:\n    $ref: "./paths/misc.paths.yaml#/~1dsh~1operator~1special-requests~1{requestId}~1information-exchange"\n  /dsh/operator/special-requests/{requestId}/information-request:\n    $ref: "./paths/misc.paths.yaml#/~1dsh~1operator~1special-requests~1{requestId}~1information-request"\n  /dsh/operator/special-requests/{requestId}/execution:\n    $ref: "./paths/misc.paths.yaml#/~1dsh~1operator~1special-requests~1{requestId}~1execution"\n  /dsh/operator/special-requests/{requestId}/dispatch:''',
)
replace_once(
    "services/dsh/contracts/dsh.openapi.yaml",
    '''    DshUpdateSpecialRequest:\n      $ref: "./components/schemas/common.schemas.yaml#/DshUpdateSpecialRequest"\n    DshPartnerDeliveryTaskStatus:''',
    '''    DshUpdateSpecialRequest:\n      $ref: "./components/schemas/common.schemas.yaml#/DshUpdateSpecialRequest"\n    DshSpecialRequestInformationExchange:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestInformationExchange"\n    DshSpecialRequestInformationExchangeResponse:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestInformationExchangeResponse"\n    DshSpecialRequestInformationMutationResponse:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestInformationMutationResponse"\n    DshRequestSpecialRequestInformation:\n      $ref: "./components/schemas/common.schemas.yaml#/DshRequestSpecialRequestInformation"\n    DshRespondSpecialRequestInformation:\n      $ref: "./components/schemas/common.schemas.yaml#/DshRespondSpecialRequestInformation"\n    DshSpecialRequestExecutionException:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestExecutionException"\n    DshSpecialRequestExecution:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestExecution"\n    DshSpecialRequestExecutionResponse:\n      $ref: "./components/schemas/common.schemas.yaml#/DshSpecialRequestExecutionResponse"\n    DshPartnerDeliveryTaskStatus:''',
)

append_once(
    "services/dsh/contracts/paths/misc.paths.yaml",
    "/dsh/client/special-requests/{requestId}/information-exchange:",
    '''
/dsh/client/special-requests/{requestId}/information-exchange:
  get:
    operationId: getDshClientSpecialRequestInformationExchange
    summary: Read the latest governed operator question and client response for an owned special request.
    tags: [DshClientSpecialRequests]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: requestId
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      "200":
        description: Latest information exchange or null when no question exists.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshSpecialRequestInformationExchangeResponse" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }

/dsh/client/special-requests/{requestId}/information-response:
  post:
    operationId: respondDshClientSpecialRequestInformation
    summary: Answer the pending operator question and return the request to governed review.
    tags: [DshClientSpecialRequests]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: requestId
        in: path
        required: true
        schema: { type: string, format: uuid }
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshRespondSpecialRequestInformation" }
    responses:
      "200":
        description: Canonical request and completed information exchange.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshSpecialRequestInformationMutationResponse" }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }

/dsh/client/special-requests/{requestId}/execution:
  get:
    operationId: getDshClientSpecialRequestExecution
    summary: Read governed assignment, delivery, proof, and latest exception evidence for an owned special request.
    tags: [DshClientSpecialRequests]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: requestId
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      "200":
        description: Dispatch-owned execution evidence.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshSpecialRequestExecutionResponse" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }

/dsh/operator/special-requests/{requestId}/information-exchange:
  get:
    operationId: getDshOperatorSpecialRequestInformationExchange
    summary: Read the latest governed information exchange for a special request.
    tags: [DshOperatorSpecialRequests]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: requestId
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      "200":
        description: Latest information exchange or null.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshSpecialRequestInformationExchangeResponse" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }

/dsh/operator/special-requests/{requestId}/information-request:
  post:
    operationId: requestDshOperatorSpecialRequestInformation
    summary: Ask the client for missing information and move the request to customer_information.
    tags: [DshOperatorSpecialRequests]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: requestId
        in: path
        required: true
        schema: { type: string, format: uuid }
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshRequestSpecialRequestInformation" }
    responses:
      "200":
        description: Canonical request and pending information exchange.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshSpecialRequestInformationMutationResponse" }
      "400": { $ref: "../dsh.openapi.yaml#/components/responses/InvalidRequest" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
      "409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }

/dsh/operator/special-requests/{requestId}/execution:
  get:
    operationId: getDshOperatorSpecialRequestExecution
    summary: Read dispatch-owned execution, proof, and exception evidence for a special request.
    tags: [DshOperatorSpecialRequests]
    security: [{ bearerAuth: [] }]
    parameters:
      - name: requestId
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      "200":
        description: Dispatch-owned execution evidence.
        content:
          application/json:
            schema: { $ref: "../dsh.openapi.yaml#/components/schemas/DshSpecialRequestExecutionResponse" }
      "401": { $ref: "../dsh.openapi.yaml#/components/responses/Unauthenticated" }
      "403": { $ref: "../dsh.openapi.yaml#/components/responses/Forbidden" }
      "404": { $ref: "../dsh.openapi.yaml#/components/responses/NotFound" }
''',
)

# 5. Route and state-model regression coverage.
route_test = "services/dsh/backend/internal/http/jrn_022_special_requests_routes_test.go"
replace_once(
    route_test,
    '''\t\t{\n\t\t\tname:    "client approves quote",\n\t\t\tmethod:  http.MethodPost,\n\t\t\tpath:    "/dsh/client/special-requests/request-1/approve-quote",\n\t\t\tpattern: "POST /dsh/client/special-requests/{requestId}/approve-quote",\n\t\t},''',
    '''\t\t{\n\t\t\tname:    "client approves quote",\n\t\t\tmethod:  http.MethodPost,\n\t\t\tpath:    "/dsh/client/special-requests/request-1/approve-quote",\n\t\t\tpattern: "POST /dsh/client/special-requests/{requestId}/approve-quote",\n\t\t},\n\t\t{\n\t\t\tname:    "client reads requested information",\n\t\t\tmethod:  http.MethodGet,\n\t\t\tpath:    "/dsh/client/special-requests/request-1/information-exchange",\n\t\t\tpattern: "GET /dsh/client/special-requests/{requestId}/information-exchange",\n\t\t},\n\t\t{\n\t\t\tname:    "client responds with requested information",\n\t\t\tmethod:  http.MethodPost,\n\t\t\tpath:    "/dsh/client/special-requests/request-1/information-response",\n\t\t\tpattern: "POST /dsh/client/special-requests/{requestId}/information-response",\n\t\t},\n\t\t{\n\t\t\tname:    "client reads execution evidence",\n\t\t\tmethod:  http.MethodGet,\n\t\t\tpath:    "/dsh/client/special-requests/request-1/execution",\n\t\t\tpattern: "GET /dsh/client/special-requests/{requestId}/execution",\n\t\t},''',
)
replace_once(
    route_test,
    '''\t\t{\n\t\t\tname:    "operator transitions special request",''',
    '''\t\t{\n\t\t\tname:    "operator reads information exchange",\n\t\t\tmethod:  http.MethodGet,\n\t\t\tpath:    "/dsh/operator/special-requests/request-1/information-exchange",\n\t\t\tpattern: "GET /dsh/operator/special-requests/{requestId}/information-exchange",\n\t\t},\n\t\t{\n\t\t\tname:    "operator requests client information",\n\t\t\tmethod:  http.MethodPost,\n\t\t\tpath:    "/dsh/operator/special-requests/request-1/information-request",\n\t\t\tpattern: "POST /dsh/operator/special-requests/{requestId}/information-request",\n\t\t},\n\t\t{\n\t\t\tname:    "operator reads execution evidence",\n\t\t\tmethod:  http.MethodGet,\n\t\t\tpath:    "/dsh/operator/special-requests/request-1/execution",\n\t\t\tpattern: "GET /dsh/operator/special-requests/{requestId}/execution",\n\t\t},\n\t\t{\n\t\t\tname:    "operator transitions special request",''',
)

write(
    "services/dsh/backend/internal/specialrequests/information_exchange_test.go",
    '''package specialrequests

import "testing"

func TestInformationExchangeValidationAndCanonicalStage(t *testing.T) {
	if _, err := validateInformationText("question", "short", 5); err != nil {
		t.Fatalf("valid question rejected: %v", err)
	}
	if _, err := validateInformationText("question", " no ", 5); err == nil {
		t.Fatal("short question must be rejected")
	}
	for _, requestType := range []RequestType{TypeSheinAssistedPurchase, TypeAwnakErrand} {
		rule, ok := stageRulesFor(requestType)["customer_information"]
		if !ok {
			t.Fatalf("%s missing customer_information stage", requestType)
		}
		if !stageMatchesStatus(rule, StatusNeedsCustomerInput) {
			t.Fatalf("%s customer_information must require needs_customer_input", requestType)
		}
	}
}
''',
)

# Ensure the dedicated workflow observes every new backend/contract owner.
workflow = ".github/workflows/jrn-022-special-requests-verification.yml"
workflow_content = read(workflow)
if 'services/dsh/backend/internal/http/specialrequests_*.go' not in workflow_content:
    workflow_content = workflow_content.replace(
        '      - "services/dsh/backend/internal/http/specialrequests.go"\n',
        '      - "services/dsh/backend/internal/http/specialrequests.go"\n      - "services/dsh/backend/internal/http/specialrequests_*.go"\n      - "services/dsh/backend/internal/dispatch/delivery_exceptions*.go"\n      - "services/dsh/database/migrations/dsh-096_special_request_information_exchange.sql"\n      - "services/dsh/database/migrations/dsh-097_special_request_delivery_exceptions.sql"\n',
    )
write(workflow, workflow_content)

# The runner removes its temporary trigger to avoid leaving operational debris.
(ROOT / "tools/scripts/close-jrn-022-backend-contract-slices.py").unlink(missing_ok=True)
(ROOT / ".github/workflows/tmp-jrn-022-backend-contract-closure.yml").unlink(missing_ok=True)
