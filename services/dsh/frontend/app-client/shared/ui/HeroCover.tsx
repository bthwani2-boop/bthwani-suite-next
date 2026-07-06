import React from "react";
import { View, Image, StyleSheet, type ImageSourcePropType } from "react-native";
import { colorRoles } from "@bthwani/ui-kit";

type Props = {
  readonly coverImage?: ImageSourcePropType | null;
};

export function HeroCover({ coverImage }: Props) {
  return (
    <View style={styles.container}>
      {coverImage ? (
        <Image source={coverImage} style={styles.image} resizeMode="cover" alt="" />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    backgroundColor: colorRoles.brandStructure,
    opacity: 0.15,
  },
});
