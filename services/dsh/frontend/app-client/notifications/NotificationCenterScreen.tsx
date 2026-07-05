import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Button,
  ScrollScreen,
  TopBar,
  spacing,
  colorRoles,
} from "@bthwani/ui-kit";
import { ActorNotificationsPanel } from "../../shared/notifications";

type Props = {
  readonly onBack?: () => void;
};

export function NotificationCenterScreen({ onBack }: Props) {
  const identity = useIdentitySession();

  return (
    <View style={styles.container}>
      <TopBar title="الإشعارات" />
      <ScrollScreen>
        <View style={styles.content}>
          <ActorNotificationsPanel
            authKind={identity.state.kind}
            title="إشعارات العميل"
            emptyDescription="ستظهر هنا إشعارات الطلبات، التتبع، والدعم الخاصة بك."
          />
          {onBack ? <Button label="العودة" tone="secondary" onPress={onBack} /> : null}
        </View>
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
  },
});

export default NotificationCenterScreen;
