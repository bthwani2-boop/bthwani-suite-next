import type { GeoHeatmapZone } from './geo-heatmap.helpers';

export type DshOpsApprovalOrder = {
  id: string;
  fulfillmentMode: string;
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  paymentMethod: string;
  paymentStatus: string;
  couponCode?: string;
  customerNote?: string;
  customerInstructions?: string;
  cartItems: { title: string; priceLabel: string; qty: number }[];
  totalLabel: string;
  eventLog: { status: string; actor: string; timestamp: string }[];
};

export type AssistedOrderVerificationStatus = 'verified' | 'required' | 'blocked';
export type AssistedOrderServiceabilityStatus = 'serviceable' | 'blocked';
export type AssistedOrderCartItemStatus = 'active' | 'substitute' | 'unavailable';

export type AssistedLookupInput = {
  key: string;
  label?: string;
  value: string;
  [key: string]: unknown;
};

export type AssistedVerificationStep = {
  stepId: string;
  label: string;
  completed: boolean;
  [key: string]: unknown;
};

export type AssistedOrderCartItem = {
  sku: string;
  name: string;
  quantity: number;
  status: AssistedOrderCartItemStatus;
  published?: boolean;
  note?: string;
  [key: string]: unknown;
};

import type { DshFulfillmentDeliveryMode } from '../delivery/delivery.contract';

export type AssistedDeliveryModeOption = {
  modeId: DshFulfillmentDeliveryMode;
  label: string;
  [key: string]: unknown;
};

