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
	onBack?: (() => void) | undefined;
	onRetry?: (() => void) | undefined;
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
				subtitle="المالية مربوطة بمرجع WLT الفعلي لعرض ذمة COD. الأرباح والتسوية والشحن الضامن غير متاحة بعد لعدم توفر مرجع WLT مجمّع بحسب الكابتن."
				onRetry={onRetry}
			/>
		);
	}

	return (
		<WltDshCaptainBridge
			section={section}
			{...(onBack ? { onBack } : {})}
			{...(dshAuthBearerToken !== undefined ? { dshAuthBearerToken } : {})}
			{...(dshClientId !== undefined ? { dshClientId } : {})}
		/>
	);
}

export function DshCaptainCodBalanceScreen(props: Omit<DshCaptainFinanceScreenProps, 'section'> = {}) {
	return <DshCaptainFinanceScreen {...props} section="cod-liability" />;
}

export default DshCaptainFinanceScreen;
