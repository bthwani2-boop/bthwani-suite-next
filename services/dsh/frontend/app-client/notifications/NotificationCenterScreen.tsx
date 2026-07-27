import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  ScrollScreen,
  TopBar,
  spacing,
  colorRoles,
} from "@bthwani/ui-kit";
import { ActorNotificationsPanel } from "../../shared/notifications";

type Props = {
  readonly onBack?: () => void;
  readonly onOpenActionUrl?: (actionUrl: string) => void;
};

export function NotificationCenterScreen({ onBack, onOpenActionUrl }: Props) {
  const identity = useIdentitySession();

  return (
    <View style={styles.container}>
      <TopBar
        title="الإشعارات"
        subtitle="الطلبات والتتبع والدعم"
        {...(onBack ? { onBack } : {})}
      />
      <ScrollScreen contentContainerStyle={styles.content}>
        <ActorNotificationsPanel
          authKind={identity.state.kind}
          title="إشعارات العميل"
          emptyDescription="ستظهر هنا إشعارات الطلبات، التتبع، والدعم الخاصة بك."
          {...(onOpenActionUrl ? { onOpenActionUrl } : {})}
        />
      </ScrollScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  content: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[12],
  },
});
