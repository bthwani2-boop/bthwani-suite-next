// Authority: services/dsh/frontend/app-client — benefits sub-screen.
// Sovereign owners: DSH marketing approval and WLT commercial/financial truth.

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
  colorRoles,
} from '@bthwani/ui-kit';

export type BenefitsSection = 'loyalty' | 'subscription' | 'offers';

export type BenefitsHubScreenProps = {
  initialSection?: BenefitsSection;
  onBack?: () => void;
  onAction?: (rowId: string, section: BenefitsSection) => void;
};

type BenefitsSectionConfig = {
  readonly label: string;
  readonly subtitle: string;
  readonly emptyDescription: string;
};

const SECTION_CONFIG: Record<BenefitsSection, BenefitsSectionConfig> = {
  loyalty: {
    label: 'النقاط والمكافآت',
    subtitle: 'رصيد الولاء والمكافآت المعتمدة',
    emptyDescription: 'لا توجد مكافآت ولاء معتمدة ومتاحة لهذا الحساب حالياً.',
  },
  subscription: {
    label: 'الاشتراك',
    subtitle: 'خطط الاشتراك المعتمدة والمتاحة',
    emptyDescription: 'لا توجد خطط اشتراك معتمدة ومتاحة حالياً.',
  },
  offers: {
    label: 'العروض والكوبونات',
    subtitle: 'العروض والكوبونات المعتمدة والمتاحة',
    emptyDescription: 'لا توجد عروض أو كوبونات معتمدة ومتاحة لهذا الحساب حالياً.',
  },
};

export function BenefitsHubScreen({
  initialSection = 'loyalty',
}: BenefitsHubScreenProps) {
  const [section, setSection] = React.useState<BenefitsSection>(initialSection);
  const config = SECTION_CONFIG[section];

  return (
    <ScrollScreen>
      <Header
        title={config.label}
        subtitle={config.subtitle}
      />

      <View style={styles.tabBar}>
        {(Object.keys(SECTION_CONFIG) as BenefitsSection[]).map((candidate) => (
          <TouchableOpacity
            key={candidate}
            style={[styles.tab, section === candidate && styles.tabActive]}
            onPress={() => setSection(candidate)}
          >
            <Text style={[styles.tabText, section === candidate && styles.tabTextActive]}>
              {SECTION_CONFIG[candidate].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        <StateView
          tone="neutral"
          title="لا توجد بيانات معتمدة"
          description={config.emptyDescription}
        />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row-reverse',
    backgroundColor: colorRoles.surfaceBase,
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.surfaceBase,
    paddingHorizontal: spacing[4],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colorRoles.brandAction,
  },
  tabText: {
    fontSize: 13,
    color: colorRoles.brandStructure,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabTextActive: {
    color: colorRoles.brandAction,
    fontWeight: '700',
  },
  content: {
    padding: spacing[4],
    gap: spacing[3],
  },
});
