"use client";
import { colorRoles } from '@bthwani/ui-kit';
import React, { useState } from "react";
import { OpsTheme } from "../../shared/operations";
const opsTheme = OpsTheme;
import {
  CpButton,
  CpTextInput,
  CpSelect,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpEmptyTableMessage,
} from "@bthwani/control-panel/components";
import {
  useTickersController,
  useVideosController,
  usePartnerOffersController,
  useGrowthController,
  useLoyaltyController,
  useVisibilityGatesController,
  useCatalogReviewController,
  useCampaignsController,
} from "../../shared/marketing";
import type {
  MarketingNewsTickerItem,
  MarketingVideoRecord,
  MarketingGrowthRecord,
  CampaignRecord,
} from "../../shared/marketing";
import type { PartnerOfferRecord } from "../../shared/partner/dsh-partner-offer-types";

// Shown on every command deck whose controller has no backend persistence yet
// (isBackedByApi === false). Mutating actions in that deck are disabled rather
// than silently succeeding without a runtime-backed API.
function NotBackedNotice({ reason }: { reason: string }) {
  return (
    <div
      role="status"
      style={{
        background: opsTheme.warningSurface,
        border: `1px solid var(--status-warning-border, ${colorRoles.surfaceBase})`,
        color: `var(--status-warning-text, ${colorRoles.brandAction})`,
        borderRadius: "0.5rem",
        padding: "0.625rem 0.875rem",
        fontSize: "0.8rem",
        marginBottom: "1rem",
      }}
    >
      ⚠️ {reason}
    </div>
  );
}

