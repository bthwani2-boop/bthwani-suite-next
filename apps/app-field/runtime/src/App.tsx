import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from "react-native";
import { PartnerIntakeScreen } from "../../../../services/dsh/frontend/app-field/partner-intake";
import { FieldStoreVerificationScreen } from "../../../../services/dsh/frontend/app-field/store";
import { DshFieldVisitScreen } from "../../../../services/dsh/frontend/app-field/field-readiness";
import { DshFieldReadinessChecklistScreen } from "../../../../services/dsh/frontend/app-field/field-readiness";

type Tab = "intake" | "verification" | "visit" | "checklist";

const TABS: { id: Tab; label: string }[] = [
  { id: "intake", label: "استقبال شريك" },
  { id: "verification", label: "التحقق" },
  { id: "visit", label: "الزيارة" },
  { id: "checklist", label: "القائمة" },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("intake");

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.screen}>
        {activeTab === "intake" && <PartnerIntakeScreen />}
        {activeTab === "verification" && <FieldStoreVerificationScreen />}
        {activeTab === "visit" && <DshFieldVisitScreen />}
        {activeTab === "checklist" && <DshFieldReadinessChecklistScreen />}
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
    borderTopColor: "#16a34a",
  },
  tabLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#16a34a",
    fontWeight: "700",
  },
});

export default App;
