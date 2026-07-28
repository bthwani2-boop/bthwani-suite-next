import React from 'react';
import { View } from 'react-native';
import { Box, MobileScrollView, TopBar, useTheme } from '@bthwani/ui-kit';
import { WltDshCaptainBridge } from '../../shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_captain.facade';
import { ActorWalletPanel } from '../../shared/finance-wlt-link/actor-wallet';
import { RepresentativeCommissionPanel } from '../../shared/finance-wlt-link/settlements-commissions';
import { PayoutDestinationPanel } from '../../shared/finance-wlt-link/payouts-destinations';
import { CaptainFinancialEligibilityPanel } from '../../shared/dispatch';
import { ProviderIncidentsPanel } from '../../shared/workforce/ProviderIncidentsPanel';
import { DshOperationScreen } from '../DshOperationScreen';
import { DshCaptainCodCustodyScreen } from './DshCaptainCodCustodyScreen';
import type {
	DshCaptainFinanceScreenState,
	DshCaptainFinanceSection,
} from '../../shared/delivery';

export type DshCaptainFinanceScreenProps = {
	section?: DshCaptainFinanceSection;
	state?: DshCaptainFinanceScreenState;
	onBack?: (() => void) | undefined;
	onRetry?: (() => void) | undefined;
	dshClientId?: string | null;
	embedded?: boolean;
};

function EarningsContent() {
	return (
		<Box gap={4}>
			<CaptainFinancialEligibilityPanel />
			<ActorWalletPanel actorType="captain" title="الرصيد والضمانة المالية والأرباح" embedded />
			<DshCaptainCodCustodyScreen embedded />
			<RepresentativeCommissionPanel actorType="captain" title="أجور وعمولات التوصيل" embedded />
			<PayoutDestinationPanel actorType="captain" title="وجهة صرف الكابتن وطلبات الدفع" embedded />
			<ProviderIncidentsPanel />
		</Box>
	);
}

export function DshCaptainFinanceScreen({
	section = 'earnings',
	state = 'ready',
	onBack,
	onRetry,
	dshClientId,
	embedded = true,
}: DshCaptainFinanceScreenProps) {
	const theme = useTheme() as any;

	if (state !== 'ready') {
		return (
			<DshOperationScreen
				state={state}
				title="المالية"
				subtitle="الضمانة المالية والمحفظة والدفتر وذمة COD والأجور والخصومات والصرف تُقرأ من المصادر المحكومة."
				onRetry={onRetry}
			/>
		);
	}

	if (section === 'cod-liability') {
		return <DshCaptainCodCustodyScreen embedded={embedded} {...(onBack ? { onBack } : {})} />;
	}

	if (section === 'earnings') {
		if (embedded) return <EarningsContent />;
		return (
			<View style={{ flex: 1, backgroundColor: theme.surface }}>
				<TopBar title="مالية الكابتن" {...(onBack ? { onBack } : {})} />
				<MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: 120 }}>
					<EarningsContent />
				</MobileScrollView>
			</View>
		);
	}

	return (
		<WltDshCaptainBridge
			section={section}
			{...(onBack ? { onBack } : {})}
			{...(dshClientId !== undefined ? { dshClientId } : {})}
		/>
	);
}

export function DshCaptainCodBalanceScreen(props: Omit<DshCaptainFinanceScreenProps, 'section'> = {}) {
	return <DshCaptainFinanceScreen {...props} section="cod-liability" />;
}
