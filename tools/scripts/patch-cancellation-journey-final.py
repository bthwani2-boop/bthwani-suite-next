from __future__ import annotations

import re
from pathlib import Path

DSH_CONTRACT = Path("services/dsh/contracts/dsh.openapi.yaml")
WLT_CONTRACT = Path("services/wlt/contracts/wlt.openapi.yaml")
PICKUP_SERVICE = Path("services/dsh/backend/internal/pickup/service.go")
PICKUP_HTTP = Path("services/dsh/backend/internal/http/pickup.go")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


def transform_function(text: str, signature: str, transform) -> str:
    start = text.find(signature)
    if start < 0:
        raise RuntimeError(f"function not found: {signature}")
    end = text.find("\nfunc ", start + len(signature))
    if end < 0:
        end = len(text)
    return text[:start] + transform(text[start:end]) + text[end:]


def guard_active_session(block: str, return_value: str) -> str:
    if "current.Status == SessionCancelled" in block:
        return block
    anchor = (
        "\tcurrent, err := GetForUpdateByOrderID(tx, orderID)\n"
        "\tif err != nil {\n"
        f"\t\treturn {return_value}, err\n"
        "\t}\n"
    )
    replacement = anchor + (
        "\tif current.Status == SessionCancelled {\n"
        f"\t\treturn {return_value}, ErrCancelled\n"
        "\t}\n"
        "\tif current.Status != SessionActive || current.UsedAt != nil {\n"
        f"\t\treturn {return_value}, ErrAlreadyUsed\n"
        "\t}\n"
    )
    if anchor not in block:
        raise RuntimeError("pickup session lock anchor not found")
    block = block.replace(anchor, replacement, 1)
    return block.replace(
        "\tif current.UsedAt != nil {\n"
        f"\t\treturn {return_value}, ErrAlreadyUsed\n"
        "\t}\n",
        "",
        1,
    )


def patch_pickup_service() -> None:
    text = PICKUP_SERVICE.read_text(encoding="utf-8")

    def patch_issue(block: str) -> str:
        if "current.Status == SessionCancelled" not in block:
            block = replace_once(
                block,
                "\t} else {\n\t\tfromJSON = sessionJSON(current)\n",
                "\t} else {\n"
                "\t\tif current.Status == SessionCancelled {\n"
                "\t\t\treturn \"\", nil, ErrCancelled\n"
                "\t\t}\n"
                "\t\tfromJSON = sessionJSON(current)\n",
                "IssueOtp cancellation guard",
            )
        if "status = 'active'" not in block:
            block = replace_once(
                block,
                "\t\t\tSET hashed_otp = $1, expires_at = $2, attempt_count = 0, max_attempts = $3,\n"
                "\t\t\t    used_at = NULL, verified_by_actor_id = NULL, verification_method = NULL,\n"
                "\t\t\t    version = version + 1, updated_at = NOW()",
                "\t\t\tSET hashed_otp = $1, expires_at = $2, attempt_count = 0, max_attempts = $3,\n"
                "\t\t\t    used_at = NULL, verified_by_actor_id = NULL, verification_method = NULL,\n"
                "\t\t\t    status = 'active', cancelled_at = NULL, cancellation_reason = NULL,\n"
                "\t\t\t    version = version + 1, updated_at = NOW()",
                "IssueOtp reset state",
            )
        return block

    text = transform_function(text, "func (s *Service) IssueOtp", patch_issue)

    def patch_verify(block: str) -> str:
        block = guard_active_session(block, "nil")
        if "status = 'verified'" not in block:
            block = replace_once(
                block,
                "\t\tSET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'otp',\n"
                "\t\t    version = version + 1, updated_at = NOW()",
                "\t\tSET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'otp',\n"
                "\t\t    status = 'verified', version = version + 1, updated_at = NOW()",
                "VerifyOtp state",
            )
        return block

    text = transform_function(text, "func (s *Service) VerifyOtp", patch_verify)

    def patch_no_show(block: str) -> str:
        block = guard_active_session(block, "nil")
        if "status = 'no_show'" not in block:
            block = replace_once(
                block,
                "\t\tSET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'no_show',\n"
                "\t\t    version = version + 1, updated_at = NOW()",
                "\t\tSET used_at = NOW(), verified_by_actor_id = $1, verification_method = 'no_show',\n"
                "\t\t    status = 'no_show', version = version + 1, updated_at = NOW()",
                "NoShow state",
            )
        return block

    text = transform_function(text, "func (s *Service) NoShow", patch_no_show)
    text = transform_function(
        text,
        "func (s *Service) ExtendWindow",
        lambda block: guard_active_session(block, "nil"),
    )
    PICKUP_SERVICE.write_text(text, encoding="utf-8")


