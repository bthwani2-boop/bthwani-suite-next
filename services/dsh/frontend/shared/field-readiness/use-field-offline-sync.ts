/**
 * useFieldOfflineSync
 *
 * React hook that drains the field offline queue whenever network
 * connectivity is restored. Integrates with @react-native-community/netinfo.
 *
 * Usage: mount once at the root of the field app surface.
 *
 * The hook accepts an `executor` map — a record of operationType →
 * async function that performs the actual API call. Pass `undefined` to skip
 * sync (e.g. during unauthenticated state).
 */

import { useEffect, useRef, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  getDueOperations,
  markOperationSynced,
  markOperationFailed,
  purgeSyncedOperations,
  type FieldOfflineOperationType,
  type FieldOfflineOperation,
} from "./field-offline-queue";

// ─── Executor type ────────────────────────────────────────────────────────────

export type FieldOfflineExecutorMap = Partial<
  Record<FieldOfflineOperationType, (op: FieldOfflineOperation) => Promise<void>>
>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFieldOfflineSync(executors: FieldOfflineExecutorMap | undefined): void {
  const executorsRef = useRef(executors);
  executorsRef.current = executors;

  const syncRef = useRef(false);

  const drainQueue = useCallback(async () => {
    if (syncRef.current) return; // prevent concurrent drains
    if (!executorsRef.current) return;
    syncRef.current = true;
    try {
      const due = await getDueOperations();
      for (const op of due) {
        const executor = executorsRef.current?.[op.operationType];
        if (!executor) continue;
        try {
          await executor(op);
          await markOperationSynced(op.operationId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await markOperationFailed(op.operationId, message);
        }
      }
      await purgeSyncedOperations();
    } finally {
      syncRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Drain on mount in case operations accumulated while offline.
    void drainQueue();

    // Drain whenever connectivity is restored.
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        void drainQueue();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [drainQueue]);
}
