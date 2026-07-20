from __future__ import annotations

from pathlib import Path

CONTRACT = Path("services/dsh/contracts/dsh.openapi.yaml")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = CONTRACT.read_text(encoding="utf-8")

    if "  /dsh/partner/orders/{orderId}/pickup:\n" not in text:
        path_block = r'''  /dsh/partner/orders/{orderId}/pickup:
    get:
      operationId: getDshPartnerPickupState
      summary: Return the authenticated partner's resumable pickup session stage.
      description: >-
        Reads the sovereign order, pickup session, and durable pickup audit trail.
        Returns cancelled explicitly after order cancellation and never represents
        cancellation as a used or successfully verified pickup.
      tags: [DshPickup]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Resumable pickup state returned.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshPartnerPickupStateResponse" }
        "401": { $ref: "#/components/responses/Unauthenticated" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }
        "422":
          description: The order does not use pickup fulfillment.
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DshErrorResponse" }

'''
        anchor = "  /dsh/partner/orders/{orderId}/pickup/mark-ready:\n"
        text = replace_once(text, anchor, path_block + anchor, "partner pickup state path")

    if "    DshPartnerPickupStage:\n" not in text:
        schemas = r'''    DshPartnerPickupStage:
      type: string
      enum: [not_ready, ready, notified, customer_arrived, verified, no_show, cancelled]
      description: Resumable partner pickup stage derived by DSH from order, session, and audit truth.

    DshPartnerPickupStateResponse:
      type: object
      additionalProperties: false
      required: [session, stage]
      properties:
        session:
          oneOf:
            - $ref: "#/components/schemas/DshPickupSession"
            - type: "null"
        stage: { $ref: "#/components/schemas/DshPartnerPickupStage" }

'''
        anchor = "    DshPickupMutationRequest:\n"
        text = replace_once(text, anchor, schemas + anchor, "partner pickup state schemas")

    CONTRACT.write_text(text, encoding="utf-8")
    Path("tools/scripts/patch-cancellation-pickup-contract.py").unlink(missing_ok=True)
    print("Partner pickup resumable GET contract and explicit cancelled stage added.")


if __name__ == "__main__":
    main()
