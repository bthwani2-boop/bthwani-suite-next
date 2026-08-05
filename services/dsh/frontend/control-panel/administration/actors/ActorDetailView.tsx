"use client";

import React, { useState, useEffect } from "react";
import { CpButton, CpPageHeader, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import { getActor, suspendActor, reactivateActor, revokeActorSessions, type ActorSummary } from "../../../shared/identity";
import { ActorActivationTab } from "./ActorActivationTab";
import { ActorSessionsTab } from "./ActorSessionsTab";
import { ActorCommercialProfileTab } from "./ActorCommercialProfileTab";

export function ActorDetailView(props: {
  readonly actorId: string;
  readonly onBack?: () => void;
}) {
  const [actor, setActor] = useState<ActorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadActor = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getActor(props.actorId);
      setActor(res);
    } catch (err: any) {
      setError(err?.message || "تعذر جلب تفاصيل الهوية.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (props.actorId) {
      void loadActor();
    }
  }, [props.actorId]);

  const handleAction = async (action: "suspend" | "reactivate" | "revoke") => {
    if (!reason.trim()) {
      alert("الرجاء إدخال سبب الإجراء.");
      return;
    }
    setActionLoading(true);
    try {
      if (action === "suspend") {
        await suspendActor(props.actorId, reason);
      } else if (action === "reactivate") {
        await reactivateActor(props.actorId, reason);
      } else if (action === "revoke") {
        await revokeActorSessions(props.actorId, reason);
      }
      setReason("");
      await loadActor(); // reload actor state
    } catch (err: any) {
      alert(err?.message || "فشل تنفيذ الإجراء.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <CpStatePanel state="loading" title="جاري التحميل..." />;
  }

  if (error || !actor) {
    return <CpStatePanel state="error" title="خطأ" description={error || "لم يتم العثور على الهوية"} action={{ label: "رجوع", onClick: () => props.onBack?.() }} />;
  }

  const isSuspended = actor.status === "SUSPENDED" || actor.status === "DEACTIVATED";
  const isActive = actor.status === "ACTIVE";

  const body = (
    <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <CpPageHeader
        title={`تفاصيل الهوية: ${actor.username}`}
        breadcrumbs={[
          { label: "الإدارة", href: "/administration" },
          { label: "المعرفات", onClick: props.onBack },
          { label: actor.actorId }
        ]}
      />
      
      <div style={{ background: "var(--bthwani-control-panel-surface)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--bthwani-control-panel-border)" }}>
        <Text role="headingSm" style={{ marginBottom: "1rem", display: "block" }}>معلومات المعرف</Text>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>المعرف (ID)</Text>
            <Text role="bodyMd">{actor.actorId}</Text>
          </div>
          <div>
            <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>اسم المستخدم</Text>
            <Text role="bodyMd">{actor.username}</Text>
          </div>
          <div>
            <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>رقم الهاتف</Text>
            <Text role="bodyMd">{actor.phoneE164 || "غير متوفر"}</Text>
          </div>
          <div>
            <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>الدور</Text>
            <Text role="bodyMd">{actor.role || "غير محدد"}</Text>
          </div>
          <div>
            <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>الحالة</Text>
            <Text role="bodyMd" style={{ color: isActive ? "green" : (isSuspended ? "red" : "orange"), fontWeight: "bold" }}>
              {actor.status}
            </Text>
          </div>
          <div>
            <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>الإصدار (Version)</Text>
            <Text role="bodyMd">{actor.version}</Text>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--bthwani-control-panel-surface)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--bthwani-control-panel-border)" }}>
        <Text role="headingSm" style={{ marginBottom: "1rem", display: "block" }}>إدارة دورة الحياة (Lifecycle Management)</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}>
          <div>
            <Text role="bodySm" style={{ marginBottom: "6px", display: "block", color: "var(--bthwani-control-panel-text-muted)" }}>سبب الإجراء (مطلوب)</Text>
            <CpTextInput value={reason} onChange={setReason} placeholder="أدخل سبب الإجراء الأمني..." />
          </div>
          
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {isActive && (
              <CpButton variant="destructive" onClick={() => handleAction("suspend")} disabled={actionLoading || !reason.trim()}>
                تعليق المعرف (Suspend)
              </CpButton>
            )}
            
            {isSuspended && (
              <CpButton variant="primary" onClick={() => handleAction("reactivate")} disabled={actionLoading || !reason.trim()}>
                إعادة تفعيل (Reactivate)
              </CpButton>
            )}
            
            <CpButton variant="secondary" onClick={() => handleAction("revoke")} disabled={actionLoading || !reason.trim()}>
              إبطال جميع الجلسات فقط (Revoke Sessions)
            </CpButton>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--bthwani-control-panel-surface)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--bthwani-control-panel-border)" }}>
        <ActorActivationTab actorId={actor.actorId} role={actor.role} />
      </div>

      <div style={{ background: "var(--bthwani-control-panel-surface)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--bthwani-control-panel-border)" }}>
        <ActorSessionsTab actorId={actor.actorId} />
      </div>

      <ActorCommercialProfileTab actorId={actor.actorId} />
    </div>
  );

  return body;
}
