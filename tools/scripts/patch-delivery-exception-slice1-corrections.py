from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def patch(path: str, old: str, new: str, label: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"{label}: anchor not found")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


patch(
    "services/dsh/database/migrations/dsh-092_delivery_exception_lifecycle.sql",
    """    CONSTRAINT dsh_delivery_exceptions_location_pair_check CHECK (\n        (reported_latitude IS NULL AND reported_longitude IS NULL) OR\n        (reported_latitude BETWEEN -90 AND 90 AND reported_longitude BETWEEN -180 AND 180)\n    ),""",
    """    CONSTRAINT dsh_delivery_exceptions_location_pair_check CHECK (\n        (reported_latitude IS NULL) = (reported_longitude IS NULL)\n        AND (reported_latitude IS NULL OR (\n            reported_latitude BETWEEN -90 AND 90\n            AND reported_longitude BETWEEN -180 AND 180\n        ))\n    ),""",
    "strict location pair",
)

patch(
    "services/dsh/backend/internal/dispatch/delivery_exceptions.go",
    """\tif current.OrderID == \"\" {\n\t\treturn nil, fmt.Errorf(\"%w: delivery exceptions require an order-backed assignment\", ErrConflict)\n\t}\n\tif current.Status != AssignmentAccepted || !reportableDeliveryStatuses[current.Delivery.Status] {\n\t\treturn nil, fmt.Errorf(\"%w: delivery exception requires an active accepted delivery\", ErrConflict)\n\t}\n\n\tvar tenantID string\n\tif err := tx.QueryRow(`SELECT tenant_id FROM dsh_orders WHERE id=$1::uuid FOR UPDATE`, current.OrderID).Scan(&tenantID); err != nil {\n\t\tif errors.Is(err, sql.ErrNoRows) {\n\t\t\treturn nil, ErrNotFound\n\t\t}\n\t\treturn nil, err\n\t}\n\n\texisting, err := getDeliveryExceptionByCorrelationTx(tx, tenantID, input.CorrelationID)\n\tif err == nil {\n\t\tif existing.AssignmentID != assignmentID || existing.CaptainID != captainID || existing.ReasonCode != input.ReasonCode {\n\t\t\treturn nil, fmt.Errorf(\"%w: correlationId already belongs to a different exception command\", ErrConflict)\n\t\t}\n\t\treturn existing, nil\n\t}\n\tif !errors.Is(err, sql.ErrNoRows) {\n\t\treturn nil, err\n\t}\n""",
    """\tif current.OrderID == \"\" {\n\t\treturn nil, fmt.Errorf(\"%w: delivery exceptions require an order-backed assignment\", ErrConflict)\n\t}\n\n\tvar tenantID string\n\tif err := tx.QueryRow(`SELECT tenant_id FROM dsh_orders WHERE id=$1::uuid FOR UPDATE`, current.OrderID).Scan(&tenantID); err != nil {\n\t\tif errors.Is(err, sql.ErrNoRows) {\n\t\t\treturn nil, ErrNotFound\n\t\t}\n\t\treturn nil, err\n\t}\n\n\t// Idempotency is evaluated before current-state eligibility so a retried\n\t// command returns its original result even after operations has moved the\n\t// assignment or resolved the exception.\n\texisting, err := getDeliveryExceptionByCorrelationTx(tx, tenantID, input.CorrelationID)\n\tif err == nil {\n\t\tif existing.AssignmentID != assignmentID || existing.CaptainID != captainID || existing.ReasonCode != input.ReasonCode {\n\t\t\treturn nil, fmt.Errorf(\"%w: correlationId already belongs to a different exception command\", ErrConflict)\n\t\t}\n\t\treturn existing, nil\n\t}\n\tif !errors.Is(err, sql.ErrNoRows) {\n\t\treturn nil, err\n\t}\n\n\tif current.Status != AssignmentAccepted || !reportableDeliveryStatuses[current.Delivery.Status] {\n\t\treturn nil, fmt.Errorf(\"%w: delivery exception requires an active accepted delivery\", ErrConflict)\n\t}\n""",
    "idempotency before eligibility",
)

patch(
    "services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts",
    "correlationId: globalThis.crypto?.randomUUID?.() ?? `${assignmentId}-${Date.now()}`,",
    "correlationId: `${assignmentId}-${Date.now()}-${Math.random().toString(36).slice(2)}` ,",
    "portable correlation id",
)

print("Delivery exception slice-one hardening corrections applied.")
