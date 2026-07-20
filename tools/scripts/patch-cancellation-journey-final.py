from __future__ import annotations

from pathlib import Path
import re

DSH_CONTRACT = Path("services/dsh/contracts/dsh.openapi.yaml")
WLT_CONTRACT = Path("services/wlt/contracts/wlt.openapi.yaml")
PICKUP_SERVICE = Path("services/dsh/backend/internal/pickup/service.go")
PICKUP_HTTP = Path("services/dsh/backend/internal/http/pickup.go")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


def patch_pickup_service() -> None:
    text = PICKUP_SERVICE.read_text(encoding="utf-8")

    if "current.Status == SessionCancelled" not in text:
        text = replace_once(
            text,
            "\tif current.UsedAt != nil {\n\t\treturn nil, ErrAlreadyUsed\n\t}\n\tif !current.ExpiresAt.After(time.Now().UTC()) {",
            "\tif current.Status == SessionCancelled {\n\t\treturn nil, ErrCancelled\n\t}\n\tif current.Status != SessionActive || current.UsedAt != nil {\n\t\treturn nil, ErrAlreadyUsed\n\t}\n\tif !current.ExpiresAt.After(time.Now().UTC()) {",
            "verify cancelled guard",
        )

    if "status = 'active'" not in text:
        text = replace_once(
            text,
            "\t\t\tSET hashed_otp = $1, expires_at = $2, attempt_count = 0, max_attempts = $3,\n\t\t\t    used_at = NULL, verified_by_actor_id = NULL, verification_method = NULL,\n\t\t\t    version = version + 1, updated_at = NOW()",
            "\t\t\tSET hashed_otp = $1, expires_at = $2, attempt_count = 0, max_attempts = $3,\n\t\t\t    used_at = NULL, verified_by_actor_id = NULL, verification_method = NULL,\n\t\t\t    status = 'active', cancelled_at = NULL, cancellation_reason = NULL,\n\t\t\t    version = version + 1, updated_at = NOW()",
            "otp reset state",
        )

    if "status = 'verified'" not in text:
        text = replace_once(
            text,
            "\t\tSET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'otp',\n\t\t    version = version + 1, updated_at = NOW()",
            "\t\tSET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'otp',\n\t\t    status = 'verified', version = version + 1, updated_at = NOW()",
            "verify state",
        )

    no_show_guard = """\tif current.UsedAt != nil {
\t\treturn nil, ErrAlreadyUsed
\t}
\tfromJSON := sessionJSON(current)
"""
    if text.count(no_show_guard) == 1:
        text = text.replace(
            no_show_guard,
            """\tif current.Status == SessionCancelled {
\t\treturn nil, ErrCancelled
\t}
\tif current.Status != SessionActive || current.UsedAt != nil {
\t\treturn nil, ErrAlreadyUsed
\t}
\tfromJSON := sessionJSON(current)
""",
            1,
        )

    if "status = 'no_show'" not in text:
        text = replace_once(
            text,
            "\t\tSET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'no_show',\n\t\t    version = version + 1, updated_at = NOW()",
            "\t\tSET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'no_show',\n\t\t    status = 'no_show', version = version + 1, updated_at = NOW()",
            "no-show state",
        )

    extend_anchor = """\tcurrent, err := GetForUpdateByOrderID(tx, orderID)
\tif err != nil {
\t\treturn nil, err
\t}
\tif current.UsedAt != nil {
\t\treturn nil, ErrAlreadyUsed
\t}
\tfromJSON := sessionJSON(current)
"""
    if extend_anchor in text:
        text = text.replace(
            extend_anchor,
            """\tcurrent, err := GetForUpdateByOrderID(tx, orderID)
\tif err != nil {
\t\treturn nil, err
\t}
\tif current.Status == SessionCancelled {
\t\treturn nil, ErrCancelled
\t}
\tif current.Status != SessionActive || current.UsedAt != nil {
\t\treturn nil, ErrAlreadyUsed
\t}
\tfromJSON := sessionJSON(current)
""",
            1,
        )

    PICKUP_SERVICE.write_text(text, encoding="utf-8")


