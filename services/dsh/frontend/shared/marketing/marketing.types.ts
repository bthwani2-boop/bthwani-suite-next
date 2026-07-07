export type DshMarketingTargetType =
  | "home" | "stores" | "store" | "category" | "subcategory"
  | "product" | "offer" | "campaign" | "search" | "custom";

export type DshCampaign = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly targetType?: DshMarketingTargetType;
  readonly targetId?: string;
  readonly audience: string;
  readonly placement?: string;
  readonly createdBy: string;
  readonly archivedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshMarketingState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly items: readonly T[] }
  | { readonly kind: "error"; readonly message: string };

// --- Extended Marketing Types (Aligned with Donor and Sovereign Brains) ---

export type MarketingBannerActionType =
  | 'main_category'
  | 'sub_category'
  | 'store'
  | 'store_category'
  | 'product'
  | 'external'
  | 'subscription';

export type MarketingBannerAudience = 'home' | 'stores' | 'client' | 'all';
export type MarketingBannerStatus = 'draft' | 'published';
export type MarketingBannerMotionStyle = 'slide' | 'soft-parallax' | 'subtle-fade' | 'snap-focus';

export type MarketingBannerRecord = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  mediaKey?: string;
  accentColor?: string;
  audience: MarketingBannerAudience;
  status: MarketingBannerStatus;
  actionType: MarketingBannerActionType;
  actionTarget?: string;
  actionExtra?: string;
  ctaLabel?: string;
  partnerName?: string;
  position: number;
  clicks: number;
  impressions: number;
  scheduleStartHour?: number;
  scheduleEndHour?: number;
  updatedAt: string;
  templateId?: string;
  offerBadgeText?: string;
  offerBadgeColor?: string;
  offerBadgePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  partnerLogoUrl?: string;
  partnerLogoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  overlayImageUrl?: string;
  overlayPosition?: 'center' | 'bottom' | 'top' | 'fill';
  overlayOpacity?: number;
  titlePlacement?: 'top' | 'center' | 'bottom';
  subtitlePlacement?: 'top' | 'center' | 'bottom';
  ctaPlacement?: 'top' | 'center' | 'bottom' | 'left' | 'right';
  imageFit?: 'cover' | 'contain';
  motionStyle?: MarketingBannerMotionStyle;
  autoplayEnabled?: boolean;
  autoplayIntervalMs?: number;
  pauseOnInteraction?: boolean;
};

export type CampaignStatus = 'draft' | 'pending' | 'published' | 'paused' | 'archived';
export type CampaignGoal = 'awareness' | 'conversion' | 'retention' | 'acquisition';
export type CampaignAudience = 'all' | 'client' | 'operations' | 'targeted';
export type CampaignChannel = 'banner' | 'promo' | 'video' | 'ticker' | 'store-card';
export type CampaignPlacement = 'hero' | 'feed' | 'floating' | 'banner';
export type CampaignPriority = 'low' | 'normal' | 'high' | 'critical';
export type CampaignTargetType = 'home' | 'stores' | 'store' | 'category' | 'subcategory' | 'product' | 'offer' | 'campaign' | 'search' | 'custom';

export type CampaignRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: CampaignStatus;
  priority: CampaignPriority;
  goal: CampaignGoal;
  audience: CampaignAudience;
  channels: CampaignChannel[];
  placement: CampaignPlacement;
  targetType: CampaignTargetType;
  targetId: string;
  linkedBannerId?: string;
  linkedVideoId?: string;
  linkedOfferId?: string;
  linkedLoyaltyBenefitId?: string;
  startDate?: string;
  endDate?: string;
  impressions: number;
  clicks: number;
};

export type HomePromoStatus =
  | 'draft'
  | 'review'
  | 'eligible'
  | 'active'
  | 'exhausted'
  | 'expired'
  | 'paused'
  | 'archived'
  | 'published';

type HomePromoRecord = {
  id: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  ctaText?: string;
  accentColor?: string;
  imageUrl?: string;
  thumbnail?: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  status: HomePromoStatus;
  order: number;
  audienceScope?: 'all' | 'guest' | 'customer' | 'premium';
  placement: 'home-promo';
  updatedAt: string;
};

