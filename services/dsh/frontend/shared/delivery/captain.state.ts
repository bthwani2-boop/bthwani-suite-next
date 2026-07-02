// Moved from state-machines/client-state.ts — canonical location is captain/captain.state.ts

// -----------------------------------------------------------------------------
// Captain operational states
// -----------------------------------------------------------------------------
export type DshCaptainState =
	| 'entry'
	| 'orders'
	| 'finance'
	| 'profile'
	| 'operations'
	| 'order-accept'
	| 'order-offer-reject'
	| 'order-pickup'
	| 'order-deliver'
	| 'proof-upload'
	| 'cod-liability'
	| 'profile-get'
	| 'tier-info'
	| 'tier-evaluate'
	| 'terminal';

export type DshCaptainStateGroup = 'entry' | 'orders' | 'finance' | 'profile' | 'operations' | 'terminal';

export type DshCaptainStateMeta = {
	id: DshCaptainState;
	label: string;
	description: string;
	group: DshCaptainStateGroup;
	terminal: boolean;
};

const stateMetaMap: Record<DshCaptainState, DshCaptainStateMeta> = {
	entry: { id: 'entry', label: 'مدخل الكابتن', description: 'نقطة البداية المختصرة.', group: 'entry', terminal: false },
	orders: { id: 'orders', label: 'الطلبات', description: 'مسار الطلبات الأساسي.', group: 'orders', terminal: false },
	finance: { id: 'finance', label: 'المالية', description: 'سطح الرصيد والتسوية.', group: 'finance', terminal: false },
	profile: { id: 'profile', label: 'الملف', description: 'ملف الكابتن ومعلومات الطبقة.', group: 'profile', terminal: false },
	operations: { id: 'operations', label: 'التشغيل', description: 'الجاهزية والمسار والسلامة.', group: 'operations', terminal: false },
	'order-accept': { id: 'order-accept', label: 'قبول الطلب', description: 'حالة قبول العرض.', group: 'orders', terminal: false },
	'order-offer-reject': { id: 'order-offer-reject', label: 'رفض العرض', description: 'حالة رفض عرض الطلب.', group: 'orders', terminal: false },
	'order-pickup': { id: 'order-pickup', label: 'الاستلام', description: 'مرحلة الاستلام.', group: 'orders', terminal: false },
	'order-deliver': { id: 'order-deliver', label: 'التسليم', description: 'مرحلة التسليم.', group: 'orders', terminal: false },
	'proof-upload': { id: 'proof-upload', label: 'رفع الإثبات', description: 'مرحلة إثبات التسليم.', group: 'orders', terminal: false },
	'cod-liability': { id: 'cod-liability', label: 'ذمة COD', description: 'مسار الذمة النقدية المستحقة.', group: 'finance', terminal: false },
	'profile-get': { id: 'profile-get', label: 'ملف الكابتن', description: 'لقطة الملف.', group: 'profile', terminal: false },
	'tier-info': { id: 'tier-info', label: 'معلومات الطبقة', description: 'بيانات الطبقة الحالية.', group: 'profile', terminal: false },
	'tier-evaluate': { id: 'tier-evaluate', label: 'تقييم الطبقة', description: 'فحص أهلية الطبقة.', group: 'profile', terminal: false },
	terminal: { id: 'terminal', label: 'نهائي', description: 'حالة ختامية.', group: 'terminal', terminal: true },
};

export function getDshCaptainStateMeta(state: DshCaptainState): DshCaptainStateMeta {
	return stateMetaMap[state];
}

export function isDshCaptainOrderState(state: DshCaptainState): boolean {
	return getDshCaptainStateMeta(state).group === 'orders';
}

export function isDshCaptainFinanceState(state: DshCaptainState): boolean {
	return getDshCaptainStateMeta(state).group === 'finance';
}

export function isDshCaptainTerminalState(state: DshCaptainState): boolean {
	return getDshCaptainStateMeta(state).terminal;
}

// --- Finance screen types ---
export type DshCaptainFinanceScreenState = 'ready' | 'loading' | 'empty' | 'error';
export type DshCaptainFinanceSection = 'cod-liability' | 'earnings' | 'settlement';

// --- Profile screen types ---
export type DshCaptainProfileScreenState = 'ready' | 'loading' | 'empty' | 'error';
export type DshCaptainProfileSection = 'profile-get' | 'tier-info' | 'tier-evaluate';

export function selectDshCaptainOperationalStatuses(_captainId?: string) {
  return Object.values(stateMetaMap);
}
