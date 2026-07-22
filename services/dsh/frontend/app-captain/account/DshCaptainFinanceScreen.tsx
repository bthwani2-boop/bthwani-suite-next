import React from 'react';
import { View } from 'react-native';
import { MobileScrollView, TopBar, useTheme } from '@bthwani/ui-kit';
import { WltDshCaptainBridge } from '../../shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_captain.facade';
import { ActorWalletPanel } from '../../shared/finance-wlt-link/actor-wallet';
import { DshOperationScreen } from '../DshOperationScreen';
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
	section = 'earnings',
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
				subtitle="محفظة الكابتن والدفتر وذمة COD تُقرأ من WLT عبر وكيل DSH المحكوم."
				onRetry={onRetry}
			/>
		);
	}

	if (section === 'earnings') {
		return (
			<View style={{ flex: 1, backgroundColor: theme.surface }}>
				<TopBar title="محفظة الكابتن" {...(onBack ? { onBack } : {})} />
				<MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: 120 }}>
					<ActorWalletPanel actorType="captain" title="الرصيد والأرباح المرجعية" embedded />
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
