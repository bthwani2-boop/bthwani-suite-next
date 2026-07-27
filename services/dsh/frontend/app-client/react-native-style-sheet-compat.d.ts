import type { ViewStyle } from "react-native";

// React Native 0.85 keeps the runtime absoluteFillObject compatibility value
// used by the existing reels overlay, while its public type surface exposes
// only absoluteFill. Keep the declaration local to the DSH client surface
// until the two remaining call sites are migrated to registered styles.
declare module "react-native" {
  namespace StyleSheet {
    const absoluteFillObject: ViewStyle;
  }
}