// 1. Ticker Command Deck
export function TickerCommandDeck() {
  const controller = useTickersController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (!controller.draft.message.trim()) {
      setErrorMsg("الرسالة مطلوبة لتسجيل الشريط الترويجي.");
      return;
    }
    // Conflict resolution check: Duplicate published message
    if (controller.draft.status === "published") {
      const isDuplicate = controller.items.some(
        (item) => item.id !== controller.draft?.id && item.message.trim() === controller.draft?.message.trim() && item.status === "published"
      );
      if (isDuplicate) {
        setErrorMsg("يوجد شريط إعلاني نشط بنفس الرسالة تماماً. يرجى تعديل المحتوى أو إيقاف الشريط الآخر.");
        return;
      }
    }
    setErrorMsg(null);
    controller.save(controller.draft);
  };

  const updateDraft = (key: keyof MarketingNewsTickerItem, value: any) => {
    if (!controller.draft) return;
    controller.setDraft({ ...controller.draft, [key]: value });
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }} dir="rtl">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: opsTheme.brand, fontSize: "1.15rem" }}>إدارة شريط الإعلانات والأخبار (News Tickers)</h3>
          <CpButton onClick={() => controller.select(null)}>إضافة شريط جديد</CpButton>
        </div>

        {controller.errorMessage && <NotBackedNotice reason={controller.errorMessage} />}

        {controller.items.length === 0 ? (
          <CpEmptyTableMessage>لا يوجد أشرطة إعلانية مسجلة حالياً.</CpEmptyTableMessage>
        ) : (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>الرسالة</CpTableHeaderCell>
                <CpTableHeaderCell>الفئة المستهدفة</CpTableHeaderCell>
                <CpTableHeaderCell>النوع</CpTableHeaderCell>
                <CpTableHeaderCell>الأولوية</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>المشاهدات</CpTableHeaderCell>
                <CpTableHeaderCell>تثبيت</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell style={{ maxWidth: "16rem", whiteSpace: "normal" }}>{item.message}</CpTableCell>
                  <CpTableCell>{item.audience === "all" ? "الجميع" : item.audience === "client" ? "العملاء" : "الشركاء"}</CpTableCell>
                  <CpTableCell>{item.kind === "alert" ? "تنبيه" : item.kind === "news" ? "أخبار" : "عرض ترويجي"}</CpTableCell>
                  <CpTableCell style={{ color: item.priority === "critical" ? opsTheme.danger : "inherit" }}>
                    {item.priority === "critical" ? "حرج" : item.priority === "high" ? "مرتفع" : "عادي"}
                  </CpTableCell>
                  <CpTableCell>
                    <span style={{ color: item.status === "published" ? opsTheme.success : opsTheme.textMuted }}>
                      {item.status === "published" ? "نشط" : "موقوف"}
                    </span>
                  </CpTableCell>
                  <CpTableCell>{item.impressions} مشاهدة / {item.clicks} نقرة</CpTableCell>
                  <CpTableCell>
                    <CpButton onClick={() => controller.togglePinned(item.id)} disabled={!controller.isBackedByApi} style={{ padding: "0.2rem 0.5rem" }}>
                      {item.pinned ? "📌 مثبت" : "ثبت"}
                    </CpButton>
                  </CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <CpButton onClick={() => controller.select(item)}>تعديل</CpButton>
                      <CpButton onClick={() => controller.toggleStatus(item.id)} disabled={!controller.isBackedByApi}>
                        {item.status === "published" ? "تعطيل" : "تنشيط"}
                      </CpButton>
                      <CpButton onClick={() => controller.remove(item.id)} disabled={!controller.isBackedByApi} style={{ background: opsTheme.dangerSurface, color: opsTheme.danger }}>حذف</CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      {controller.selected !== null && controller.draft && (
        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
            {controller.selected.id ? "تعديل شريط إعلاني" : "إضافة شريط إعلاني جديد"}
          </h4>

          {errorMsg && (
            <div style={{ color: opsTheme.danger, background: opsTheme.dangerSurface, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نص الرسالة</label>
            <CpTextInput
              value={controller.draft.message}
              onChange={(v) => updateDraft("message", v)}
              placeholder="اكتب نص الإعلان هنا..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نوع التنبيه</label>
            <CpSelect
              value={controller.draft.kind}
              onChange={(v) => updateDraft("kind", v)}
              options={[
                { value: "news", label: "أخبار وعام" },
                { value: "alert", label: "تنبيه هام" },
                { value: "promo", label: "عرض ترويجي" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الفئة المستهدفة</label>
            <CpSelect
              value={controller.draft.audience}
              onChange={(v) => updateDraft("audience", v)}
              options={[
                { value: "all", label: "الجميع" },
                { value: "client", label: "العملاء" },
                { value: "partner", label: "الشركاء" },
                { value: "captain", label: "الكباتن" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الأولوية</label>
            <CpSelect
              value={controller.draft.priority}
              onChange={(v) => updateDraft("priority", v)}
              options={[
                { value: "low", label: "منخفضة" },
                { value: "normal", label: "عادية" },
                { value: "high", label: "مرتفعة" },
                { value: "critical", label: "حرجة" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نمط التسليم</label>
            <CpSelect
              value={controller.draft.deliveryMode}
              onChange={(v) => updateDraft("deliveryMode", v)}
              options={[
                { value: "scroll", label: "شريط متحرك علوي" },
                { value: "toast", label: "إشعار منبثق فوري" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة النشر</label>
            <CpSelect
              value={controller.draft.status}
              onChange={(v) => updateDraft("status", v)}
              options={[
                { value: "draft", label: "مسودة غير مفعلة" },
                { value: "published", label: "نشط ومنشور حالياً" },
              ]}
            />

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <CpButton onClick={handleSave} disabled={!controller.isBackedByApi} style={{ background: opsTheme.brand, color: "white", flex: 1 }}>حفظ التعديلات</CpButton>
              <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Video Studio Command Deck
export function VideoStudioCommandDeck() {
  const controller = useVideosController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (!controller.draft.title.trim() || !controller.draft.videoUrl.trim()) {
      setErrorMsg("العنوان ورابط الفيديو هما حقلان مطلوبان.");
      return;
    }
    setErrorMsg(null);
    controller.save(controller.draft);
  };

  const updateDraft = (key: keyof MarketingVideoRecord, value: any) => {
    if (!controller.draft) return;
    controller.setDraft({ ...controller.draft, [key]: value });
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }} dir="rtl">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: opsTheme.brand, fontSize: "1.15rem" }}>استوديو الفيديو ومحتوى الكباتن والشركاء</h3>
          <CpButton onClick={() => controller.select(null)} disabled={!controller.isBackedByApi}>إضافة فيديو ترويجي</CpButton>
        </div>

        {!controller.isBackedByApi && <NotBackedNotice reason={controller.persistenceDisabledReason} />}

        {controller.items.length === 0 ? (
          <CpEmptyTableMessage>لا يوجد فيديوهات مسجلة حالياً.</CpEmptyTableMessage>
        ) : (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>العنوان</CpTableHeaderCell>
                <CpTableHeaderCell>الناشر</CpTableHeaderCell>
                <CpTableHeaderCell>المدة</CpTableHeaderCell>
                <CpTableHeaderCell>الفئة المستهدفة</CpTableHeaderCell>
                <CpTableHeaderCell>حالة المراجعة</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>المشاهدات / النقرات</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell>
                    <strong>{item.title}</strong>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{item.subtitle}</div>
                  </CpTableCell>
                  <CpTableCell>{item.source === "partner" ? "الشريك" : "التسويق"}</CpTableCell>
                  <CpTableCell>{item.durationSeconds} ثانية</CpTableCell>
                  <CpTableCell>{item.audience === "all" ? "الجميع" : "العمليات"}</CpTableCell>
                  <CpTableCell style={{ color: item.reviewState === "approved" ? opsTheme.success : item.reviewState === "pending" ? opsTheme.warning : opsTheme.danger }}>
                    {item.reviewState === "approved" ? "معتمد" : item.reviewState === "pending" ? "بانتظار المراجعة" : "مرفوض"}
                  </CpTableCell>
                  <CpTableCell>{item.status === "published" ? "منشور" : "مسودة"}</CpTableCell>
                  <CpTableCell>{item.impressions} مشاهدة / {item.clicks} نقرة</CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <CpButton onClick={() => controller.select(item)} disabled={!controller.isBackedByApi}>تعديل</CpButton>
                      <CpButton onClick={() => controller.toggleStatus(item.id)} disabled={!controller.isBackedByApi}>
                        {item.status === "published" ? "إيقاف" : "تنشيط"}
                      </CpButton>
                      <CpButton onClick={() => controller.remove(item.id)} disabled={!controller.isBackedByApi} style={{ background: opsTheme.dangerSurface, color: opsTheme.danger }}>حذف</CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      {controller.selected !== null && controller.draft && (
        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
            {controller.selected.id ? "تعديل فيديو" : "إضافة فيديو جديد"}
          </h4>

          {errorMsg && (
            <div style={{ color: opsTheme.danger, background: opsTheme.dangerSurface, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان الفيديو</label>
            <CpTextInput
              value={controller.draft.title}
              onChange={(v) => updateDraft("title", v)}
              placeholder="اكتب عنواناً جذاباً..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>وصف فرعي</label>
            <CpTextInput
              value={controller.draft.subtitle}
              onChange={(v) => updateDraft("subtitle", v)}
              placeholder="تفاصيل العرض الترويجي..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>رابط ملف الفيديو (.mp4)</label>
            <CpTextInput
              value={controller.draft.videoUrl}
              onChange={(v) => updateDraft("videoUrl", v)}
              placeholder="https://example.com/video.mp4"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>رابط الصورة المصغرة (Poster)</label>
            <CpTextInput
              value={controller.draft.posterUrl}
              onChange={(v) => updateDraft("posterUrl", v)}
              placeholder="https://example.com/poster.jpg"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الفئة المستهدفة</label>
            <CpSelect
              value={controller.draft.audience}
              onChange={(v) => updateDraft("audience", v)}
              options={[
                { value: "all", label: "الجميع (العملاء)" },
                { value: "operations", label: "فريق العمليات فقط" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة المراجعة</label>
            <CpSelect
              value={controller.draft.reviewState}
              onChange={(v) => updateDraft("reviewState", v)}
              options={[
                { value: "pending", label: "قيد المراجعة" },
                { value: "approved", label: "اعتماد وقبول" },
                { value: "rejected", label: "مرفوض" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة النشر</label>
            <CpSelect
              value={controller.draft.status}
              onChange={(v) => updateDraft("status", v)}
              options={[
                { value: "draft", label: "مسودة غير نشطة" },
                { value: "published", label: "منشور على التطبيق" },
              ]}
            />

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <CpButton onClick={handleSave} disabled={!controller.isBackedByApi} style={{ background: opsTheme.brand, color: "white", flex: 1 }}>حفظ الفيديو</CpButton>
              <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Campaigns Command Deck
export function CampaignsCommandDeck() {
  const controller = useCampaignsController("authenticated");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLaunch = async () => {
    if (!title.trim() || !startDate || !endDate) {
      setErrorMsg("الحقول: العنوان، تاريخ البداية وتاريخ النهاية هي حقول مطلوبة.");
      return;
    }
    // Validation constraint: End date must be greater than start date
    if (new Date(endDate) <= new Date(startDate)) {
      setErrorMsg("خطأ في الجدولة الزمنية: تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية.");
      return;
    }
    setErrorMsg(null);
    await controller.create({ title, description, startDate, endDate });
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 22rem", gap: "1.5rem" }} dir="rtl">
      <div>
        <h3 style={{ margin: "0 0 1rem", color: opsTheme.brand, fontSize: "1.15rem" }}>إدارة وجدولة الحملات التسويقية</h3>

        {controller.state.kind === "loading" && <p>جارٍ التحميل...</p>}
        {controller.state.kind === "error" && <p style={{ color: opsTheme.danger }}>{controller.state.message}</p>}
        {controller.state.kind === "success" && controller.state.items.length === 0 ? (
          <CpEmptyTableMessage>لا توجد حملات تسويقية مجدولة حالياً.</CpEmptyTableMessage>
        ) : controller.state.kind === "success" && (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>عنوان الحملة</CpTableHeaderCell>
                <CpTableHeaderCell>الوصف</CpTableHeaderCell>
                <CpTableHeaderCell>تاريخ البدء</CpTableHeaderCell>
                <CpTableHeaderCell>تاريخ الانتهاء</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.state.items.map((camp) => (
                <tr key={camp.id}>
                  <CpTableCell><strong>{camp.title}</strong></CpTableCell>
                  <CpTableCell>{camp.description}</CpTableCell>
                  <CpTableCell>{camp.startDate}</CpTableCell>
                  <CpTableCell>{camp.endDate}</CpTableCell>
                  <CpTableCell>
                    <CpButton onClick={() => controller.remove(camp.id)} style={{ background: opsTheme.dangerSurface, color: opsTheme.danger }}>حذف</CpButton>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>جدولة حملة تسويقية جديدة</h4>

        {errorMsg && (
          <div style={{ color: opsTheme.danger, background: opsTheme.dangerSurface, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان الحملة</label>
          <CpTextInput value={title} onChange={setTitle} placeholder="مثال: حملة الصيف الكبرى 2026" />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الوصف الاستراتيجي</label>
          <CpTextInput value={description} onChange={setDescription} placeholder="وصف موجز للمستهدفين والهدف..." />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>تاريخ البداية</label>
          <CpTextInput value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" />

          <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>تاريخ النهاية</label>
          <CpTextInput value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" />

          <CpButton onClick={handleLaunch} style={{ background: opsTheme.brand, color: "white", marginTop: "0.5rem" }}>إطلاق الحملة</CpButton>
        </div>
      </div>
    </div>
  );
}

// 4. Partner Offers Command Deck
export function PartnerOffersCommandDeck() {
  const controller = usePartnerOffersController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (!controller.draft.partnerName.trim() || !controller.draft.title.trim()) {
      setErrorMsg("اسم الشريك وعنوان العرض الترويجي هما حقلان مطلوبان.");
      return;
    }
    setErrorMsg(null);
    controller.save(controller.draft);
  };

  const updateDraft = (key: keyof PartnerOfferRecord, value: any) => {
    if (!controller.draft) return;
    controller.setDraft({ ...controller.draft, [key]: value });
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }} dir="rtl">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: opsTheme.brand, fontSize: "1.15rem" }}>عروض الشركاء وتجاوزات الهوامش الترويجية</h3>
          <CpButton onClick={() => controller.select(null)} disabled={!controller.isBackedByApi}>إضافة عرض جديد</CpButton>
        </div>

        {!controller.isBackedByApi && <NotBackedNotice reason={controller.persistenceDisabledReason} />}

        {controller.items.length === 0 ? (
          <CpEmptyTableMessage>لا توجد عروض مسجلة حالياً.</CpEmptyTableMessage>
        ) : (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>الشريك</CpTableHeaderCell>
                <CpTableHeaderCell>العرض المقترح</CpTableHeaderCell>
                <CpTableHeaderCell>نوع التفعيل</CpTableHeaderCell>
                <CpTableHeaderCell>هامش المخاطرة</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.items.map((o) => (
                <tr key={o.id}>
                  <CpTableCell>
                    <strong>{o.partnerName}</strong>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{o.storeLabel}</div>
                  </CpTableCell>
                  <CpTableCell>{o.title}</CpTableCell>
                  <CpTableCell>{o.offerType === "free-delivery" ? "توصيل مجاني" : "خصم مباشر"}</CpTableCell>
                  <CpTableCell style={{ color: o.marginRiskNote ? opsTheme.warning : "inherit" }}>
                    {o.marginRiskNote || "آمن"}
                  </CpTableCell>
                  <CpTableCell>
                    <span style={{ color: o.status === "published" ? opsTheme.success : o.status === "review" ? opsTheme.warning : opsTheme.textMuted }}>
                      {o.status === "published" ? "معتمد ومنشور" : o.status === "review" ? "تحت التدقيق" : "موقوف"}
                    </span>
                  </CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <CpButton onClick={() => controller.select(o)} disabled={!controller.isBackedByApi}>تعديل</CpButton>
                      <CpButton onClick={() => controller.toggleStatus(o.id)} disabled={!controller.isBackedByApi}>
                        {o.status === "published" ? "إيقاف" : "اعتماد وتفعيل"}
                      </CpButton>
                      <CpButton onClick={() => controller.remove(o.id)} disabled={!controller.isBackedByApi} style={{ background: opsTheme.dangerSurface, color: opsTheme.danger }}>حذف</CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      {controller.selected !== null && controller.draft && (
        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
            {controller.selected.id ? "تعديل عرض شريك" : "إضافة عرض شريك جديد"}
          </h4>

          {errorMsg && (
            <div style={{ color: opsTheme.danger, background: opsTheme.dangerSurface, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>اسم الشريك</label>
            <CpTextInput
              value={controller.draft.partnerName}
              onChange={(v) => updateDraft("partnerName", v)}
              placeholder="مثال: مطعم الفخامة"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>اسم المتجر والفرع</label>
            <CpTextInput
              value={controller.draft.storeLabel}
              onChange={(v) => updateDraft("storeLabel", v)}
              placeholder="مثال: متجر السليمانية"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان العرض الترويجي</label>
            <CpTextInput
              value={controller.draft.title}
              onChange={(v) => updateDraft("title", v)}
              placeholder="خصم 20% على المأكولات..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نوع العرض</label>
            <CpSelect
              value={controller.draft.offerType}
              onChange={(v) => updateDraft("offerType", v)}
              options={[
                { value: "discount", label: "خصم مباشر (نسبة مئوية)" },
                { value: "free-delivery", label: "توصيل مجاني للطلبات" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>شرح هامش المخاطرة</label>
            <CpTextInput
              value={controller.draft.marginRiskNote || ""}
              onChange={(v) => updateDraft("marginRiskNote", v)}
              placeholder="هامش ربح آمن، يتطلب مراجعة، إلخ..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة الاعتماد</label>
            <CpSelect
              value={controller.draft.status}
              onChange={(v) => updateDraft("status", v)}
              options={[
                { value: "review", label: "قيد التدقيق والمراجعة" },
                { value: "published", label: "معتمد ومنشور للعملاء" },
              ]}
            />

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <CpButton onClick={handleSave} disabled={!controller.isBackedByApi} style={{ background: opsTheme.brand, color: "white", flex: 1 }}>حفظ التعديلات</CpButton>
              <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. Benefits & Subscriptions Command Deck
export function BenefitsSubscriptionsCommandDeck() {
  const loyalty = useLoyaltyController();

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: opsTheme.brand, fontSize: "1.15rem" }}>إدارة برنامج الولاء ونظام الاشتراكات</h3>

      {!loyalty.isBackedByApi && <NotBackedNotice reason={loyalty.persistenceDisabledReason} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontWeight: 700 }}>مضاعف نقاط الولاء (Points Multiplier)</h4>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem" }}>المضاعف الحالي:</span>
            <strong style={{ fontSize: "1.25rem", color: opsTheme.brand }}>{loyalty.pointMultiplier}x</strong>
            <CpButton onClick={() => loyalty.updateMultiplier(1.5)} disabled={!loyalty.isBackedByApi}>1.5x</CpButton>
            <CpButton onClick={() => loyalty.updateMultiplier(2.0)} disabled={!loyalty.isBackedByApi}>2.0x (مضاعف عطلة)</CpButton>
          </div>
          <p style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.5rem" }}>المضاعف يتحكم في سرعة اكتساب النقاط للكباتن والعملاء على الطلبات المؤهلة.</p>
        </div>

        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontWeight: 700 }}>مستويات وتصنيفات الولاء</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {loyalty.tiers.map((tier) => (
              <div key={tier.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid colorRoles.surfaceBase", paddingBottom: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>{tier.name}</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>الحد الأدنى للنقاط: {tier.minimumPoints} نقطة</span>
                <CpButton onClick={() => loyalty.updateTierPoints(tier.name, tier.minimumPoints + 100)} disabled={!loyalty.isBackedByApi} style={{ padding: "0.2rem 0.5rem" }}>+100</CpButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. Growth Command Deck
export function GrowthCommandDeck() {
  const controller = useGrowthController("authenticated");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!controller.draft) return;
    if (!controller.draft.title.trim() || !controller.draft.metricValue.trim()) {
      setErrorMsg("العنوان وقيمة المؤشر هما حقلان مطلوبان.");
      return;
    }
    setErrorMsg(null);
    controller.save(controller.draft);
  };

  const updateDraft = (key: keyof MarketingGrowthRecord, value: any) => {
    if (!controller.draft) return;
    controller.setDraft({ ...controller.draft, [key]: value });
  };

  return (
    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem" }} dir="rtl">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: opsTheme.brand, fontSize: "1.15rem" }}>تحليلات النمو الرقمي وإحالات الأصدقاء (Growth)</h3>
          <CpButton onClick={() => controller.select(null)} disabled={!controller.isBackedByApi}>إضافة مبادرة نمو</CpButton>
        </div>

        {!controller.isBackedByApi && <NotBackedNotice reason={controller.persistenceDisabledReason} />}

        {controller.items.length === 0 ? (
          <CpEmptyTableMessage>لا توجد مبادرات نمو مسجلة حالياً.</CpEmptyTableMessage>
        ) : (
          <CpTable>
            <thead>
              <tr>
                <CpTableHeaderCell>مبادرة النمو</CpTableHeaderCell>
                <CpTableHeaderCell>عائلة المبادرة</CpTableHeaderCell>
                <CpTableHeaderCell>مؤشر الأداء (Metric)</CpTableHeaderCell>
                <CpTableHeaderCell>المشاهدات / النقرات</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>العمليات</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {controller.items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell>
                    <strong>{item.title}</strong>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{item.subtitle}</div>
                  </CpTableCell>
                  <CpTableCell>{item.family === "promotion" ? "إحالة وأكواد" : "حملة تشغيلية"}</CpTableCell>
                  <CpTableCell style={{ fontWeight: 600, color: opsTheme.brand }}>{item.metricValue}</CpTableCell>
                  <CpTableCell>{item.impressions} مشاهدة / {item.clicks} نقرة</CpTableCell>
                  <CpTableCell>{item.status === "published" ? "نشطة" : "مسودة"}</CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <CpButton onClick={() => controller.select(item)} disabled={!controller.isBackedByApi}>تعديل</CpButton>
                      <CpButton onClick={() => controller.toggleStatus(item.id)} disabled={!controller.isBackedByApi}>
                        {item.status === "published" ? "تعطيل" : "تنشيط"}
                      </CpButton>
                      <CpButton onClick={() => controller.remove(item.id)} disabled={!controller.isBackedByApi} style={{ background: opsTheme.dangerSurface, color: opsTheme.danger }}>حذف</CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      {controller.selected !== null && controller.draft && (
        <div style={{ background: colorRoles.surfaceBase, border: "1px solid colorRoles.surfaceBase", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <h4 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>
            {controller.selected.id ? "تعديل مبادرة نمو" : "إضافة مبادرة نمو جديدة"}
          </h4>

          {errorMsg && (
            <div style={{ color: opsTheme.danger, background: opsTheme.dangerSurface, padding: "0.5rem", borderRadius: "0.375rem", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>عنوان المبادرة</label>
            <CpTextInput
              value={controller.draft.title}
              onChange={(v) => updateDraft("title", v)}
              placeholder="مثال: حملة إحالات نهاية الأسبوع"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>الوصف التفصيلي</label>
            <CpTextInput
              value={controller.draft.subtitle}
              onChange={(v) => updateDraft("subtitle", v)}
              placeholder="تفاصيل الحوافز والجوائز..."
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>نوع العائلة للنمو</label>
            <CpSelect
              value={controller.draft.family}
              onChange={(v) => updateDraft("family", v)}
              options={[
                { value: "promotion", label: "أكواد خصم وإحالات" },
                { value: "campaign", label: "حملة إعلانية رقمية" },
              ]}
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>قيمة المؤشر / الهدف المالي</label>
            <CpTextInput
              value={controller.draft.metricValue}
              onChange={(v) => updateDraft("metricValue", v)}
              placeholder="مثال: +15% معدل تحويل العملاء"
            />

            <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>حالة المبادرة</label>
            <CpSelect
              value={controller.draft.status}
              onChange={(v) => updateDraft("status", v)}
              options={[
                { value: "draft", label: "مسودة تحت الإعداد" },
                { value: "published", label: "نشطة ومنشورة" },
              ]}
            />

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <CpButton onClick={handleSave} disabled={!controller.isBackedByApi} style={{ background: opsTheme.brand, color: "white", flex: 1 }}>حفظ التعديلات</CpButton>
              <CpButton onClick={() => controller.select(null)} style={{ flex: 1 }}>إلغاء</CpButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 7. Signals & Measurement Command Deck
export function SignalsMeasurementCommandDeck() {
  const gates = useVisibilityGatesController();
  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: opsTheme.brand, fontSize: "1.15rem" }}>بوابة قياس إشارات ورضا العملاء والشركاء</h3>
      {gates.errorMessage && <NotBackedNotice reason={gates.errorMessage} />}
      <div style={{ background: opsTheme.surfaceInset, padding: "1rem", borderRadius: "0.5rem" }}>
        <p style={{ margin: 0, fontSize: "0.813rem" }}>إشارات القياس الفورية مبنية على تحليلات الطلبات والتوصيل التشغيلية في DSH.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ padding: "1rem", border: `1px solid ${opsTheme.line}`, borderRadius: "0.5rem", background: "white" }}>
          <h4 style={{ margin: "0 0 0.5rem", color: opsTheme.text }}>مؤشرات الطلبات الفورية</h4>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>نسبة الطلبات المكتملة:</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: opsTheme.success }}>{gates.metrics.completedOrdersRate}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>إجمالي الطلبات:</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{gates.metrics.totalOrders}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "1rem", border: `1px solid ${opsTheme.line}`, borderRadius: "0.5rem", background: "white" }}>
          <h4 style={{ margin: "0 0 0.5rem", color: opsTheme.text }}>أداء الكباتن التشغيلي</h4>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>نسبة الالتزام بالوقت:</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: opsTheme.brand }}>{gates.metrics.deliveryCompletionRate}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>طلبات التوصيل المرفوضة:</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: opsTheme.danger }}>{gates.metrics.declinedAssignments}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 8. Image & Product Review Command Deck
export function ImageProductReviewCommandDeck() {
  const controller = useCatalogReviewController();

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: opsTheme.brand, fontSize: "1.15rem" }}>مراجعة جودة صور المنتجات والكتالوج</h3>
      <p style={{ margin: 0, fontSize: "0.813rem", color: opsTheme.textMuted }}>تدقيق صور الكتالوج وإلزام الشركاء بمعايير ووضوح الصور ودقتها قبل النشر للعملاء:</p>

      {!controller.isBackedByApi && <NotBackedNotice reason={controller.persistenceDisabledReason} />}

      {controller.items.length === 0 ? (
        <CpEmptyTableMessage>لا توجد صور بانتظار المراجعة حالياً.</CpEmptyTableMessage>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {controller.items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: `1px solid ${opsTheme.line}`, borderRadius: "0.5rem", background: "white" }}>
              <div>
                <strong>{item.name}</strong>
                <div style={{ fontSize: "0.8rem", color: item.hasBadImage ? opsTheme.danger : opsTheme.success }}>
                  {item.hasBadImage ? `مرفوضة بسبب: ${item.reason}` : "مقبولة ومستوفاة شروط الجودة"}
                </div>
              </div>
              {item.hasBadImage && (
                <CpButton onClick={() => controller.approveImage(item.id)} disabled={!controller.isBackedByApi}>تجاوز وقبول الصورة</CpButton>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
