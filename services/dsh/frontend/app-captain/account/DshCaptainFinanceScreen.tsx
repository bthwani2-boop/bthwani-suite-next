import React from 'react';
import { WltDshCaptainBridge } from '../../shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_captain.facade';
import { DshOperationScreen } from '../DshOperationScreen';
import type {
	DshCaptainFinanceScreenState,
	DshCaptainFinanceSection,
} from '../../shared/delivery';

export type DshCaptainFinanceScreenProps = {
	section?: DshCaptainFinanceSection;
	state?: DshCaptainFinanceScreenState;
	onBack?: () => void;
	onRetry?: () => void;
	dshAuthBearerToken?: string | null;
	dshClientId?: string | null;
};

export function DshCaptainFinanceScreen({
	section = 'cod-liability',
	state = 'ready',
	onBack,
	onRetry,
	dshAuthBearerToken,
	dshClientId,
}: DshCaptainFinanceScreenProps) {
	if (state !== 'ready') {
		return (
			<DshOperationScreen
				state={state}
				title="المالية"
				subtitle="المالية مربوطة الآن بجسر WLT موحد لعرض COD والأرباح والتسوية في وضع preview فقط."
				onRetry={onRetry}
			/>
		);
	}

	return (
		<WltDshCaptainBridge
			section={section}
			onBack={onBack}
			dshAuthBearerToken={dshAuthBearerToken}
			dshClientId={dshClientId}
		/>
	);
}

export function DshCaptainCodBalanceScreen(props: Omit<DshCaptainFinanceScreenProps, 'section'> = {}) {
	return <DshCaptainFinanceScreen {...props} section="cod-liability" />;
}

export default DshCaptainFinanceScreen;