export type MarketingVideoStatus = 'published' | 'draft' | 'review' | 'paused';
export type MarketingVideoAudience = 'all' | 'client' | 'operations';
export type MarketingVideoSource = 'marketing' | 'partner';
export type MarketingVideoTargetType =
  | 'home'
  | 'stores'
  | 'store'
  | 'category'
  | 'subcategory'
  | 'product'
  | 'offer'
  | 'campaign'
  | 'search'
  | 'custom'
  | 'loyalty';

type MarketingVideoRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: MarketingVideoStatus;
  audience: MarketingVideoAudience;
  source: MarketingVideoSource;
  videoUrl: string;
  posterUrl: string;
  durationSeconds: number;
  mute: boolean;
  autoplay: boolean;
  loop: boolean;
  ctaLabel: string;
  highlight: string;
  targetType: MarketingVideoTargetType;
  targetId: string;
  targetExtra?: string;
  order: number;
  impressions: number;
  clicks: number;
  reviewState: 'none' | 'pending' | 'approved' | 'rejected';
};

export type MarketingGrowthFamily =
  | 'campaign'
  | 'promotion'
  | 'subscription'
  | 'shorts';
export type MarketingGrowthSource = 'marketing' | 'partner';
export type MarketingGrowthStatus = 'draft' | 'pending-marketing' | 'published' | 'paused';
export type MarketingGrowthAudience = 'all' | 'client' | 'operations';
export type MarketingGrowthRouteTarget =
  | 'home'
  | 'stores'
  | 'store'
  | 'category'
  | 'product'
  | 'search';

type MarketingGrowthRecord = {
  id: string;
  title: string;
  subtitle: string;
  family: MarketingGrowthFamily;
  status: MarketingGrowthStatus;
  audience: MarketingGrowthAudience;
  source: MarketingGrowthSource;
  routeTarget: MarketingGrowthRouteTarget;
  routeTargetId?: string;
  routeTargetExtra?: string;
  ctaLabel: string;
  highlight: string;
  metricValue: string;
  accentColor: string;
  impressions: number;
  clicks: number;
};

// --- Control-Panel Editor Types ---

type MarketingControlView =
  | 'visibility'
  | 'ticker'
  | 'banners'
  | 'promos'
  | 'video'
  | 'campaigns'
  | 'partners'
  | 'media-review'
  | 'loyalty'
  | 'growth'
  | 'signals'
  | 'approval-queue'
  | 'video-review';

type MarketingCommandDeckTab =
  | 'ticker'
  | 'banners'
  | 'promos'
  | 'video'
  | 'campaigns'
  | 'partners'
  | 'media-review'
  | 'loyalty'
  | 'growth'
  | 'signals';

export type MarketingReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

type MarketingReviewItem = {
  id: string;
  type: 'banner' | 'video' | 'promo';
  title: string;
  submittedAt: string;
  status: MarketingReviewStatus;
  submittedBy: string;
};

// --- Banner Editor Types ---

export type SmartBannerTargetType =
  | 'home' | 'stores' | 'store' | 'category' | 'subcategory'
  | 'product' | 'offer' | 'subscription' | 'campaign' | 'tracking'
  | 'orders' | 'loyalty' | 'custom';

type SmartTargetSummary = {
  type?: SmartBannerTargetType;
  id?: string;
  label: string;
  targetId?: string;
  targetLabel?: string;
  finalRoute?: string;
};

export type BannerImageFit = 'cover' | 'contain';
export type BannerLogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type EditorTab = 'content' | 'media' | 'target' | 'publish';
type SmartTargetStoreFilter = 'all' | 'offers' | 'favorites' | 'available';

type BannerDraft = Record<
  | 'title'
  | 'subtitle'
  | 'imageUrl'
  | 'ctaLabel'
  | 'highlight'
  | 'targetId'
  | 'targetExtra'
  | 'actionTarget'
  | 'actionExtra'
  | 'partnerName'
  | 'position'
  | 'templateId'
  | 'offerBadgeText'
  | 'offerBadgeColor'
  | 'offerBadgePosition'
  | 'partnerLogoUrl'
  | 'partnerLogoPosition'
  | 'overlayImageUrl'
  | 'overlayPosition'
  | 'titlePlacement'
  | 'motionStyle'
  | 'autoplayIntervalMs'
  | 'order',
  string