export type AssistedOrderDesk = {
  deskId: string;
  orderId?: string;
  customerId: string;
  ticketId?: string;
  customerName: string;
  basketSummary: string;
  nextAction: string;
  auditFlags: string[];
  lookupPanel: {
    inputs: AssistedLookupInput[];
  };
  identityVerification: {
    verificationStatus: AssistedOrderVerificationStatus;
    verificationSteps: AssistedVerificationStep[];
  };
  cartBuilderPreview: {
    items: AssistedOrderCartItem[];
  };
  deliveryModeSelector: {
    selectedMode: DshFulfillmentDeliveryMode;
    options: AssistedDeliveryModeOption[];
  };
  serviceabilitySummary: {
    serviceabilityStatus: AssistedOrderServiceabilityStatus;
    zoneLabel: string;
  };
  wltReadOnlyHandoff: {
    calculationTruthOwner: string;
    paymentVisibility: string;
    refundVisibility: string;
    settlementVisibility?: string;
    [key: string]: string | undefined;
  };
  auditReason: {
    reasonLabel: string;
    operatorNote: string;
    [key: string]: string;
  };
  submitDraftPreview: {
    nextAction: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ApiDiscoveryStore = {
  id: string;
  name: string;
  address: string;
  status_label: string;
  status_tone: 'open' | 'closed';
  delivery_label: string;
  service_label: string;
  has_offer: boolean;
  publish_stage: string;
};

export const MOCK_TOP_SUGGESTIONS = [
  {
    id: 'sug-1',
    label: 'تكدس شمال الرياض — فعّل الحافز فورًا',
    reason: '45 طلب بدون كابتن في منطقة الشمال',
    confidence: 'high' as const,
    action: 'فتح المناطق',
    workspace: 'area-capacity' as const,
    risk: 'critical' as const,
  },
  {
    id: 'sug-2',
    label: '32 طلب بدون إسناد — تدخّل الآن',
    reason: 'قائمة الإسناد تتراكم وكباتن متاحون غير مستغلين',
    confidence: 'high' as const,
    action: 'فتح الإسناد',
    workspace: 'dispatch-assignment' as const,
    risk: 'high' as const,
  },
  {
    id: 'sug-3',
    label: '12 استثناء مفتوح — راجع قائمة الإسناد',
    reason: 'استثناءات بدون مالك تزيد من خطر خرق SLA',
    confidence: 'medium' as const,
    action: 'فتح الاستثناءات',
    workspace: 'exceptions-escalations' as const,
    risk: 'medium' as const,
  },
] as const;

export const MOCK_QUICK_ACTIONS = [
  { id: 'QA-1', label: 'إعادة إسناد 12 طلب متأخر', time: 'منذ 5 دقائق', workspace: 'dispatch-assignment' as const },
  { id: 'QA-2', label: 'تواصل مع المتجر رقم 402', time: 'منذ 12 دقيقة', workspace: 'partner-stores' as const },
  { id: 'QA-3', label: 'تصعيد شكوى عميل (تأخير)', time: 'منذ 18 دقيقة', workspace: 'audit-support-sla' as const },
] as const;

export const MOCK_PENDING_APPROVAL_ORDERS: DshOpsApprovalOrder[] = [
  {
    id: 'ORD-9021',
    fulfillmentMode: 'bthwani_delivery',
    pickupAddress: 'شاورما جليلة - طريق الملك عبدالعزيز',
    dropoffAddress: 'الياسمين - شارع القلعة - فيلا 12',
    customerName: 'عبدالرحمن آل سعود',
    customerPhone: '+966501234567',
    storeName: 'شاورما جليلة',
    paymentMethod: 'WLT wallet',
    paymentStatus: 'paid',
    couponCode: 'BTHWANI5',
    customerNote: 'يرجى وضع الثوم الإضافي',
    customerInstructions: 'ترك الطلب عند الباب والدق خفيفاً',
    cartItems: [
      { title: 'وجبة شاورما عربي دبل', priceLabel: '35 ر.س', qty: 2 },
      { title: 'بطاطس مقلية كبير', priceLabel: '10 ر.س', qty: 1 },
      { title: 'عصير برتقال طازج', priceLabel: '12 ر.س', qty: 2 }
    ],
    totalLabel: '104 ر.س',
    eventLog: [
      { status: 'تم إنشاء الطلب', actor: 'العميل', timestamp: '10:14' },
      { status: 'تم قبول الطلب', actor: 'المتجر', timestamp: '10:16' },
      { status: 'بانتظار إسناد كابتن', actor: 'النظام', timestamp: '10:17' }
    ]
  },
  {
    id: 'ORD-7742',
    fulfillmentMode: 'pickup',
    pickupAddress: 'مخبز الأفران الحديثة - السليمانية',
    dropoffAddress: 'استلام بنفسي من الفرع',
    customerName: 'فهد المطيري',
    customerPhone: '+966559876543',
    storeName: 'مخبز الأفران الحديثة',
    paymentMethod: 'Credit Card',
    paymentStatus: 'paid',
    cartItems: [
      { title: 'كرواسون جبن فرنسي', priceLabel: '8 ر.س', qty: 5 },
      { title: 'قهوة أمريكانو حار', priceLabel: '15 ر.س', qty: 1 }
    ],
    totalLabel: '55 ر.س',
    eventLog: [
      { status: 'تم إنشاء الطلب', actor: 'العميل', timestamp: '09:45' },
      { status: 'تم التحضير وجاهز للاستلام', actor: 'المتجر', timestamp: '10:02' }
    ]
  }
];

export const MOCK_GEO_HEATMAP_ZONES: GeoHeatmapZone[] = [
  {
    id: 'N-01',
    name: 'شمال الرياض - الياسمين',
    severity: 'danger',
    confidence: 'عالية',
    demandOrders: 45,
    activeCaptains: 12,
    storePressure: 'حرج',
    slaRisk: 'حرج',
    supplyDemandGap: 33,
    delayedPickups: 8,
    filterKey: 'peak',
    recommendedAction: 'تفعيل حافز الطلب المتراكم (+5 ر.س)',
    expectedImpact: 'جذب 15 كابتن خلال 10 دقائق وتقليل وقت الانتظار بنسبة 35%',
  },
  {
    id: 'E-02',
    name: 'شرق الرياض - الروابي',
    severity: 'warning',
    confidence: 'متوسطة',
    demandOrders: 28,
    activeCaptains: 20,
    storePressure: 'مرتفع',
    slaRisk: 'مرتفع',
    supplyDemandGap: 8,
    delayedPickups: 2,
    filterKey: 'captains',
    recommendedAction: 'تعديل نصف قطر الإسناد للمنطقة المجاورة',
    expectedImpact: 'تغطية الفجوة خلال 15 دقيقة بنسبة SLA مقبولة',
  },
  {
    id: 'C-03',
    name: 'وسط الرياض - العليا',
    severity: 'best',
    confidence: 'عالية',
    demandOrders: 15,
    activeCaptains: 25,
    storePressure: 'منخفض',
    slaRisk: 'مستقر',
    supplyDemandGap: -10,
    delayedPickups: 0,
    filterKey: 'orders',
    recommendedAction: 'لا إجراء مطلوب - حالة مستقرة',
    expectedImpact: 'استقرار الأداء التشغيلي',
  },
];

export const MOCK_ASSISTED_DESKS: AssistedOrderDesk[] = [
  {
    deskId: 'desk-101',
    orderId: 'ORD-5521',
    customerId: 'CUST-8802',
    ticketId: 'TCK-3341',
    customerName: 'سارة العتيبي',
    basketSummary: 'سلة تموينات متنوعة (5 أصناف)',
    nextAction: 'تأكيد الهوية وإسناد موصل',
    auditFlags: ['SLA متأخر', 'تعديل سلة يدوياً'],
    lookupPanel: {
      inputs: [
        { key: 'phone', label: 'رقم الهاتف المعلق', value: '+966504445556' },
        { key: 'address', label: 'عنوان التوصيل المقترح', value: 'حي الملقا - شارع الظهران' }
      ]
    },
    identityVerification: {
      verificationStatus: 'required',
      verificationSteps: [
        { stepId: 'step-1', label: 'التأكد من رقم جوال العميل', completed: true },
        { stepId: 'step-2', label: 'مطابقة موقع التوصيل الفعلي', completed: false }
      ]
    },
    cartBuilderPreview: {
      items: [
        { sku: 'SKU-001', name: 'حليب كامل الدسم 1 لتر', quantity: 2, status: 'active' },
        { sku: 'SKU-002', name: 'خبز التوست أبيض', quantity: 1, status: 'active' },
        { sku: 'SKU-003', name: 'بيض طازج طبق 30 حبة', quantity: 1, status: 'substitute', note: 'بديل لبيض الوطنية' }
      ]
    },
    deliveryModeSelector: {
      selectedMode: 'bthwani_delivery' as DshFulfillmentDeliveryMode,
      options: [
        { modeId: 'bthwani_delivery' as DshFulfillmentDeliveryMode, label: 'توصيل بثواني (متاح)' },
        { modeId: 'partner_delivery' as DshFulfillmentDeliveryMode, label: 'توصيل المتجر' },
        { modeId: 'pickup' as DshFulfillmentDeliveryMode, label: 'استلام ذاتي' }
      ]
    },
    serviceabilitySummary: {
      serviceabilityStatus: 'serviceable',
      zoneLabel: 'Riyadh / Al Yasmin'
    },
    wltReadOnlyHandoff: {
      calculationTruthOwner: 'DSH & WLT',
      paymentVisibility: 'Paid via WLT wallet snapshot — read-only visibility.',
      refundVisibility: 'Refund execution remains WLT-owned; DSH displays status only.',
    },
    auditReason: {
      reasonLabel: 'Assisted order rebuild after manual call confirmation.',
      operatorNote: 'تم الاتصال بالعميلة وتأكيد تفاصيل الباقة البديلة للبيض.'
    },
    submitDraftPreview: {
      nextAction: 'إرسال مسودة للعميل للموافقة على السلة البديلة'
    }
  }
];

export const MOCK_PARTNER_STORES: ApiDiscoveryStore[] = [
  {
    id: 'store-1',
    name: 'سوبرماركت النخبة',
    address: 'الرياض - حي الياسمين',
    status_label: 'مفتوح',
    status_tone: 'open',
    delivery_label: 'توصيل متاح',
    service_label: 'نشط',
    has_offer: true,
    publish_stage: 'client-visible',
  },
  {
    id: 'store-2',
    name: 'صيدلية الدواء الذهبية',
    address: 'الرياض - حي العليا',
    status_label: 'مغلق مؤقتاً',
    status_tone: 'closed',
    delivery_label: 'توصيل غير متاح',
    service_label: 'ضغط تشغيلي مرتفع',
    has_offer: false,
    publish_stage: 'partner-review',
  }
];
