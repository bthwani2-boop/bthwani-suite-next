"use client";

import React, { useState, useEffect } from "react";
import { CpButton, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { EditorPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import { searchActors, type ActorSummary } from "../../../shared/identity";

export function ActorsListView(props: {
  readonly onCreateNew?: () => void;
  readonly onSelectActor?: (actor: ActorSummary) => void;
  readonly inline?: boolean;
}) {
  const [role, setRole] = useState("");
  const [actors, setActors] = useState<ActorSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchActors({
        role: role.trim() || undefined,
        limit: 50,
      });
      setActors(res.actors || []);
    } catch (err: any) {
      setError(err?.message || "تعذر جلب الهويات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActors();
  }, []);

  const body = (
    <div style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", fontWeight: "600", color: "var(--bthwani-control-panel-text-muted)" }}>الدور (Role)</Text>
            <CpTextInput value={role} onChange={setRole} placeholder="مثال: captain" aria-label="بحث حسب الدور" />
          </div>
          <CpButton variant="secondary" onClick={() => void loadActors()} disabled={loading}>
            {loading ? "جاري البحث..." : "بحث"}
          </CpButton>
        </div>
        {props.onCreateNew && (
          <CpButton variant="primary" onClick={props.onCreateNew}>
            إنشاء هوية جديدة
          </CpButton>
        )}
      </div>

      {error ? (
        <CpStatePanel role="alert" title="حدث خطأ" description={error} />
      ) : null}

      <div style={{ backgroundColor: "var(--bthwani-control-panel-surface)", border: "1px solid var(--bthwani-control-panel-border)", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ backgroundColor: "var(--bthwani-control-panel-surface-muted)", borderBottom: "1px solid var(--bthwani-control-panel-border)" }}>
            <tr>
              <th style={{ padding: "12px 16px" }}><Text role="bodySm" style={{ fontWeight: "700" }}>Actor ID</Text></th>
              <th style={{ padding: "12px 16px" }}><Text role="bodySm" style={{ fontWeight: "700" }}>Username</Text></th>
              <th style={{ padding: "12px 16px" }}><Text role="bodySm" style={{ fontWeight: "700" }}>Phone (E.164)</Text></th>
              <th style={{ padding: "12px 16px" }}><Text role="bodySm" style={{ fontWeight: "700" }}>Role</Text></th>
              <th style={{ padding: "12px 16px" }}><Text role="bodySm" style={{ fontWeight: "700" }}>Status</Text></th>
              <th style={{ padding: "12px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {actors.map((actor) => (
              <tr key={actor.actorId} style={{ borderBottom: "1px solid var(--bthwani-control-panel-border)" }}>
                <td style={{ padding: "12px 16px" }}><Text role="bodyMd">{actor.actorId}</Text></td>
                <td style={{ padding: "12px 16px" }}><Text role="bodyMd">{actor.username}</Text></td>
                <td style={{ padding: "12px 16px" }}><Text role="bodyMd">{actor.phoneE164 || "-"}</Text></td>
                <td style={{ padding: "12px 16px" }}><Text role="bodyMd">{actor.role}</Text></td>
                <td style={{ padding: "12px 16px" }}><Text role="bodyMd">{actor.status}</Text></td>
                <td style={{ padding: "12px 16px", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <CpButton variant="secondary" onClick={() => navigator.clipboard.writeText(actor.actorId)}>نسخ المعرّف</CpButton>
                  {props.onSelectActor && (
                    <CpButton variant="secondary" onClick={() => props.onSelectActor?.(actor)}>إدارة</CpButton>
                  )}
                </td>
              </tr>
            ))}
            {actors.length === 0 && !loading && !error && (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center" }}>
                  <Text role="bodyMd" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>لا توجد هويات مطابقة للبحث.</Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (props.inline) {
    return body;
  }
  return (
    <EditorPageFrame
      title="إدارة الهويات (Actors)"
      header={<CpPageHeader title="إدارة الهويات (Actors)" />}
    >
      <div style={{ padding: "2rem" }}>{body}</div>
    </EditorPageFrame>
  );
}
