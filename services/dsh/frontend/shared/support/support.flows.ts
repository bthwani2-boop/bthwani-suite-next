// DSH Operations Support Flows — lifecycle specs, surface visibility, escalation ownership.
// No JSX. No ui-kit. No Tamagui.

export type DshOperationsSupportSurfaceId =
  | 'app-partner'
  | 'app-client'
  | 'app-captain'
  | 'app-field'
  | 'control-panel'
  | 'wlt';

export type DshOperationsSupportVisibilityMode =
  | 'primary'
  | 'context-only'
  | 'escalation-only'
  | 'hidden-compat'
  | 'reference-only';

export type DshOperationsSupportEscalationOwner = 'control-panel' | 'wlt' | 'partner-management';
export type DshOperationsSupportSeverity = 'info' | 'warning' | 'danger' | 'success';

export const DSH_OPERATIONS_SUPPORT_FLOW_IDS = [
  'delayed-preparation',
  'item-unavailable',
  'partner-reject-request',
  'courier-not-arrived',
  'customer-not-responding',
  'handoff-mismatch',
  'wrong-item',
  'payment-refund-review',
  'manual-call-intake',
  'customer-360-review',
  'assisted-order-desk',
  'order-rescue',
  'delivery-failed',
  'proof-of-delivery',
  'store-wait-time',
  'catalog-barcode-issue',
  'branch-readiness-escalation',
  'field-proof-required',
  'store-nomination-intake',
  'auction-status-update',
  'order-rejection',
] as const;

export type DshOperationsSupportFlowId = (typeof DSH_OPERATIONS_SUPPORT_FLOW_IDS)[number];

export type DshOperationsSupportFlowVisibility = {
  surfaceId: DshOperationsSupportSurfaceId;
  mode: DshOperationsSupportVisibilityMode;
  routeHint: string;
  notes?: string | undefined;
};

export type DshOperationsSupportFlowSpec = {
  flowId: DshOperationsSupportFlowId;
  title: string;
  description: string;
  surfaceVisibility: readonly DshOperationsSupportFlowVisibility[];
  ownerSurface: DshOperationsSupportSurfaceId;
  ownerLabel: string;
  escalationOwner: DshOperationsSupportEscalationOwner;
  escalationOwnerLabel: string;
  severity: DshOperationsSupportSeverity;
  allowedActions: readonly string[];
  forbiddenActions: readonly string[];
  relatedOrderState: string;
  financialImpactRef?: string;
  requiresEvidence: boolean;
  nextAction: string;
  hiddenCompat?: boolean;
};

// DSH_SUPPORT_ISSUE_TYPES: canonical API issue_type values for POST /support/escalations.
export const DSH_SUPPORT_ISSUE_TYPES = [
  'delayed_delivery',
  'wrong_items',
  'missing_items',
  'payment_issue',
  'other',
] as const;

type DshSupportIssueType = (typeof DSH_SUPPORT_ISSUE_TYPES)[number];

function visibility(
  surfaceId: DshOperationsSupportSurfaceId,
  mode: DshOperationsSupportVisibilityMode,
  routeHint: string,
  notes?: string
): DshOperationsSupportFlowVisibility {
  const result: any = { surfaceId, mode, routeHint };
  if (notes !== undefined) {
    result.notes = notes;
  }
  return result;
}

const cpOwnerLabel = 'لوحة التحكم';
const wltOwnerLabel = 'WLT';
const pmOwnerLabel = 'Partner Management';

