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
	'profile-get': { id: 'profile-get', label: 'ملف الكابتن', description: 'لقطة الملف.', group: 'profile', terminal: false },
	'tier-info': { id: 'tier-info', label: 'معلومات الطبقة', description: 'بيانات الطبقة الحالية.', group: 'profile', terminal: false },
	'tier-evaluate': { id: 'tier-evaluate', label: 'تقييم الطبقة', description: 'فحص أهلية الطبقة.', group: 'profile', terminal: false },
	terminal: { id: 'terminal', label: 'نهائي', description: 'حالة ختامية.', group: 'terminal', terminal: true },
};

export function getDshCaptainStateMeta(state: DshCaptainState): DshCaptainStateMeta {
	return stateMetaMap[state];
}

function isDshCaptainOrderState(state: DshCaptainState): boolean {
	return getDshCaptainStateMeta(state).group === 'orders';
}

function isDshCaptainFinanceState(state: DshCaptainState): boolean {
	return getDshCaptainStateMeta(state).group === 'finance';
}

function isDshCaptainTerminalState(state: DshCaptainState): boolean {
	return getDshCaptainStateMeta(state).terminal;
}

// --- Finance screen types ---
export type DshCaptainFinanceScreenState = 'ready' | 'loading' | 'empty' | 'error';
export type DshCaptainFinanceSection = 'earnings' | 'settlement';

// --- Profile screen types ---
export type DshCaptainProfileScreenState = 'ready' | 'loading' | 'empty' | 'error';
type DshCaptainProfileSection = 'profile-get' | 'tier-info' | 'tier-evaluate';

function selectDshCaptainOperationalStatuses(_captainId?: string) {
  return Object.values(stateMetaMap);
}