def patch_pickup_http() -> None:
    text = PICKUP_HTTP.read_text(encoding="utf-8")
    if "PICKUP_CANCELLED" not in text:
        text = replace_once(
            text,
            "\tcase errors.Is(err, pickup.ErrAlreadyUsed):\n\t\tstore.SendError(w, http.StatusUnprocessableEntity, \"PICKUP_CODE_ALREADY_USED\", err.Error())",
            "\tcase errors.Is(err, pickup.ErrCancelled):\n\t\tstore.SendError(w, http.StatusConflict, \"PICKUP_CANCELLED\", \"pickup session was cancelled with the order\")\n\tcase errors.Is(err, pickup.ErrAlreadyUsed):\n\t\tstore.SendError(w, http.StatusUnprocessableEntity, \"PICKUP_CODE_ALREADY_USED\", err.Error())",
            "pickup cancelled error",
        )
    if '"status":' not in text[text.index("func marshalPickupSession"):text.index("func (s *protectedStoreServer) handlePickupMarkReady")]:
        text = replace_once(
            text,
            '\t\t"verificationMethod": s.VerificationMethod,\n\t\t"version":            s.Version,',
            '\t\t"verificationMethod": s.VerificationMethod,\n\t\t"status":             s.Status,\n\t\t"cancelledAt":        s.CancelledAt,\n\t\t"cancellationReason": s.CancellationReason,\n\t\t"version":            s.Version,',
            "pickup response state",
        )
    if 'Status: pickup.SessionStatus(r.URL.Query().Get("status"))' not in text:
        text = replace_once(
            text,
            "\t\tStoreID: r.URL.Query().Get(\"storeId\"),\n\t\tLimit:   limit,",
            "\t\tStoreID: r.URL.Query().Get(\"storeId\"),\n\t\tStatus:  pickup.SessionStatus(r.URL.Query().Get(\"status\")),\n\t\tLimit:   limit,",
            "pickup list status",
        )
    PICKUP_HTTP.write_text(text, encoding="utf-8")


def patch_dsh_contract() -> None:
    text = DSH_CONTRACT.read_text(encoding="utf-8")
    marker = "    DshPickupSession:\n"
    start = text.find(marker)
    if start < 0:
        raise RuntimeError("DshPickupSession schema not found")
    next_schema = re.search(r"\n    [A-Za-z0-9_]+:\n", text[start + len(marker):])
    if not next_schema:
        raise RuntimeError("DshPickupSession schema end not found")
    end = start + len(marker) + next_schema.start()
    block = text[start:end]
    if "cancellationReason:" not in block:
        block = block.replace(
            "        verificationMethod:",
            "        status:\n"
            "          type: string\n"
            "          enum: [active, verified, no_show, consumed, cancelled]\n"
            "        cancelledAt: { type: [string, \"null\"], format: date-time }\n"
            "        cancellationReason: { type: [string, \"null\"] }\n"
            "        verificationMethod:",
            1,
        )
        text = text[:start] + block + text[end:]
    DSH_CONTRACT.write_text(text, encoding="utf-8")


def patch_wlt_contract() -> None:
    text = WLT_CONTRACT.read_text(encoding="utf-8")
    if "  version: 0.2.0\n" in text:
        text = text.replace("  version: 0.2.0\n", "  version: 0.3.0\n", 1)

    if "/wlt/order-cancellations:" not in text:
        path_block = r'''
  /wlt/order-cancellations:
    post:
      operationId: closeWltOrderCancellation
      summary: Resolve the WLT-owned financial consequence of a governed DSH order cancellation.
      description: >-
        Internal DSH-only mutation. WLT derives all monetary values from the referenced payment session.
        It expires an uncollected session, creates one idempotent refund for captured/COD-collected money,
        or returns no action for an already terminal session.
      tags: [WltOrderCancellation]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: X-Service-Caller
          in: header
          required: true
          schema: { type: string, enum: [dsh] }
        - name: Idempotency-Key
          in: header
          required: true
          schema: { type: string, minLength: 1 }
        - name: X-Correlation-ID
          in: header
          required: true
          schema: { type: string, minLength: 1 }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/WltGovernedOrderCancellationRequest" }
      responses:
        "200":
          description: Financial cancellation decision returned.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/WltGovernedOrderCancellationResponse" }
        "400": { $ref: "#/components/responses/BadRequest" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409": { $ref: "#/components/responses/Conflict" }

'''
        anchor = "  /wlt/payment-sessions/{paymentSessionId}/cod-collect:\n"
        text = replace_once(text, anchor, path_block + anchor, "WLT cancellation path")

    if "    WltGovernedOrderCancellationRequest:\n" not in text:
        schemas = r'''
    WltGovernedOrderCancellationRequest:
      type: object
      additionalProperties: false
      required: [paymentSessionId, orderId, clientId, reason]
      properties:
        paymentSessionId: { type: string, minLength: 1 }
        orderId: { type: string, minLength: 1 }
        clientId: { type: string, minLength: 1 }
        reason: { type: string, minLength: 1, maxLength: 1000 }

    WltGovernedOrderCancellationAction:
      type: string
      enum: [expired, refund_requested, none]

    WltGovernedOrderCancellationResponse:
      type: object
      required: [action]
      properties:
        action: { $ref: "#/components/schemas/WltGovernedOrderCancellationAction" }
        paymentSession: { $ref: "#/components/schemas/WltPaymentSession" }
        refund: { $ref: "#/components/schemas/WltRefund" }
        sessionStatus: { type: string }

'''
        anchor = "    WltCancelPaymentSessionForOrderRequest:\n"
        text = replace_once(text, anchor, schemas + anchor, "WLT cancellation schemas")

    WLT_CONTRACT.write_text(text, encoding="utf-8")


def main() -> None:
    patch_pickup_service()
    patch_pickup_http()
    patch_dsh_contract()
    patch_wlt_contract()


if __name__ == "__main__":
    main()
