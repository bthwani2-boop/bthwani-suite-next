/**
 * useFieldOfflineSync
 *
 * Drains the authenticated field queue on mount and connectivity recovery.
 * Queue-level failures are surfaced to the field surface instead of becoming
 * unhandled promises or silently discarding unsynced work.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  getDueOperations,
  markOperationSynced,
  markOperationFailed,
  purgeSyncedOperations,
  recoverCorruptFieldOfflineQueue,
  type FieldOfflineOperationType,
  type FieldOfflineOperation,
} from "./field-offline-queue";

export type FieldOfflineExecutorMap = Partial<
  Record<FieldOfflineOperationType, (op: FieldOfflineOperation) => Promise<void>>
>;

export type FieldOfflineSyncState =
  | { readonly kind: "idle" }
  | { readonly kind: "syncing" }
  | { readonly kind: "ready" }
  | { readonly kind: "error"; readonly message: string };

export type FieldOfflineSyncController = {
  readonly state: FieldOfflineSyncState;
  readonly retry: () => void;
  readonly recover: () => void;
};

export function useFieldOfflineSync(
  executors: FieldOfflineExecutorMap | undefined,
): FieldOfflineSyncController {
  const executorsRef = useRef(executors);
  executorsRef.current = executors;
  const syncRef = useRef(false);
  const [state, setState] = useState<FieldOfflineSyncState>({ kind: "idle" });

  const drainQueue = useCallback(async () => {
    if (syncRef.current || !executorsRef.current) return;
    syncRef.current = true;
    setState({ kind: "syncing" });
    try {
      const due = await getDueOperations();
      for (const operation of due) {
        const executor = executorsRef.current?.[operation.operationType];
        if (!executor) continue;
        try {
          await executor(operation);
          await markOperationSynced(operation.operationId);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await markOperationFailed(operation.operationId, message);
        }
      }
      await purgeSyncedOperations();
      setState({ kind: "ready" });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      syncRef.current = false;
    }
  }, []);

  const retry = useCallback(() => {
    void drainQueue();
  }, [drainQueue]);

  const recover = useCallback(() => {
    void recoverCorruptFieldOfflineQueue()
      .then(drainQueue)
      .catch((error: unknown) => {
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }, [drainQueue]);

  useEffect(() => {
    void drainQueue();
    const unsubscribe = NetInfo.addEventListener((networkState) => {
      if (networkState.isConnected && networkState.isInternetReachable) {
        void drainQueue();
      }
    });
    return () => unsubscribe();
  }, [drainQueue]);

  return { state, retry, recover };
}