> & {
  id?: string;
  mediaKey?: string;
  accentColor?: string;
  actionType?: MarketingBannerRecord['actionType'];
  status: MarketingBannerStatus;
  audience: MarketingBannerAudience;
  targetType: SmartBannerTargetType;
  motion: MarketingBannerMotionStyle;
  imageFit: BannerImageFit;
  logoPosition: BannerLogoPosition;
  partnerLogoPosition: BannerLogoPosition;
  overlayImageUrl?: string;
  autoplayEnabled?: boolean;
  pauseOnInteraction?: boolean;
  reviewState: 'none' | 'pending' | 'approved' | 'rejected';
  subscriptionId?: string;
};

const SMART_TARGET_OPTIONS: ReadonlyArray<{ value: SmartBannerTargetType; label: string; description: string }> = [
  { value: 'home', label: 'الرئيسية', description: 'توجيه المستخدم إلى واجهة DSH الرئيسية.' },
  { value: 'stores', label: 'المتاجر', description: 'فتح قائمة المتاجر المتاحة في نفس تصنيف المتجر.' },
  { value: 'store', label: 'متجر', description: 'توجيه المستخدم لمتجر محدد.' },
  { value: 'category', label: 'تصنيف', description: 'توجيه المستخدم لتصنيف رئيسي.' },
  { value: 'subcategory', label: 'تصنيف فرعي', description: 'فتح تصنيف فرعي لعرض المنتجات.' },
  { value: 'product', label: 'منتج', description: 'توجيه المستخدم لصفحة منتج محدد.' },
  { value: 'offer', label: 'عرض', description: 'توجيه المستخدم لصفحة عرض ترويجي.' },
  { value: 'subscription', label: 'الاشتراكات', description: 'فتح صفحة الاشتراكات.' },
  { value: 'campaign', label: 'حملة', description: 'توجيه المستخدم لصفحة تفاصيل حملة نشطة.' },
  { value: 'tracking', label: 'التتبع', description: 'توجيه المستخدم لصفحة تتبع الطلبات.' },
  { value: 'orders', label: 'الطلبات', description: 'توجيه المستخدم لقائمة طلباته السابقة.' },
  { value: 'loyalty', label: 'الولاء', description: 'فتح صفحة برنامج الولاء والنقاط.' },
  { value: 'custom', label: 'مخصص', description: 'رابط خارجي أو مخصص.' },
];

const SUBSCRIPTION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [];

const BANNER_MOTION_OPTIONS: ReadonlyArray<{ value: MarketingBannerMotionStyle; label: string; description: string }> = [
  { value: 'slide', label: 'انزلاق', description: 'انتقال البنرات أفقياً بسلاسة.' },
  { value: 'soft-parallax', label: 'تأثير العمق', description: 'حركة بارالاكس خفيفة للبنر عند التمرير.' },
  { value: 'subtle-fade', label: 'تلاشي تدريجي', description: 'تأثير تلاشي ناعم عند تبديل الصور.' },
  { value: 'snap-focus', label: 'تركيز سريع', description: 'انتقال خاطف وسريع يركز على المحتوى.' },
];

const IMAGE_FIT_TAB_ITEMS: ReadonlyArray<{ value: BannerImageFit; label: string }> = [
  { value: 'cover', label: 'تغطية' },
  { value: 'contain', label: 'احتواء' },
];

const LOGO_POSITION_TAB_ITEMS: ReadonlyArray<{ value: BannerLogoPosition; label: string }> = [
  { value: 'top-left', label: 'أعلى اليسار' },
  { value: 'top-right', label: 'أعلى اليمين' },
  { value: 'bottom-left', label: 'أسفل اليسار' },
  { value: 'bottom-right', label: 'أسفل اليمين' },
];

// --- Video Editor Types ---

type VideoDraft = Record<
  | 'title'
  | 'subtitle'
  | 'videoUrl'
  | 'posterUrl'
  | 'durationSeconds'
  | 'ctaLabel'
  | 'highlight'
  | 'targetId'
  | 'targetExtra'
  | 'order',
  string
> & {
  id?: string;
  status: MarketingVideoStatus;
  audience: MarketingVideoAudience;
  source: MarketingVideoSource;
  mute: boolean;
  autoplay: boolean;
  loop: boolean;
  targetType: MarketingVideoTargetType;
  reviewState: 'none' | 'pending' | 'approved' | 'rejected';
};

type VideoEditorWorkspaceTab = 'content' | 'media' | 'target' | 'publish';

