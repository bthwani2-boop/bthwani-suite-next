import React from 'react';
import { View } from 'react-native';
import { MobileScrollView, TopBar, useTheme } from '@bthwani/ui-kit';
import { WltDshCaptainBridge } from '../../shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_captain.facade';
import { ActorWalletPanel } from '../../shared/finance-wlt-link/actor-wallet';
import { RepresentativeCommissionPanel } from '../../shared/finance-wlt-link/jrn036';
import { PayoutDestinationPanel } from '../../shared/finance-wlt-link/jrn037';
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
};

export function DshCaptainFinanceScreen({
	section = 'cod-liability',
	state = 'ready',
	onBack,
	onRetry,
	dshClientId,
}: DshCaptainFinanceScreenProps) {
	const theme = useTheme() as any;

	if (state !== 'ready') {
		return (
			<DshOperationScreen
				state={state}
				title="المالية"
				subtitle="محفظة الكابتن والدفتر وذمة COD والعمولات والصرف تُقرأ من WLT عبر وكيل DSH المحكوم."
				onRetry={onRetry}
			/>
		);
	}

	if (section === 'cod-liability') {
		return <DshCaptainCodCustodyScreen {...(onBack ? { onBack } : {})} />;
	}

	if (section === 'earnings') {
		return (
			<View style={{ flex: 1, backgroundColor: theme.surface }}>
				<TopBar title="محفظة الكابتن" {...(onBack ? { onBack } : {})} />
				<MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: 120 }}>
					<ActorWalletPanel actorType="captain" title="الرصيد والأرباح المرجعية" embedded />
					<RepresentativeCommissionPanel actorType="captain" title="عمولات التوصيل" embedded />
					<PayoutDestinationPanel actorType="captain" title="وجهة صرف الكابتن وطلبات الدفع" embedded />
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

// export default DshCaptainFinanceScreen; // Unused default export