def patch_pickup_http() -> None:
    text = PICKUP_HTTP.read_text(encoding="utf-8")
    if "PICKUP_CANCELLED" not in text:
        text = replace_once(
            text,
            "\tcase errors.Is(err, pickup.ErrAlreadyUsed):\n"
            "\t\tstore.SendError(w, http.StatusUnprocessableEntity, \"PICKUP_CODE_ALREADY_USED\", err.Error())",
            "\tcase errors.Is(err, pickup.ErrCancelled):\n"
            "\t\tstore.SendError(w, http.StatusConflict, \"PICKUP_CANCELLED\", \"pickup session was cancelled with the order\")\n"
            "\tcase errors.Is(err, pickup.ErrAlreadyUsed):\n"
            "\t\tstore.SendError(w, http.StatusUnprocessableEntity, \"PICKUP_CODE_ALREADY_USED\", err.Error())",
            "pickup cancelled error",
        )
    segment = text[
        text.index("func marshalPickupSession") : text.index(
            "func (s *protectedStoreServer) handlePickupMarkReady"
        )
    ]
    if '"status":' not in segment:
        text = replace_once(
            text,
            '\t\t"verificationMethod": s.VerificationMethod,\n\t\t"version":            s.Version,',
            '\t\t"verificationMethod": s.VerificationMethod,\n'
            '\t\t"status":             s.Status,\n'
            '\t\t"cancelledAt":        s.CancelledAt,\n'
            '\t\t"cancellationReason": s.CancellationReason,\n'
            '\t\t"version":            s.Version,',
            "pickup response state",
        )
    if 'Status: pickup.SessionStatus(r.URL.Query().Get("status"))' not in text:
        text = replace_once(
            text,
            '\t\tStoreID: r.URL.Query().Get("storeId"),\n\t\tLimit:   limit,',
            '\t\tStoreID: r.URL.Query().Get("storeId"),\n'
            '\t\tStatus:  pickup.SessionStatus(r.URL.Query().Get("status")),\n'
            '\t\tLimit:   limit,',
            "pickup list status",
        )
    PICKUP_HTTP.write_text(text, encoding="utf-8")


def patch_dsh_contract() -> None:
    text = DSH_CONTRACT.read_text(encoding="utf-8")
    marker = "    DshPickupSession:\n"
    start = text.find(marker)
    if start < 0:
        raise RuntimeError("DshPickupSession schema not found")
    next_schema = re.search(r"\n    [A-Za-z0-9_]+:\n", text[start + len(marker) :])
    if not next_schema:
        raise RuntimeError("DshPickupSession schema end not found")
    end = start + len(marker) + next_schema.start()
    block = text[start:end]
    if "cancellationReason:" not in block:
        block = replace_once(
            block,
            "        verificationMethod:",
            "        status:\n"
            "          type: string\n"
            "          enum: [active, verified, no_show, consumed, cancelled]\n"
            '        cancelledAt: { type: [string, "null"], format: date-time }\n'
            '        cancellationReason: { type: [string, "null"] }\n'
            "        verificationMethod:",
            "pickup contract lifecycle",
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
        It expires an uncollected session, creates one idempotent refund for captured or COD-collected money,
        or returns no action for an already terminal session.
      tags: [WltPaymentSessions]
      parameters:
        - name: Authorization
          in: header
          required: true
          schema: { type: string, minLength: 1 }
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
            schema:
              $ref: "#/components/schemas/WltGovernedOrderCancellationRequest"
      responses:
        "200":
          description: Financial cancellation decision returned.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WltGovernedOrderCancellationResponse"
        "400":
          $ref: "#/components/responses/BadRequest"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
        "409":
          $ref: "#/components/responses/Conflict"

'''
        text = replace_once(
            text,
            "  /wlt/payment-sessions/{paymentSessionId}/cod-collect:\n",
            path_block + "  /wlt/payment-sessions/{paymentSessionId}/cod-collect:\n",
            "WLT cancellation path",
        )

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
      additionalProperties: false
      required: [action]
      properties:
        action:
          $ref: "#/components/schemas/WltGovernedOrderCancellationAction"
        paymentSession:
          $ref: "#/components/schemas/WltPaymentSession"
        refund:
          $ref: "#/components/schemas/WltRefund"
        sessionStatus:
          type: string

'''
        text = replace_once(
            text,
            "    WltCancelPaymentSessionForOrderRequest:\n",
            schemas + "    WltCancelPaymentSessionForOrderRequest:\n",
            "WLT cancellation schemas",
        )

    WLT_CONTRACT.write_text(text, encoding="utf-8")


def main() -> None:
    patch_pickup_service()
    patch_pickup_http()
    patch_dsh_contract()
    patch_wlt_contract()


if __name__ == "__main__":
    main()
