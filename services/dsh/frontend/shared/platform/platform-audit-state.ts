// Canonical location: dsh/frontend/shared/view-models/control-panel/platform/platform-audit-state.ts
// Authority: dsh/frontend/shared — moved from control-panel/platform/usePlatformAuditState.tsx
// Note: Uses React context — kept as .ts (no JSX in this file directly).

import { useState, createContext, useContext } from 'react';

export type AuditEvent = {
  id: string;
  action: string;
  operator: string;
  timestamp: string;
  status: 'success' | 'warning' | 'danger' | 'blocked';
  oldValue: string;
  newValue: string;
  reason: string;
  scope: string;
  impact: string;
  rollbackAvailable: boolean;
};

export function usePlatformAuditStateHook() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const addAuditEvent = (event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
    const newEvent: AuditEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: 'الآن',
    };
    setAuditEvents((prev) => [newEvent, ...prev]);
  };

  const rollbackEvent = (id: string) => {
    setAuditEvents((prev) =>
      prev.map(evt =>
        evt.id === id
          ? { ...evt, rollbackAvailable: false, action: `[تم الاسترداد] ${evt.action}` }
          : evt
      )
    );
    const original = auditEvents.find(e => e.id === id);
    if (original) {
      addAuditEvent({
        action: `استرداد عن: ${original.action}`,
        operator: 'operator',
        status: 'warning',
        oldValue: original.newValue,
        newValue: original.oldValue,
        reason: 'تم الاسترداد لعودة خطة للحالة السابقة للتحقق.',
        scope: original.scope,
        impact: 'عودة للحالة السابقة وتعديل السياسة السابقة',
        rollbackAvailable: false,
      });
    }
  };

  return {
    auditEvents,
    addAuditEvent,
    rollbackEvent,
  };
}

type PlatformAuditState = ReturnType<typeof usePlatformAuditStateHook>;
export const PlatformAuditContext = createContext<PlatformAuditState | null>(null);

export function usePlatformAuditState() {
  const ctx = useContext(PlatformAuditContext);
  if (!ctx) throw new Error('Missing PlatformAuditProvider');
  return ctx;
}
