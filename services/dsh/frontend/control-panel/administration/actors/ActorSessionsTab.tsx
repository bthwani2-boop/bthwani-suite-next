"use client";

import React, { useState, useEffect } from "react";
import { CpButton, CpStatePanel } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import { listSessions, revokeSession, type SessionInfo } from "../../../shared/identity";

export function ActorSessionsTab(props: { readonly actorId: string }) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSessions(props.actorId);
      setSessions(res);
    } catch (err: any) {
      setError(err?.message || "فشل جلب الجلسات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (props.actorId) {
      void loadSessions();
    }
  }, [props.actorId]);

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm("هل أنت متأكد من إبطال هذه الجلسة؟")) return;
    
    setRevoking(sessionId);
    try {
      await revokeSession(props.actorId, sessionId);
      await loadSessions();
    } catch (err: any) {
      alert(err?.message || "فشل إبطال الجلسة.");
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return <CpStatePanel role="status" title="جاري جلب الجلسات..." />;
  }

  if (error) {
    return (
      <CpStatePanel role="alert" title="خطأ" description={error}>
        <CpButton variant="secondary" onClick={() => void loadSessions()}>إعادة المحاولة</CpButton>
      </CpStatePanel>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", color: "var(--bthwani-control-panel-text-muted)" }}>
        <Text role="bodyMd">لا توجد جلسات نشطة حالياً لهذا المعرف.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Text role="headingSm" style={{ marginBottom: "0.5rem", display: "block" }}>الجلسات النشطة</Text>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {sessions.map(s => (
          <div key={s.sessionId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "8px", background: "var(--bthwani-control-panel-surface-alt)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Text role="bodyMd" style={{ fontWeight: "bold", fontFamily: "monospace" }}>{s.sessionId.substring(0, 16)}...</Text>
              <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>
                السطح (Surface): <span style={{ fontWeight: "bold" }}>{s.surface}</span>
              </Text>
              <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>
                أنشئت في: {new Date(s.createdAt).toLocaleString()}
              </Text>
              <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>
                انتهاء الصلاحية: {new Date(s.accessExpiresAt).toLocaleString()}
              </Text>
            </div>
            <div>
              <CpButton 
                variant="danger"
                onClick={() => handleRevokeSession(s.sessionId)} 
                disabled={revoking === s.sessionId}
              >
                {revoking === s.sessionId ? "جاري الإبطال..." : "إبطال الجلسة"}
              </CpButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