export const DSH_OPERATIONS_SUPPORT_FLOWS: readonly DshOperationsSupportFlowSpec[] = [
  {
    flowId: 'delayed-preparation',
    title: 'تأخر التحضير',
    description: 'الطلب تجاوز نافذة التحضير ويحتاج قرارًا تشغيليًا سريعًا داخل نفس سياق الطلب.',
    surfaceVisibility: [
      visibility('app-partner', 'primary', 'support-directory', 'يظهر داخل مركز عمليات الشريك.'),
      visibility('app-client', 'context-only', 'order-issue-workspace', 'يظهر من داخل الطلب فقط.'),
      visibility('control-panel', 'primary', 'support/queue', 'يدخل صف SLA والاستثناءات.'),
    ],
    ownerSurface: 'app-partner', ownerLabel: 'الشريك',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'danger',
    allowedActions: ['تثبيت وقت التحضير', 'فتح محادثة دعم', 'تصعيد خطر SLA'],
    forbiddenActions: ['إغلاق الحالة دون تحديث الطلب', 'إنشاء استرداد محلي'],
    relatedOrderState: 'preparation_delayed', requiresEvidence: false,
    nextAction: 'ثبّت التأخير أو أعد الطلب إلى مسار تحضير واضح.',
  },
  {
    flowId: 'item-unavailable',
    title: 'نفاد صنف مؤثر',
    description: 'عنصر غير متاح يهدد استمرار الطلب أو يتطلب بديلًا واضحًا قبل تثبيت التنفيذ.',
    surfaceVisibility: [
      visibility('app-partner', 'primary', 'inventory-adjust', 'يظهر كمشكلة طلب ومخزون معًا.'),
      visibility('app-client', 'context-only', 'order-issue-workspace', 'العميل يراه كبديل/نفاد داخل الطلب فقط.'),
      visibility('app-field', 'context-only', 'stores > onboarding > products', 'يعكس أثر الإدخال أو الباركود على الكتالوج.'),
      visibility('control-panel', 'primary', 'support/queue', 'يصل لصف معالجة الاستثناءات.'),
    ],
    ownerSurface: 'app-partner', ownerLabel: 'الشريك',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'danger',
    allowedActions: ['تعديل المخزون', 'اقتراح بديل', 'تصعيد القرار للدعم'],
    forbiddenActions: ['إعلان الجاهزية مع بقاء النقص', 'رفض صامت بلا سبب'],
    relatedOrderState: 'item_unavailable', requiresEvidence: false,
    nextAction: 'ثبّت البديل أو أوقف التنفيذ قبل التسليم.',
  },
  {
    flowId: 'partner-reject-request',
    title: 'طلب رفض من الشريك',
    description: 'رفض الطلب يبقى قرارًا استثنائيًا ويحتاج سببًا تشغيليًا صريحًا داخل نفس السياق.',
    surfaceVisibility: [
      visibility('app-partner', 'primary', 'order-reject', 'يظهر من command center فقط عند وجود سبب مثبت.'),
      visibility('control-panel', 'primary', 'support/escalation', 'الجهة المالكة لسياسة الأسباب والتصعيد.'),
    ],
    ownerSurface: 'app-partner', ownerLabel: 'الشريك',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'danger',
    allowedActions: ['فتح مسار الرفض', 'تسجيل السبب', 'طلب مراجعة تشغيلية'],
    forbiddenActions: ['رفض بلا سبب', 'تحويل الحالة إلى تعويض مالي محلي'],
    relatedOrderState: 'reject_requested', requiresEvidence: true,
    nextAction: 'راجع السبب ثم قرر بين الرفض أو إعادة الطلب إلى المعالجة.',
  },
  {
    flowId: 'courier-not-arrived',
    title: 'الكابتن / الموصل لم يصل',
    description: 'نقطة الالتقاط أو التسليم متوقفة لأن جهة الاستلام لم تصل بعد رغم جاهزية الطلب.',
    surfaceVisibility: [
      visibility('app-partner', 'context-only', 'support-directory', 'يظهر أثره على تنفيذ الشريك.'),
      visibility('app-captain', 'primary', 'support-directory', 'الكابتن يرى handoff/delivery issues فقط.'),
      visibility('control-panel', 'primary', 'support/queue', 'يدخل صف مخاطر الإسناد والتأخير.'),
    ],
    ownerSurface: 'app-captain', ownerLabel: 'الكابتن',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'warning',
    allowedActions: ['طلب إثبات وصول', 'فتح محادثة', 'تصعيد تأخير التسليم'],
    forbiddenActions: ['تأكيد التسليم دون وصول فعلي', 'إغلاق الحالة كتسليم ناجح'],
    relatedOrderState: 'courier_not_arrived', requiresEvidence: true,
    nextAction: 'ثبّت الوصول أو صعّد الحالة قبل خرق SLA.',
  },
  {
    flowId: 'customer-not-responding',
    title: 'العميل غير متجاوب',
    description: 'التواصل مطلوب لإكمال الطلب أو التسليم، لكن المحاولات الأخيرة بلا رد واضح.',
    surfaceVisibility: [
      visibility('app-partner', 'context-only', 'chat-send', 'يظهر أثر عدم التجاوب على الطلب فقط.'),
      visibility('app-captain', 'primary', 'support-directory', 'الكابتن يتعامل معه كتحديث تسليم/وصول.'),
      visibility('control-panel', 'primary', 'support/messaging', 'يظل تحت ملكية التصعيد والمتابعة.'),
    ],
    ownerSurface: 'app-captain', ownerLabel: 'الكابتن',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'info',
    allowedActions: ['فتح المحادثة', 'طلب إثبات محاولة التواصل', 'تصعيد عدم الاستجابة'],
    forbiddenActions: ['إلغاء الطلب مباشرة', 'تحويل المشكلة إلى داخلية للشريك'],
    relatedOrderState: 'customer_unresponsive', requiresEvidence: true,
    nextAction: 'أعد محاولة التواصل ثم افتح التصعيد إذا بقيت الحالة معلقة.',
  },
  {
    flowId: 'handoff-mismatch',
    title: 'عدم تطابق في التسليم',
    description: 'هناك تضارب بين الجهة المستلمة أو حالة الخروج ويجب تثبيت التسليم الصحيح قبل المتابعة.',
    surfaceVisibility: [
      visibility('app-partner', 'primary', 'order-handoff', 'الشريك يرى أثر handoff على الطلب.'),
      visibility('app-captain', 'primary', 'support-directory', 'الكابتن يرى handoff فقط ضمن رحلته.'),
      visibility('control-panel', 'primary', 'support/escalation', 'التصعيد المالك لتثبيت القرار النهائي.'),
    ],
    ownerSurface: 'app-captain', ownerLabel: 'الكابتن',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'danger',
    allowedActions: ['مراجعة التسليم', 'طلب إثبات', 'فتح محادثة مشتركة'],
    forbiddenActions: ['متابعة التوصيل قبل تثبيت التسليم', 'تجاوز الإثبات'],
    relatedOrderState: 'handoff_mismatch', requiresEvidence: true,
    nextAction: 'ثبّت الجهة الصحيحة ثم أعد الطلب إلى المسار السليم.',
  },
  {
    flowId: 'wrong-item',
    title: 'عنصر خاطئ أو غير مطابق',
    description: 'العنصر المجهز لا يطابق المرجع المطلوب ويجب إيقاف التنفيذ حتى المراجعة.',
    surfaceVisibility: [
      visibility('app-partner', 'primary', 'order-issue-queue', 'يبقى داخل مسار الطلب في الشريك.'),
      visibility('app-client', 'context-only', 'order-issue-workspace', 'العميل يراه كتذكرة مشكلة داخل الطلب.'),
      visibility('control-panel', 'primary', 'support/queue', 'يدخل صف النزاعات/الاستثناءات.'),
    ],
    ownerSurface: 'app-partner', ownerLabel: 'الشريك',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'warning',
    allowedActions: ['مراجعة المطابقة', 'طلب إثبات بصري', 'إعادة الطلب للتحضير'],
    forbiddenActions: ['إرسال الطلب كما هو', 'إغلاق الحالة قبل المطابقة'],
    relatedOrderState: 'wrong_item', requiresEvidence: true,
    nextAction: 'راجع المطابقة بصريًا ثم أعد الطلب للتحضير أو التسليم.',
  },
  {
    flowId: 'payment-refund-review',
    title: 'مراجعة دفع / استرداد',
    description: 'هذه إشارة تشغيلية فقط لحالة ذات أثر مالي محتمل. لا يوجد أي money mutation داخل DSH.',
    surfaceVisibility: [
      visibility('app-partner', 'escalation-only', 'support-directory', 'يظهر كتاغ أو bridge preview فقط.'),
      visibility('app-client', 'context-only', 'order-issue-workspace', 'العميل يراه كـ preview tag داخل الطلب.'),
      visibility('control-panel', 'primary', 'support/escalation', 'control-panel يملك قرار المراجعة والسياسة.'),
      visibility('wlt', 'reference-only', 'finance/refund-preview', 'WLT مرجعية فقط لأي أثر مالي.'),
    ],
    ownerSurface: 'control-panel', ownerLabel: 'لوحة التحكم',
    escalationOwner: 'wlt', escalationOwnerLabel: wltOwnerLabel,
    severity: 'info',
    allowedActions: ['تمييز الحالة Preview', 'تحويل للمراجعة', 'فتح مرجع WLT للقراءة فقط'],
    forbiddenActions: ['بدء استرداد', 'تعديل تسوية', 'تغيير عمولة أو ledger'],
    relatedOrderState: 'financial_review_pending',
    financialImpactRef: 'refund-adjustment / partner-settlement / store-courier-compensation',
    requiresEvidence: true,
    nextAction: 'صعّد الحالة للمراجعة التشغيلية واترك أي حساب مالي لـ WLT.',
  },
  {
    flowId: 'manual-call-intake',
    title: 'إدخال مكالمة يدوي',
    description: 'مكالمة خارجية تحتاج source = external_phone_manual والتحقق من الهوية قبل أي كشف حساس.',
    surfaceVisibility: [
      visibility('control-panel', 'primary', 'support/call-intake', 'يبقى داخل قسم الدعم ويفتح عند الحاجة فقط.'),
      visibility('app-client', 'context-only', 'orders', 'يرتبط بطلب العميل أو تذكرته من دون كشف بيانات جديدة.'),
    ],
    ownerSurface: 'control-panel', ownerLabel: 'الدعم',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'warning',
    allowedActions: ['تسجيل المكالمة', 'فتح Customer 360', 'تحويل إلى مساعدة الطلب بعد التحقق'],
    forbiddenActions: ['كشف الحقول الحساسة قبل التحقق', 'تغيير المصدر اليدوي', 'بدء refund محلي'],
    relatedOrderState: 'manual_call_intake',
    financialImpactRef: 'wlt-visibility-only',
    requiresEvidence: true,
    nextAction: 'أكمل الهوية أو أبقِ الحقول الحساسة محجوبة ثم افتح المسار المناسب.',
  },
  {
    flowId: 'customer-360-review',
    title: 'Customer 360',
    description: 'عرض موحّد للطلب والتذكرة ورؤية WLT المرجعية مع إجراءات سريعة إلى مساعدة الطلب وإنقاذ الطلب.',
    surfaceVisibility: [
      visibility('control-panel', 'primary', 'support/customer-360', 'يبقى داخل الدعم كمركز سياقي واحد.'),
      visibility('app-client', 'context-only', 'orders', 'يرتبط بسياق الطلب الفعلي فقط.'),
    ],
    ownerSurface: 'control-panel', ownerLabel: 'الدعم',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'info',
    allowedActions: ['فتح الطلب أو التذكرة', 'فتح مساعدة الطلب', 'فتح إنقاذ الطلب'],
    forbiddenActions: ['بدء refund أو settlement', 'نسخ منطق الشاشات العميلية', 'إغلاق ticket خارج owner الدعم'],
    relatedOrderState: 'customer_360_review',
    financialImpactRef: 'wlt-preview-links',
    requiresEvidence: false,
    nextAction: 'اجمع السياق أولاً ثم افتح workspace التدخل الصحيح بدل تكرار التنقل.',
  },
  {
    flowId: 'assisted-order-desk',
    title: 'مساعدة الطلب',
    description: 'معالجة طلبات المساعدة اليدوية وإعادة بناء السلة مع تثبيت البدائل وهويات العميل.',
    surfaceVisibility: [
      visibility('control-panel', 'primary', 'operations/assisted-order-desk', 'workspace تشغيلي مخصص للتدخل قبل الإنقاذ.'),
      visibility('app-client', 'context-only', 'orders', 'العميل يرى النتيجة فقط داخل الطلب.'),
      visibility('app-partner', 'context-only', 'orders', 'الشريك يرى أثر القرار على التنفيذ لا كامل المنطق.'),
    ],
    ownerSurface: 'control-panel', ownerLabel: 'العمليات',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'warning',
    allowedActions: ['إعادة بناء السلة', 'تثبيت البديل', 'فتح رؤية WLT المرجعية'],
    forbiddenActions: ['إرسال الطلب قبل الهوية', 'بدء money mutation', 'حل نزاع الشريك من داخل العمليات'],
    relatedOrderState: 'assisted_order_desk',
    financialImpactRef: 'payment-visibility-only',
    requiresEvidence: true,
    nextAction: 'إذا بقي المعوق التشغيلي مفتوحًا فحوّل الحالة مباشرة إلى إنقاذ الطلب.',
  },
  {
    flowId: 'order-rescue',
    title: 'إنقاذ الطلب',
    description: 'مكتب إنقاذ يحدد معوقاً واحداً ويثبت أفضل إجراء تالٍ عبر الدعم أو الشريك أو WLT المرجعي.',
    surfaceVisibility: [
      visibility('control-panel', 'primary', 'operations/order-rescue', 'يبقى داخل العمليات مع تسليم واضح للمالك الصحيح.'),
      visibility('app-client', 'context-only', 'orders', 'العميل يرى أثر الإنقاذ على حالته فقط.'),
      visibility('app-partner', 'context-only', 'orders', 'الشريك يرى أثر الحل على الطلب دون منطق rescue الكامل.'),
      visibility('wlt', 'reference-only', 'finance/refund-preview', 'تظهر الرؤية المالية المرجعية فقط عند الحاجة.'),
    ],
    ownerSurface: 'control-panel', ownerLabel: 'العمليات',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'danger',
    allowedActions: ['تحديد المعوق الرئيسي', 'فتح تذكرة دعم', 'فتح مرجع WLT', 'تحويل الحالة إلى الشريك أو الكتالوج أو الدعم'],
    forbiddenActions: ['إغلاق الحالة بلا معوق واضح', 'إطلاق استرداد محلي', 'تكرار نفس القرار عبر أكثر من مالك'],
    relatedOrderState: 'order_rescue',
    financialImpactRef: 'refund-visibility-only',
    requiresEvidence: true,
    nextAction: 'ثبّت المالك النهائي وأغلق التشتيت بدل فتح تدخلات متضاربة.',
  },
  {
    flowId: 'delivery-failed',
    title: 'تعذر التسليم',
    description: 'التسليم لم يكتمل ويجب تثبيت السبب والإثبات قبل إعادة المحاولة أو الإغلاق.',
    surfaceVisibility: [
      visibility('app-client', 'context-only', 'tracking', 'العميل يراه داخل تتبع الطلب فقط.'),
      visibility('app-captain', 'primary', 'support-directory', 'الكابتن يعالجه ضمن مسار التسليم.'),
      visibility('control-panel', 'primary', 'support/queue', 'صف تدخلات التسليم والإسناد.'),
    ],
    ownerSurface: 'app-captain', ownerLabel: 'الكابتن',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'danger',
    allowedActions: ['تثبيت سبب الفشل', 'طلب محاولة تواصل أخيرة', 'رفع التصعيد'],
    forbiddenActions: ['إغلاق الطلب بلا سبب', 'مطالبة العميل بدعم خارج سياق الطلب'],
    relatedOrderState: 'delivery_failed', requiresEvidence: true,
    nextAction: 'ثبّت السبب ثم قرر بين إعادة المحاولة أو التصعيد.',
  },
  {
    flowId: 'proof-of-delivery',
    title: 'إثبات التسليم',
    description: 'إثبات التسليم يجب أن يبقى on-demand ويُراجع قبل الإغلاق النهائي للحالة.',
    surfaceVisibility: [
      visibility('app-captain', 'primary', 'proof-upload', 'الكابتن يرفع الإثبات ضمن مساره فقط.'),
      visibility('control-panel', 'primary', 'support/escalation', 'control-panel يراجع الإثبات ضمن audit/support.'),
    ],
    ownerSurface: 'app-captain', ownerLabel: 'الكابتن',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'warning',
    allowedActions: ['رفع الإثبات', 'طلب إعادة الالتقاط', 'مراجعة audit trail'],
    forbiddenActions: ['إغلاق التسليم دون إثبات', 'تضمين صور ثقيلة دائمًا في state'],
    relatedOrderState: 'proof_pending', requiresEvidence: true,
    nextAction: 'ارفع الإثبات أو اطلب إعادة الالتقاط قبل إغلاق الرحلة.',
  },
  {
    flowId: 'store-wait-time',
    title: 'انتظار داخل الفرع',
    description: 'الكابتن أو الموصل ينتظر داخل الفرع لأن الطلب أو التسليم لم يثبت بعد.',
    surfaceVisibility: [
      visibility('app-partner', 'context-only', 'order-prepare', 'يظهر كأثر استعداد داخل الفرع.'),
      visibility('app-captain', 'primary', 'support-directory', 'الكابتن يرى مشكلة الانتظار ضمن الالتقاط فقط.'),
      visibility('control-panel', 'primary', 'support/queue', 'تدخل لتخفيف ضغط الفرع أو تثبيت السبب.'),
    ],
    ownerSurface: 'app-partner', ownerLabel: 'الشريك',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'warning',
    allowedActions: ['تثبيت زمن الانتظار', 'فتح التسليم', 'تصعيد ضغط الفرع'],
    forbiddenActions: ['تحميل الكابتن السبب دون توثيق', 'إخفاء المشكلة من سجل الطلب'],
    relatedOrderState: 'store_wait_time', requiresEvidence: false,
    nextAction: 'ثبّت سبب الانتظار ثم حرّك الطلب إلى التسليم أو التصعيد.',
  },
  {
    flowId: 'catalog-barcode-issue',
    title: 'مشكلة كتالوج / باركود',
    description: 'المنتج أو الباركود أو ربط الإدخال يحتاج مراجعة ميدانية قبل أن يؤثر على الكتالوج المنشور.',
    surfaceVisibility: [
      visibility('app-field', 'primary', 'stores > onboarding > products', 'يبقى داخل ملف الإدخال أو التصحيح.'),
      visibility('control-panel', 'escalation-only', 'support/queue', 'يظهر عند الحاجة لتصعيد الحوكمة أو النشر.'),
    ],
    ownerSurface: 'app-field', ownerLabel: 'الميداني',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'warning',
    allowedActions: ['تصحيح المرجع', 'إضافة إثبات ميداني', 'تصعيد للنشر/الكتالوج'],
    forbiddenActions: ['تعديل أسعار نهائية للشريك دون صلاحية', 'نشر منتج غير متحقق'],
    relatedOrderState: 'catalog_binding_issue', requiresEvidence: true,
    nextAction: 'صحّح المرجع أو صعّد مشكلة الكتالوج قبل النشر.',
  },
  {
    flowId: 'branch-readiness-escalation',
    title: 'تصعيد جاهزية الفرع',
    description: 'الفرع غير جاهز تشغيلًا أو تعاقديًا ويحتاج تصعيدًا واضحًا لمالك السياسة والتفعيل.',
    surfaceVisibility: [
      visibility('app-field', 'primary', 'readiness-escalation', 'مسار ميداني مملوك للجاهزية والتحقق.'),
      visibility('control-panel', 'primary', 'support/escalation', 'الجهة المالكة لقرار التصعيد والسياسة.'),
    ],
    ownerSurface: 'app-field', ownerLabel: 'الميداني',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'danger',
    allowedActions: ['رفع بلاغ جاهزية', 'تجميع النواقص', 'تحويل القرار للوحة التحكم'],
    forbiddenActions: ['تفعيل الفرع رغم النواقص', 'ربط أي settlement محلي'],
    relatedOrderState: 'branch_not_ready', requiresEvidence: true,
    nextAction: 'اجمع النواقص ثم صعّد الحالة لقرار readiness واضح.',
  },
  {
    flowId: 'field-proof-required',
    title: 'إثبات ميداني مطلوب',
    description: 'هناك دليل ميداني مطلوب لتثبيت زيارة أو تحقق أو استثناء قبل قبول الحالة.',
    surfaceVisibility: [
      visibility('app-field', 'context-only', 'visit', 'الدليل يظهر فقط عند فتح الزيارة أو المراجعة.'),
      visibility('control-panel', 'escalation-only', 'support/escalation', 'يدخل audit trail عند التصعيد.'),
    ],
    ownerSurface: 'app-field', ownerLabel: 'الميداني',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'info',
    allowedActions: ['فتح الزيارة', 'إرفاق دليل مختصر', 'إعادة المحاولة'],
    forbiddenActions: ['تحميل صور ثقيلة دائمًا', 'إغلاق الحالة بلا دليل عند طلبه'],
    relatedOrderState: 'field_proof_required', requiresEvidence: true,
    nextAction: 'افتح الزيارة وأرفق الدليل عند الطلب فقط.',
  },
  {
    flowId: 'store-nomination-intake',
    title: 'ترشيح / إدخال متجر',
    description: 'هذا مسار field-owned لجمع بيانات الترشيح والانضمام دون تحويله إلى شاشة مالية أو تشغيلية عامة.',
    surfaceVisibility: [
      visibility('app-field', 'context-only', 'stores > onboarding', 'يبقى ضمن ملف الانضمام الواحد.'),
      visibility('control-panel', 'escalation-only', 'support/queue', 'يظهر فقط عند الحاجة لمراجعة استثنائية.'),
    ],
    ownerSurface: 'app-field', ownerLabel: 'الميداني',
    escalationOwner: 'partner-management', escalationOwnerLabel: pmOwnerLabel,
    severity: 'success',
    allowedActions: ['استكمال الإدخال', 'حفظ مسودة', 'تحويل للمراجعة'],
    forbiddenActions: ['تفعيل نهائي دون مراجعة', 'إسناد أي أثر مالي محلي'],
    relatedOrderState: 'store_nomination_intake', requiresEvidence: false,
    nextAction: 'استكمل ملف الانضمام ثم حوّله للمراجعة.',
  },
  {
    flowId: 'auction-status-update',
    title: 'Auction Status Update',
    description: 'legacy compat flow موجود للمستهلكين القدامى فقط ولا يجب أن يظهر كمدخل أساسي.',
    surfaceVisibility: [
      visibility('app-partner', 'hidden-compat', 'auction-status-update', 'legacy registry consumer only.'),
    ],
    ownerSurface: 'app-partner', ownerLabel: 'الشريك',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'info',
    allowedActions: ['الاحتفاظ بالتوافق'],
    forbiddenActions: ['إظهاره كخيار أساسي'],
    relatedOrderState: 'legacy_hidden_compat', requiresEvidence: false,
    nextAction: 'ابقه مخفيًا واستخدم المسارات الحالية بدلًا منه.',
    hiddenCompat: true,
  },
  {
    flowId: 'order-rejection',
    title: 'Order Rejection Legacy Route',
    description: 'legacy compat route يوازي مسار رفض الطلب الحالي ولا يجب أن يعود كمسار أساسي مستقل.',
    surfaceVisibility: [
      visibility('app-partner', 'hidden-compat', 'order-rejection', 'legacy route only.'),
    ],
    ownerSurface: 'app-partner', ownerLabel: 'الشريك',
    escalationOwner: 'control-panel', escalationOwnerLabel: cpOwnerLabel,
    severity: 'info',
    allowedActions: ['الاحتفاظ بالتوافق'],
    forbiddenActions: ['عرضه كصفحة أساسية منفصلة'],
    relatedOrderState: 'legacy_hidden_compat', requiresEvidence: false,
    nextAction: 'استخدم partner-reject-request بدل هذا alias القديم.',
    hiddenCompat: true,
  },
] as const;

