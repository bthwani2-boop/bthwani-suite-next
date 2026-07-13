"use client";

// Renders one of two distinct failure UIs, never a single generic
// "retry" — an expired operator session cannot be fixed by retrying the
// same request, so it must route to login instead. Service outages
// (network, 5xx, IDENTITY_UNAVAILABLE) keep a normal retry affordance.
import React from "react";
import { Box, Button, Surface, Text, spacing } from "@bthwani/ui-kit";
import { useControlPanelSession } from "../session/control-panel-session";

export function WorkforceErrorState(props: { readonly message: string; readonly isSessionExpired: boolean; readonly onRetry: () => void }) {
  const session = useControlPanelSession();

  if (props.isSessionExpired) {
    return (
      <Surface tone="warning" padding={4}>
        <Text role="bodySm" tone="danger" align="center">
          انتهت جلسة لوحة التحكم
        </Text>
        <Box style={{ alignItems: "center", marginTop: spacing[2] }}>
          <Button label="تسجيل الدخول" tone="primary" onPress={() => void session.logout()} />
        </Box>
      </Surface>
    );
  }

  return (
    <Surface tone="warning" padding={4}>
      <Text role="bodySm" tone="danger" align="center">
        {props.message}
      </Text>
      <Box style={{ alignItems: "center", marginTop: spacing[2] }}>
        <Button label="إعادة المحاولة" tone="secondary" onPress={props.onRetry} />
      </Box>
    </Surface>
  );
}

export default WorkforceErrorState;
