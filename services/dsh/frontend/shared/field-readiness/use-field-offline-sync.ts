/**
 * useFieldOfflineSync
 *
 * Drains the authenticated, account-scoped field queue on mount and
 * connectivity recovery. Queue-level failures are surfaced to the field
 * surface instead of becoming unhandled promises or discarding work.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { subscribeBthwaniConnectivity } from "@bthwani/data-runtime/native-data-adapters";
import {
  configureFieldOfflineQueueScope,
  prepareFieldOfflineQueue,
  getDueOperations,
  getUnknownOperations,
  markOperationSynced,
  markOperationUnknown,
  markOperationReadyForRetry,
  markOperationFailed,
  purgeSyncedOperations,
  evacuateTerminalOperations,
  recoverCorruptFieldOfflineQueue,
  type FieldOfflineQueueScope,
  type FieldOfflineOperationType,
  type FieldOfflineOperation,
} from "./field-offline-queue";
import {
  classifyGovernedError,
  createGovernedProblem,
  type GovernedProblem,
} from "../_kernel/governed-problem";

export type FieldOfflineExecutorMap = Partial<
  Record<FieldOfflineOperationType, (op: FieldOfflineOperation) => Promise<void>>
>;

export type FieldOfflineReconcilerMap = Partial<
  Record<FieldOfflineOperationType, (op: FieldOfflineOperation) => Promise<boolean>>
>;

export type FieldOfflineSyncState =
  | { readonly kind: "idle" }
  | { readonly kind: "syncing" }
  | { readonly kind: "ready" }
  | {
      readonly kind: "error";
      readonly message: string;
      /** Carries the reason code so callers never branch on message text. */
      readonly problem: GovernedProblem;
    };

export type FieldOfflineSyncController = {
  readonly state: FieldOfflineSyncState;
  readonly retry: () => void;
  readonly recover: () => void;
  /**
   * Work carried over from a retired queue generation that this build cannot
   * execute (unscoped v1, another actor, or a retired operation). It is
   * preserved for recovery, so the surface must report it rather than let the
   * worker believe the capture succeeded.
   */
  readonly quarantinedCount: number;
};

function queueErrorState(error: unknown): FieldOfflineSyncState {
  const problem = classifyGovernedError(error);
  return { kind: "error", message: problem.message, problem };
}

export function useFieldOfflineSync(
  executors: FieldOfflineExecutorMap | undefined,
  scope: FieldOfflineQueueScope | undefined,
  reconcilers: FieldOfflineReconcilerMap | undefined,
): FieldOfflineSyncController {
  const executorsRef = useRef(executors);
  executorsRef.current = executors;
  const reconcilersRef = useRef(reconcilers);
  reconcilersRef.current = reconcilers;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const syncRef = useRef(false);
  const [state, setState] = useState<FieldOfflineSyncState>({ kind: "idle" });
  const [quarantinedCount, setQuarantinedCount] = useState(0);

  const drainQueue = useCallback(async () => {
    const currentScope = scopeRef.current;
    if (syncRef.current || !executorsRef.current || !currentScope) return;
    configureFieldOfflineQueueScope(currentScope);
    syncRef.current = true;
    setState({ kind: "syncing" });
    let reconciliationError: unknown;
    try {
      const migration = await prepareFieldOfflineQueue();
      if (migration.quarantined > 0) setQuarantinedCount(migration.quarantined);
      for (const operation of await getUnknownOperations()) {
        const reconciler = reconcilersRef.current?.[operation.operationType];
        if (!reconciler) {
          reconciliationError = createGovernedProblem(
            "UNKNOWN_RESULT_RECONCILIATION_REQUIRED",
            "توجد عملية محفوظة بنتيجة غير محسومة، ولا يمكن إعادة تنفيذها قبل قراءة النتيجة المعتمدة.",
            { kind: "conflict", retryable: true, nextAction: "refresh_record" },
          );
          continue;
        }
        try {
          if (await reconciler(operation)) {
            await markOperationSynced(operation.operationId);
          } else {
            await markOperationReadyForRetry(operation.operationId);
          }
        } catch (error) {
          reconciliationError = error;
        }
      }
      const due = await getDueOperations();
      for (const operation of due) {
        const executor = executorsRef.current?.[operation.operationType];
        if (!executor) {
          await markOperationFailed(
            operation.operationId,
            `unsupported field offline operation: ${operation.operationType}`,
          );
          continue;
        }
        try {
          await executor(operation);
          await markOperationSynced(operation.operationId);
        } catch (error) {
          const problem = classifyGovernedError(error);
          if (problem.kind === "offline") {
            await markOperationUnknown(operation.operationId, problem.message);
            const reconciler = reconcilersRef.current?.[operation.operationType];
            if (!reconciler) {
              reconciliationError = createGovernedProblem(
                "UNKNOWN_RESULT_RECONCILIATION_REQUIRED",
                "تعذر تحديد نتيجة العملية، ولا يمكن إعادة تنفيذها قبل قراءة النتيجة المعتمدة.",
                { kind: "conflict", retryable: true, nextAction: "refresh_record" },
              );
              continue;
            }
            try {
              if (await reconciler(operation)) {
                await markOperationSynced(operation.operationId);
              } else {
                await markOperationReadyForRetry(operation.operationId);
              }
            } catch (reconciliationFailure) {
              reconciliationError = reconciliationFailure;
            }
            continue;
          }
          await markOperationFailed(operation.operationId, problem.message, !problem.retryable);
        }
      }
      await purgeSyncedOperations();
      const evacuated = await evacuateTerminalOperations();
      if (evacuated > 0) setQuarantinedCount((current) => current + evacuated);
      if (reconciliationError) setState(queueErrorState(reconciliationError));
      else setState({ kind: "ready" });
    } catch (error) {
      setState(queueErrorState(error));
    } finally {
      syncRef.current = false;
    }
  }, []);

  const retry = useCallback(() => {
    void drainQueue();
  }, [drainQueue]);

  const recover = useCallback(() => {
    const currentScope = scopeRef.current;
    if (!currentScope) return;
    configureFieldOfflineQueueScope(currentScope);
    void recoverCorruptFieldOfflineQueue()
      .then(drainQueue)
      .catch((error: unknown) => {
        setState(queueErrorState(error));
      });
  }, [drainQueue]);

  const scopeKey = scope ? `${scope.actorId}:${scope.installationId}` : "signed-out";
  useEffect(() => {
    const currentScope = scopeRef.current;
    configureFieldOfflineQueueScope(currentScope ?? null);
    if (!currentScope) {
      setState({ kind: "idle" });
      return undefined;
    }

    void drainQueue();
    const unsubscribe = subscribeBthwaniConnectivity((networkState) => {
      if (networkState.isConnected && networkState.isInternetReachable) {
        void drainQueue();
      }
    });
    return () => unsubscribe();
  }, [drainQueue, scopeKey]);

  return { state, retry, recover, quarantinedCount };
}
