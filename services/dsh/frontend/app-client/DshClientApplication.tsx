import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { DshClientPlatformProvider, type DshClientPlatform } from "./client-platform-context";
import { DshClientSurface, type DshClientSurfaceProps } from "./DshClientSurface";
import { ClientOrderRatingGate } from "./ratings/ClientOrderRatingGate";
import { IdentitySessionGate } from "../shared/session/IdentitySessionGate";
import { useDshMobilePushRegistration } from "../shared/notifications/use-mobile-push-registration";

export type DshClientApplicationProps = DshClientSurfaceProps & {
  readonly platform: DshClientPlatform;
  readonly pushScheme: string;
};

export function DshClientApplication({
  route,
  navigation,
  platform,
  pushScheme,
}: DshClientApplicationProps) {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-client", pushScheme);

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="client" requiredSurface="app-client">
        <ClientOrderRatingGate>
          <DshClientPlatformProvider platform={platform}>
            <DshClientSurface route={route} navigation={navigation} />
          </DshClientPlatformProvider>
        </ClientOrderRatingGate>
      </IdentitySessionGate>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
