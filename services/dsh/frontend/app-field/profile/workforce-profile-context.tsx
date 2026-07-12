// app-field — workforce profile context
// Holds the sovereign provider profile fetched from GET /workforce/me after
// authentication. Screens read the real profile from here — never from
// identity.subject.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchWorkforceMe, updateWorkforceMeSelf } from '../../shared/workforce/workforce-me.api';
import type { WorkforceMeResult } from '../../shared/workforce/workforce-me.api';
import type { UpdateSelfInput, WorkforceMe } from '../../shared/workforce/workforce.types';

export type WorkforceProfileState =
  | { kind: 'loading' }
  | { kind: 'not_provisioned' }
  | { kind: 'suspended' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; me: WorkforceMe };

type WorkforceProfileContextValue = {
  readonly state: WorkforceProfileState;
  readonly reload: () => Promise<void>;
  readonly updateSelf: (input: UpdateSelfInput) => Promise<WorkforceMeResult>;
};

const WorkforceProfileContext = createContext<WorkforceProfileContextValue | null>(null);

function toState(result: WorkforceMeResult): WorkforceProfileState {
  switch (result.kind) {
    case 'ok':
      return { kind: 'ready', me: result.me };
    case 'not_provisioned':
      return { kind: 'not_provisioned' };
    case 'suspended':
      return { kind: 'suspended' };
    case 'unauthenticated':
      // The identity session store handles auth expiry; surface as an error
      // with a retry rather than a hard block.
      return { kind: 'error', message: 'انتهت الجلسة أو تعذر التحقق منها — أعد المحاولة' };
    case 'error':
      return { kind: 'error', message: result.message };
  }
}

export function WorkforceProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkforceProfileState>({ kind: 'loading' });

  const reload = useCallback(async () => {
    setState({ kind: 'loading' });
    setState(toState(await fetchWorkforceMe()));
  }, []);

  const updateSelf = useCallback(async (input: UpdateSelfInput) => {
    const result = await updateWorkforceMeSelf(input);
    if (result.kind === 'ok') {
      setState({ kind: 'ready', me: result.me });
    }
    return result;
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <WorkforceProfileContext.Provider value={{ state, reload, updateSelf }}>
      {children}
    </WorkforceProfileContext.Provider>
  );
}

export function useWorkforceProfile(): WorkforceProfileContextValue {
  const value = useContext(WorkforceProfileContext);
  if (!value) {
    throw new Error('useWorkforceProfile must be used inside WorkforceProfileProvider');
  }
  return value;
}

/** Convenience accessor: the ready profile or null while not ready. */
export function useWorkforceMeOrNull(): WorkforceMe | null {
  const { state } = useWorkforceProfile();
  return state.kind === 'ready' ? state.me : null;
}