export const VIDEO_TARGET_TYPE_OPTIONS: Array<{
  value: MarketingVideoTargetType;
  label: string;
  description: string;
}> = [
  { value: 'home', label: 'الرئيسية', description: 'توجيه المستخدم إلى واجهة DSH الرئيسية.' },
  { value: 'stores', label: 'المتاجر', description: 'فتح قائمة المتاجر المتاحة في نفس تصنيف المتجر.' },
  { value: 'store', label: 'متجر', description: 'توجيه المستخدم لمتجر محدد.' },
  { value: 'category', label: 'تصنيف', description: 'توجيه المستخدم لتصنيف رئيسي.' },
  { value: 'subcategory', label: 'تصنيف فرعي', description: 'فتح تصنيف فرعي لعرض المنتجات.' },
  { value: 'product', label: 'منتج', description: 'توجيه المستخدم لصفحة منتج محدد.' },
  { value: 'offer', label: 'عرض', description: 'توجيه المستخدم لصفحة عرض ترويجي.' },
  { value: 'campaign', label: 'حملة', description: 'توجيه المستخدم لصفحة تفاصيل حملة نشطة.' },
  { value: 'search', label: 'البحث', description: 'توجيه المستخدم لصفحة البحث.' },
  { value: 'custom', label: 'مخصص', description: 'رابط مخصص أو خارجي.' },
];

export type BannerTemplate = {
  readonly id: string;
  readonly label: string;
  readonly accent: string;
  readonly badge: string;
  readonly cta: string;
  readonly icon: string;
};

const BANNER_TEMPLATES: readonly BannerTemplate[] = [
  { id: 'restaurant', label: 'مطعم', accent: 'danger', badge: 'خصم 20%', cta: 'اطلب الآن', icon: '🍕' },
  { id: 'fashion', label: 'أزياء وملابس', accent: 'info', badge: 'وصل حديثاً', cta: 'تسوق الآن', icon: '🛍️' },
  { id: 'tech', label: 'إلكترونيات', accent: 'brandStrong', badge: 'الأكثر مبيعاً', cta: 'اكتشف الآن', icon: '💻' },
  { id: 'pro', label: 'أعضاء برو', accent: 'warning', badge: 'توصيل مجاني', cta: 'اشترك الآن', icon: '👑' },
];

const TARGET_TYPE_OPTIONS = VIDEO_TARGET_TYPE_OPTIONS;

// --- News Ticker Types ---

export type MarketingNewsTickerKind = 'alert' | 'news' | 'promo';
export type MarketingNewsTickerStatus = 'draft' | 'published' | 'paused';
export type MarketingNewsTickerSource = 'system' | 'ops' | 'partner';
export type MarketingNewsTickerAudience = 'all' | 'client' | 'partner' | 'captain';
export type MarketingNewsTickerDeliveryMode = 'scroll' | 'toast' | 'overlay';
export type MarketingNewsTickerPriority = 'low' | 'normal' | 'high' | 'critical';

export type MarketingNewsTickerItem = {
  id: string;
  message: string;
  kind: MarketingNewsTickerKind;
  status: MarketingNewsTickerStatus;
  source: MarketingNewsTickerSource;
  audience: MarketingNewsTickerAudience;
  deliveryMode: MarketingNewsTickerDeliveryMode;
  priority: MarketingNewsTickerPriority;
  pinned: boolean;
  actionType: string;
  actionTarget: string;
  clicks: number;
  impressions: number;
  openHour?: number;
  closeHour?: number;
  cooldownMinutes?: number;
  repeatGapMinutes?: number;
  updatedAt: string;
};

export type MarketingTickerPlanLane = 'active' | 'scheduled' | 'suppressed' | 'history';

export type MarketingTickerPlanReason =
  | 'scheduled_active'
  | 'paused_by_user'
  | 'cooldown_active'
  | 'not_in_hours'
  | 'priority_overridden'
  | 'audience_mismatch';

export type MarketingTickerPlanEntry = {
  readonly item: MarketingNewsTickerItem;
  readonly lane: MarketingTickerPlanLane;
  readonly reason?: MarketingTickerPlanReason;
  readonly active: boolean;
  readonly score: number;
};

export type MarketingTickerPlan = {
  readonly activeTicker: MarketingNewsTickerItem | null;
  readonly planEntries: readonly MarketingTickerPlanEntry[];
};

export type MarketingNewsTickerLocale = 'ar' | 'en';

export type MarketingNewsTickerPreview = {
  readonly message: string;
  readonly tone: 'default' | 'info' | 'warning' | 'danger';
  readonly isEnglish: boolean;
};
