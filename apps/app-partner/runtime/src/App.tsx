import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from "react-native";
import { PartnerActivationStatusScreen } from "../../../../services/dsh/frontend/app-partner/onboarding";
import { PartnerStoreScreen } from "../../../../services/dsh/frontend/app-partner/store";
import { PartnerCatalogManagementScreen } from "../../../../services/dsh/frontend/app-partner/catalog";
import { PartnerOrdersScreen } from "../../../../services/dsh/frontend/app-partner/orders";
import { PartnerSupportScreen } from "../../../../services/dsh/frontend/app-partner/support";

type Tab = "status" | "store" | "catalog" | "orders" | "support";

const TABS: { id: Tab; label: string }[] = [
  { id: "status", label: "حالتي" },
  { id: "store", label: "متجري" },
  { id: "catalog", label: "الكتالوج" },
  { id: "orders", label: "الطلبات" },
  { id: "support", label: "الدعم" },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("status");

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.screen}>
        {activeTab === "status" && <PartnerActivationStatusScreen />}
        {activeTab === "store" && <PartnerStoreScreen />}
        {activeTab === "catalog" && <PartnerCatalogManagementScreen />}
        {activeTab === "orders" && <PartnerOrdersScreen />}
        {activeTab === "support" && <PartnerSupportScreen />}
      </View>
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8f8f8" },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: "#2563eb",
  },
  tabLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
});

export default App;
