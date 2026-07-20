from __future__ import annotations

from pathlib import Path

CONTRACT = Path("services/dsh/contracts/dsh.openapi.yaml")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = CONTRACT.read_text(encoding="utf-8")
    if "/dsh/client/orders/{orderId}/cancellation:" in text:
        raise RuntimeError("cancellation contract is already present")

    text = replace_once(
        text,
        "  version: 0.5.0\n",
        "  version: 0.6.0\n",
        "contract version",
    )

    old_status = (
        "    DshOrderStatus:\n"
        "      type: string\n"
        "      enum: [pending, store_accepted, preparing, ready_for_pickup, driver_assigned, driver_arrived_store, picked_up, arrived_customer, delivered, cancelled]\n"
    )
    new_status = (
        "    DshOrderStatus:\n"
        "      type: string\n"
        "      enum:\n"
        "        - pending\n"
        "        - store_accepted\n"
        "        - preparing\n"
        "        - ready_for_pickup\n"
        "        - driver_assigned\n"
        "        - driver_arrived_store\n"
        "        - picked_up\n"
        "        - arrived_customer\n"
        "        - delivered\n"
        "        - cancelled_by_client\n"
        "        - cancelled_by_store\n"
        "        - cancelled_by_operator\n"
        "        - cancelled_no_driver\n"
        "        - failed_payment\n"
        "        - failed_dispatch\n"
        "      description: Explicit operational terminal states; the ambiguous legacy `cancelled` value is forbidden.\n"
        "\n"
        "    DshFinancialClosureStatus:\n"
        "      type: string\n"
        "      enum: [not_required, pending, session_expired, refund_requested, refund_completed, no_action, failed]\n"
        "      description: DSH projection of the WLT-owned financial closure decision.\n"
    )
    text = replace_once(text, old_status, new_status, "order status schema")

    old_order_properties = (
        "        rejectionReason: { type: string }\n"
        "        wltPaymentRefId:\n"
    )
    new_order_properties = (
        "        rejectionReason: { type: string }\n"
        "        cancellationReasonCode: { type: [string, \"null\"] }\n"
        "        cancellationNote: { type: [string, \"null\"] }\n"
        "        cancelledByActorId: { type: [string, \"null\"] }\n"
        "        cancelledByRole:\n"
        "          type: [string, \"null\"]\n"
        "          enum: [client, partner, operator, system, null]\n"
        "        cancelledAt: { type: [string, \"null\"], format: date-time }\n"
        "        financialClosureStatus: { $ref: \"#/components/schemas/DshFinancialClosureStatus\" }\n"
        "        financialClosureReference: { type: [string, \"null\"] }\n"
        "        wltPaymentRefId:\n"
    )
    text = replace_once(text, old_order_properties, new_order_properties, "order cancellation fields")

    text = replace_once(
        text,
        "      enum: [offered, accepted, declined, completed]\n",
        "      enum: [offered, accepted, declined, completed, cancelled]\n",
        "assignment status",
    )
    text = replace_once(
        text,
        "      enum: [assigned, driver_assigned, driver_arrived_store, picked_up, arrived_customer, delivered]\n",
        "      enum: [assigned, driver_assigned, driver_arrived_store, picked_up, arrived_customer, delivered, cancelled]\n",
        "delivery status",
    )

    schemas = r'''
    # ─── Order cancellation and refund closure schemas ─────────────────
    DshOrderCancellationReasonCode:
      type: string
      enum:
        - changed_mind
        - duplicate_order
        - address_error
        - payment_issue
        - excessive_delay
        - out_of_stock
        - store_closed
        - capacity
        - pricing_issue
        - cannot_fulfill
        - customer_request
        - partner_request
        - no_driver
        - fraud_risk
        - safety
        - operational_failure
        - other

    DshOrderCancellationRequest:
      type: object
      additionalProperties: false
      required: [reasonCode, commandId]
      properties:
        reasonCode: { $ref: "#/components/schemas/DshOrderCancellationReasonCode" }
        reasonNote:
          type: string
          maxLength: 1000
          description: Required when reasonCode is `other`; otherwise optional operational context.
        commandId:
          type: string
          minLength: 1
          description: Idempotent command identifier.
        correlationId:
          type: string
          description: Cross-service correlation identifier; defaults to commandId.

    DshOrderCancellation:
      type: object
      required:
        - id
        - orderId
        - actorId
        - actorRole
        - reasonCode
        - reasonNote
        - fromStatus
        - toStatus
        - financialClosureStatus
        - financialReference
        - financialResultAction
        - financialFailure
        - createdAt
        - updatedAt
      properties:
        id: { type: string }
        orderId: { type: string }
        actorId: { type: string }
        actorRole:
          type: string
          enum: [client, partner, operator, system]
        reasonCode: { $ref: "#/components/schemas/DshOrderCancellationReasonCode" }
        reasonNote: { type: string }
        fromStatus: { type: string }
        toStatus: { $ref: "#/components/schemas/DshOrderStatus" }
        financialClosureStatus: { $ref: "#/components/schemas/DshFinancialClosureStatus" }
        financialReference: { type: string }
        financialResultAction:
          type: string
          enum: [expired, refund_requested, none, ""]
        financialFailure: { type: string }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    DshOrderCancellationResponse:
      type: object
      required: [cancellation]
      properties:
        cancellation: { $ref: "#/components/schemas/DshOrderCancellation" }

    DshCancelOrderResponse:
      type: object
      required: [order, cancellation]
      properties:
        order: { $ref: "#/components/schemas/DshOrder" }
        cancellation: { $ref: "#/components/schemas/DshOrderCancellation" }

'''
    text = replace_once(
        text,
        "    # ─── Dispatch schemas ───────────────────────────────────────────\n",
        schemas + "    # ─── Dispatch schemas ───────────────────────────────────────────\n",
        "cancellation schemas insertion",
    )

    paths = r'''
  /dsh/client/orders/{orderId}/cancel:
    post:
      operationId: cancelDshClientOrder
      summary: Cancel an authenticated client's early-stage order and start governed WLT closure.
      tags: [DshOrders]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/DshOrderCancellationRequest" }
      responses:
        "200":
          description: Order cancelled and financial closure queued or not required.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshCancelOrderResponse" }
        "400": { $ref: "#/components/responses/InvalidRequest" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409":
          description: Order state requires operator review or no longer permits direct client cancellation.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshErrorResponse" }

  /dsh/client/orders/{orderId}/cancellation:
    get:
      operationId: getDshClientOrderCancellation
      summary: Return the client's cancellation and WLT financial-closure projection.
      tags: [DshOrders]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Cancellation projection returned.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshOrderCancellationResponse" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }

  /dsh/partner/orders/{orderId}/cancel:
    post:
      operationId: cancelDshPartnerOrder
      summary: Cancel a partner-owned order using a structured operational reason.
      tags: [DshPartnerOrders]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/DshOrderCancellationRequest" }
      responses:
        "200":
          description: Order cancelled and financial closure queued or not required.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshCancelOrderResponse" }
        "400": { $ref: "#/components/responses/InvalidRequest" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409":
          description: Order state does not allow partner cancellation.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshErrorResponse" }

  /dsh/partner/orders/{orderId}/cancellation:
    get:
      operationId: getDshPartnerOrderCancellation
      summary: Return the partner-scoped cancellation and WLT closure projection.
      tags: [DshPartnerOrders]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Cancellation projection returned.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshOrderCancellationResponse" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }

  /dsh/operator/orders/{orderId}/cancellation:
    get:
      operationId: getDshOperatorOrderCancellation
      summary: Return cancellation, refund reference and financial delivery failure for operations.
      tags: [DshOperatorOrders]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Cancellation projection returned.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshOrderCancellationResponse" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }
    post:
      operationId: cancelDshOperatorOrderGoverned
      summary: Cancel an order after operational review and stop all dependent work atomically.
      tags: [DshOperatorOrders]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/DshOrderCancellationRequest" }
      responses:
        "200":
          description: Order cancelled and WLT closure queued or not required.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshCancelOrderResponse" }
        "400": { $ref: "#/components/responses/InvalidRequest" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409":
          description: Order is already terminal or cannot be cancelled from its current state.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshErrorResponse" }

'''
    text = replace_once(text, "\ncomponents:\n", "\n" + paths + "components:\n", "paths insertion")

    CONTRACT.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
