"use client";

import React, { useState, useEffect } from "react";
import { Box, Card, Text } from "@bthwani/ui-kit";
import { CpButton, CpMutedInline } from "@bthwani/control-panel/components";
import { 
  getLatestActivation, 
  issueActivation, 
  reissueActivation, 
  revokeActivation,
  type ActivationChallenge
} from "../../shared/identity";

type Props = {
  readonly actorId: string;
  readonly expectedActorType: string;
  readonly expectedSurface: string;
  readonly issuedByActorId: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
};

export function ActorActivationCard({ actorId, expectedActorType, expectedSurface, issuedByActorId, disabled, disabledReason }: Props) {
  const [activation, setActivation] = useState<ActivationChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawCode, setRawCode] = useState<string | null>(null);

  const fetchActivation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLatestActivation(actorId);
      setActivation(data);
    } catch (e: any) {
      setError(e.message || "Failed to load activation status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivation();
  }, [actorId]);

  const handleIssue = async (isReissue: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      const input = {
        issuedByActorId,
        expectedActorType,
        expectedSurface
      };
      
      const res = isReissue 
        ? await reissueActivation(actorId, input)
        : await issueActivation(actorId, input);
        
      setActivation(res);
      if (res.code) {
        setRawCode(res.code);
      }
    } catch (e: any) {
      setError(e.message || "Failed to issue activation");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setLoading(true);
      setError(null);
      await revokeActivation(actorId);
      await fetchActivation();
    } catch (e: any) {
      setError(e.message || "Failed to revoke activation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Box gap={3} padding={4}>
        <Text role="titleSm">التفعيل والدخول</Text>
        
        {loading && <CpMutedInline>جارٍ التحميل...</CpMutedInline>}
        
        {error && <Text style={{ color: "var(--bthwani-ui-danger)" }}>{error}</Text>}

        {!loading && activation && (
          <Box gap={2}>
            <Text>رقم الهاتف المشفر: {activation.maskedPhone}</Text>
            <Text>تاريخ الانتهاء: {new Date(activation.expiresAt).toLocaleString("ar-SA")}</Text>
            
            <Box style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <CpButton variant="destructive" onClick={handleRevoke}>إلغاء الرمز (Revoke)</CpButton>
              <CpButton variant="outline" disabled={disabled} onClick={() => handleIssue(true)}>
                إعادة إصدار (Reissue)
              </CpButton>
            </Box>
            {disabled && disabledReason && <CpMutedInline>{disabledReason}</CpMutedInline>}
          </Box>
        )}

        {!loading && !activation && !error && (
          <Box gap={2}>
            <CpMutedInline>لا يوجد رمز تفعيل نشط لهذا المستخدم.</CpMutedInline>
            <CpButton disabled={disabled} onClick={() => handleIssue(false)}>
              إصدار رمز تفعيل (Issue)
            </CpButton>
            {disabled && disabledReason && <CpMutedInline>{disabledReason}</CpMutedInline>}
          </Box>
        )}

        {rawCode && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999
          }}>
            <Card style={{ padding: "24px", maxWidth: "400px", textAlign: "center" }}>
              <Text role="titleMd" style={{ color: "var(--bthwani-ui-danger)" }}>تنبيه أمني هام</Text>
              <Text style={{ marginTop: "16px", marginBottom: "24px" }}>
                هذا هو الرمز السري للتفعيل. سيظهر مرة واحدة فقط ولن يتم تخزينه في النظام ولن يمكنك رؤيته مجدداً. الرجاء نسخه وإرساله فوراً.
              </Text>
              <Text role="titleLg" style={{ letterSpacing: "4px", background: "var(--bthwani-control-panel-surface)", padding: "16px", borderRadius: "8px" }}>
                {rawCode}
              </Text>
              <CpButton 
                style={{ marginTop: "24px", width: "100%" }} 
                onClick={() => {
                  navigator.clipboard.writeText(rawCode);
                  setRawCode(null);
                }}
              >
                نسخ وإغلاق
              </CpButton>
            </Card>
          </div>
        )}
      </Box>
    </Card>
  );
}
