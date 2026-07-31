import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../Text";
import { Icon } from "../Icon/Icon";
import { colorRoles } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";

export type TabBarItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly activeIcon?: string;
  readonly badge?: number;
};

export type TabBarProps = {
  readonly items: readonly TabBarItem[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
  /** Optional center floating action button (e.g. "add"). Splits `items` evenly around it. */
  readonly centerAction?: {
    readonly icon: string;
    readonly label: string;
    readonly accessibilityLabel: string;
    readonly onPress: () => void;
  };
  readonly bottomInset?: number;
};

function TabBarButton({ item, active, onPress }: { item: TabBarItem; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: spacing[2] }}
    >
      <View>
        <Icon name={active ? item.activeIcon ?? item.icon : item.icon} size={22} tone={active ? "brand" : "muted"} />
        {item.badge ? (
          <View
            style={{
              position: "absolute",
              top: -2,
              insetInlineEnd: -6,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              paddingHorizontal: 3,
              backgroundColor: colorRoles.danger,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9, color: colorRoles.textInverse, fontWeight: "700" }}>{item.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 11,
          marginTop: 2,
          color: active ? colorRoles.brandAction : colorRoles.textMuted,
          fontWeight: active ? "700" : "400",
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

/**
 * Generic bottom tab bar: RTL-ordered item slots with an optional centered
 * floating action button. Consumers pass `items` in reading order; this
 * component handles the row-reverse layout so RTL apps don't reimplement it.
 */
export function TabBar({ items, activeId, onSelect, centerAction, bottomInset = 0 }: TabBarProps) {
  const half = Math.ceil(items.length / 2);
  const rightItems = items.slice(0, half);
  const leftItems = items.slice(half);

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        height: 72 + bottomInset,
        paddingBottom: bottomInset,
        backgroundColor: colorRoles.surfaceBase,
        borderTopWidth: 1,
        borderTopColor: colorRoles.borderSubtle,
        alignItems: "center",
        shadowColor: colorRoles.brandStructure,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 12,
      }}
    >
      {leftItems.map((item) => (
        <TabBarButton key={item.id} item={item} active={activeId === item.id} onPress={() => onSelect(item.id)} />
      ))}

      {centerAction ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Pressable
            onPress={centerAction.onPress}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colorRoles.brandAction,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              opacity: pressed ? 0.88 : 1,
              shadowColor: colorRoles.brandAction,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.45,
              shadowRadius: 10,
              elevation: 8,
            })}
            accessibilityRole="button"
            accessibilityLabel={centerAction.accessibilityLabel}
          >
            <Icon name={centerAction.icon} size={30} color={colorRoles.textInverse} />
          </Pressable>
          <Text style={{ fontSize: 10, color: colorRoles.textMuted, marginTop: -18 }}>{centerAction.label}</Text>
        </View>
      ) : null}

      {rightItems.map((item) => (
        <TabBarButton key={item.id} item={item} active={activeId === item.id} onPress={() => onSelect(item.id)} />
      ))}
    </View>
  );
}
