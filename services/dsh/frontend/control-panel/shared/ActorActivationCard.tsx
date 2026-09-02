"use client";

import React, { useEffect, useState } from "react";
import { Button, Box, Card, Text } from "@bthwani/ui-kit";
import { CpMutedInline } from "@bthwani/control-panel/components";
import type { ActivationCodeResult, ActivationMetadata } from "../../shared/workforce";

type Props = {
  readonly latestActivation?: ActivationMetadata | undefined;
  readonly issuedCode: ActivationCodeResult | null;
  readonly busy: boolean;
  readonly onIssue: () => void | Promise<void>;
  readonly onRevoke: () => void | Promise<void>;
  readonly issueDisabled?: boolean;
  readonly issueDisabledReason?: string;
};

export function ActorActivationCard({
  latestActivation,
  issuedCode,
  busy,
  onIssue,
  onRevoke,
  issueDisabled = false,
  issueDisabledReason }: Props) {
  const [rawCode, setRawCode] = useState<string | null>(null);

  useEffect(() => {
    setRawCode(issuedCode?.code ?? null);
  }, [issuedCode]);

  return (
    <Card>
      <Box gap={3} padding={4}>
        <Text role="titleSm">التفعيل والدخول</Text>

        {latestActivation ? (
          <Box gap={2}>
            <Text>رقم الهاتف المشفر: {latestActivation.maskedPhone}</Text>
            <Text>حالة الرمز: {latestActivation.status}</Text>
            <Text>تاريخ الانتهاء: {new Date(latestActivation.expiresAt).toLocaleString("ar-SA")}</Text>
            <Box style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <Button variant="danger" disabled={busy} onClick={() => void onRevoke()}>
                إلغاء الرمز (Revoke)
              </Button>
              <Button variant="secondary" disabled={busy || issueDisabled} onClick={() => void onIssue()}>
                إعادة إصدار (Issue)
              </Button>
            </Box>
            {issueDisabled && issueDisabledReason ? <CpMutedInline>{issueDisabledReason}</CpMutedInline> : null}
          </Box>
        ) : (
          <Box gap={2}>
            <CpMutedInline>لا يوجد رمز تفعيل مسجل لهذا الملف.</CpMutedInline>
            <Button disabled={busy || issueDisabled} onClick={() => void onIssue()}>
              إصدار رمز تفعيل (Issue)
            </Button>
            {issueDisabled && issueDisabledReason ? <CpMutedInline>{issueDisabledReason}</CpMutedInline> : null}
          </Box>
        )}

        {rawCode ? (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "var(--bthwani-media-scrim-strong)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999 }}>
            <Card style={{ padding: "24px", maxWidth: "400px", textAlign: "center" }}>
              <Text role="titleMd" style={{ color: "var(--bthwani-ui-danger)" }}>تنبيه أمني هام</Text>
              <Text style={{ marginTop: "16px", marginBottom: "24px" }}>
                هذا هو الرمز السري للتفعيل. سيظهر مرة واحدة فقط. انسخه وأرسله عبر القناة المعتمدة.
              </Text>
              <Text role="titleLg" style={{ letterSpacing: "4px", background: "var(--bthwani-control-panel-surface)", padding: "16px", borderRadius: "8px" }}>
                {rawCode}
              </Text>
              <Button
                style={{ marginTop: "24px", width: "100%" }}
                onClick={() => {
                  void navigator.clipboard.writeText(rawCode);
                  setRawCode(null);
                }}
              >
                نسخ وإغلاق
              </Button>
            </Card>
          </div>
        ) : null}
      </Box>
    </Card>
  );
}
