import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { colorRoles } from "@bthwani/ui-kit";
import { DshPartnerSurface } from "./DshPartnerSurface";
import type { DshPartnerSurfaceProps } from "./dsh-partner.types";
import { PartnerFieldRatingGate } from "./ratings/PartnerFieldRatingGate";
import { IdentitySessionGate } from "../shared/session/IdentitySessionGate";
import { useDshMobilePushRegistration } from "../shared/notifications/use-mobile-push-registration";

export type DshPartnerApplicationProps = DshPartnerSurfaceProps & {
  readonly pushScheme: string;
};

export function DshPartnerApplication({
  route,
  navigation,
  appearance,
  pushScheme,
}: DshPartnerApplicationProps) {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-partner", pushScheme);

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="partner" requiredSurface="app-partner">
        <PartnerFieldRatingGate>
          <DshPartnerSurface route={route} navigation={navigation} appearance={appearance} />
        </PartnerFieldRatingGate>
      </IdentitySessionGate>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
});