export const DSH_OPERATIONS_SUPPORT_HIDDEN_COMPAT_FLOW_IDS = DSH_OPERATIONS_SUPPORT_FLOWS
  .filter((item) => item.hiddenCompat)
  .map((item) => item.flowId) as readonly DshOperationsSupportFlowId[];

export const DSH_OPERATIONS_SUPPORT_FLOWS_BY_ID = Object.fromEntries(
  DSH_OPERATIONS_SUPPORT_FLOWS.map((item) => [item.flowId, item])
) as Record<DshOperationsSupportFlowId, DshOperationsSupportFlowSpec>;

export function getOperationsSupportFlowSpec(flowId: DshOperationsSupportFlowId): DshOperationsSupportFlowSpec {
  return DSH_OPERATIONS_SUPPORT_FLOWS_BY_ID[flowId];
}

function getOperationsSupportSurfaceEntry(
  flowId: DshOperationsSupportFlowId,
  surfaceId: DshOperationsSupportSurfaceId,
): DshOperationsSupportFlowVisibility | undefined {
  return getOperationsSupportFlowSpec(flowId).surfaceVisibility.find((e) => e.surfaceId === surfaceId);
}

export function getOperationsSupportFlowsForSurface(
  surfaceId: DshOperationsSupportSurfaceId,
  options: { includeHiddenCompat?: boolean; includeReferenceOnly?: boolean } = {},
): readonly DshOperationsSupportFlowSpec[] {
  return DSH_OPERATIONS_SUPPORT_FLOWS.filter((item) => {
    const entry = item.surfaceVisibility.find((e) => e.surfaceId === surfaceId);
    if (!entry) return false;
    if (entry.mode === 'reference-only' && !options.includeReferenceOnly) return false;
    if (entry.mode === 'hidden-compat' && !options.includeHiddenCompat) return false;
    return true;
  });
}

function isOperationsSupportHiddenCompatFlow(flowId: DshOperationsSupportFlowId): boolean {
  return DSH_OPERATIONS_SUPPORT_HIDDEN_COMPAT_FLOW_IDS.includes(flowId);
}
