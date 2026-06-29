import React from "react";
import { TextInput, View } from "react-native";
import { colorRoles } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: unknown;
};

export function SearchField({ value, onChangeText, placeholder, style }: SearchFieldProps) {
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: colorRoles.borderSubtle,
          borderRadius: 8,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          backgroundColor: colorRoles.surfaceBase,
        },
        style as any,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colorRoles.textMuted}
        style={{ color: colorRoles.textPrimary, fontSize: 14 }}
      />
    </View>
  );
}
