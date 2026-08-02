import React from 'react';
import { View } from 'react-native';
import { Box, MobileScrollView, TopBar, useTheme } from '@bthwani/ui-kit';
import { WltDshCaptainBridge } from '../../shared/wlt/generated/wlt_frontend_dsh_app_captain.facade';
import { ActorWalletPanel } from '../../shared/actor-wallet';
import { RepresentativeCommissionPanel } from '../../shared/commissions';
import { PayoutDestinationPanel } from '../../shared/payouts';
import { CaptainFinancialEligibilityPanel } from '../../../../dsh/frontend/shared/dispatch';
import { ProviderIncidentsPanel } from '../../../../dsh/frontend/shared/workforce/ProviderIncidentsPanel';
import { DshOperationScreen } from '../../../../dsh/frontend/app-captain/DshOperationScreen';
import { WltCaptainCodCustodyScreen } from './WltCaptainCodCustodyScreen';
import type {
	DshCaptainFinanceScreenState,
	DshCaptainFinanceSection,
} from '../../../../dsh/frontend/shared/delivery';

export type WltCaptainFinanceScreenProps = {
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
			<WltCaptainCodCustodyScreen embedded />
			<RepresentativeCommissionPanel actorType="captain" title="أجور وعمولات التوصيل" embedded />
			<PayoutDestinationPanel actorType="captain" title="وجهة صرف الكابتن وطلبات الدفع" embedded />
			<ProviderIncidentsPanel />
		</Box>
	);
}

export function WltCaptainFinanceScreen({
	section = 'earnings',
	state = 'ready',
	onBack,
	onRetry,
	dshClientId,
	embedded = true,
}: WltCaptainFinanceScreenProps) {
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
		return <WltCaptainCodCustodyScreen embedded={embedded} {...(onBack ? { onBack } : {})} />;
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

export function WltCaptainCodBalanceScreen(props: Omit<WltCaptainFinanceScreenProps, 'section'> = {}) {
	return <WltCaptainFinanceScreen {...props} section="cod-liability" />;
}
