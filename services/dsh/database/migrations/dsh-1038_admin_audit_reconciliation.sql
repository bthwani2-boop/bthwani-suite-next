-- DSH-1038: reconcile the governed administration audit ledger.
--
-- Historical request and review transactions could commit even when the
-- append-only audit insert failed. Reconstruct only the missing lifecycle
-- events from the canonical DSH maker/checker rows. No reason, review note,
-- actor target, or permission payload is copied into the audit detail.

BEGIN;

INSERT INTO dsh_admin_audit
  (actor_id, action, target_id, detail, sensitivity, correlation_id)
SELECT
  request.requested_by,
  'ROLE_ASSIGNMENT_REQUESTED',
  request.id::text,
  'Reconciled historical governed role-assignment request',
  'restricted',
  request.id::text
FROM dsh_admin_approval_requests AS request
WHERE NOT EXISTS (
  SELECT 1
  FROM dsh_admin_audit AS audit
  WHERE audit.action = 'ROLE_ASSIGNMENT_REQUESTED'
    AND audit.correlation_id = request.id::text
);

INSERT INTO dsh_admin_audit
  (actor_id, action, target_id, detail, sensitivity, correlation_id)
SELECT
  request.reviewed_by,
  CASE request.status
    WHEN 'approved' THEN 'ROLE_ASSIGNMENT_APPROVED'
    ELSE 'ROLE_ASSIGNMENT_REJECTED'
  END,
  request.id::text,
  'Reconciled historical governed role-assignment review',
  'restricted',
  request.id::text
FROM dsh_admin_approval_requests AS request
WHERE request.status IN ('approved', 'rejected')
  AND request.reviewed_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM dsh_admin_audit AS audit
    WHERE audit.action = CASE request.status
      WHEN 'approved' THEN 'ROLE_ASSIGNMENT_APPROVED'
      ELSE 'ROLE_ASSIGNMENT_REJECTED'
    END
      AND audit.correlation_id = request.id::text
  );

INSERT INTO dsh_admin_audit
  (actor_id, action, target_id, detail, sensitivity, correlation_id)
SELECT
  request.requested_by,
  'ROLE_DEFINITION_REQUESTED',
  request.id::text,
  'Reconciled historical governed role-definition request',
  'restricted',
  request.id::text
FROM dsh_admin_role_definition_requests AS request
WHERE NOT EXISTS (
  SELECT 1
  FROM dsh_admin_audit AS audit
  WHERE audit.action = 'ROLE_DEFINITION_REQUESTED'
    AND audit.correlation_id = request.id::text
);

INSERT INTO dsh_admin_audit
  (actor_id, action, target_id, detail, sensitivity, correlation_id)
SELECT
  request.reviewed_by,
  CASE request.status
    WHEN 'approved' THEN 'ROLE_DEFINITION_APPROVED'
    ELSE 'ROLE_DEFINITION_REJECTED'
  END,
  request.id::text,
  'Reconciled historical governed role-definition review',
  'restricted',
  request.id::text
FROM dsh_admin_role_definition_requests AS request
WHERE request.status IN ('approved', 'rejected')
  AND request.reviewed_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM dsh_admin_audit AS audit
    WHERE audit.action = CASE request.status
      WHEN 'approved' THEN 'ROLE_DEFINITION_APPROVED'
      ELSE 'ROLE_DEFINITION_REJECTED'
    END
      AND audit.correlation_id = request.id::text
  );

INSERT INTO dsh_admin_audit
  (actor_id, action, target_id, detail, sensitivity, correlation_id)
SELECT
  request.requested_by,
  'ROLLBACK_REQUESTED',
  request.id::text,
  'Reconciled historical governed rollback request',
  'restricted',
  request.id::text
FROM dsh_admin_rollback_requests AS request
WHERE NOT EXISTS (
  SELECT 1
  FROM dsh_admin_audit AS audit
  WHERE audit.action = 'ROLLBACK_REQUESTED'
    AND audit.correlation_id = request.id::text
);

INSERT INTO dsh_admin_audit
  (actor_id, action, target_id, detail, sensitivity, correlation_id)
SELECT
  request.reviewed_by,
  CASE request.status
    WHEN 'approved' THEN 'ROLLBACK_APPROVED'
    ELSE 'ROLLBACK_REJECTED'
  END,
  request.id::text,
  'Reconciled historical governed rollback review',
  'restricted',
  request.id::text
FROM dsh_admin_rollback_requests AS request
WHERE request.status IN ('approved', 'rejected')
  AND request.reviewed_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM dsh_admin_audit AS audit
    WHERE audit.action = CASE request.status
      WHEN 'approved' THEN 'ROLLBACK_APPROVED'
      ELSE 'ROLLBACK_REJECTED'
    END
      AND audit.correlation_id = request.id::text
  );

COMMIT;
