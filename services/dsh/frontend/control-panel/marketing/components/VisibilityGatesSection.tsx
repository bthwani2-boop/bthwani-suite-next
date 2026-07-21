"use client";

import { colorRoles } from "@bthwani/ui-kit";
import type { CSSProperties } from "react";
import {
  GOVERNANCE_BRIDGES,
  type DeliverySignalCardViewModel,
  type MarketingKpiMetrics,
} from "../../../shared/marketing";

type DeliverySignalsController = {
  readonly items: readonly DeliverySignalCardViewModel[];
  readonly errorMessage: string | null;
  readonly reload: () => Promise<void>;
};

type VisibilityGatesSectionProps = {
  readonly metrics: MarketingKpiMetrics;
  readonly reloadMetrics: () => Promise<void>;
  readonly deliverySignals: DeliverySignalsController;
};

function RetryButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${colorRoles.borderSubtle}`,
        borderRadius: "0.5rem",
        background: colorRoles.surfaceBase,
        color: colorRoles.brandAction,
        padding: "0.45rem 0.8rem",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      إعادة المحاولة
    </button>
  );
}

export function VisibilityGatesSection({
  metrics,
  reloadMetrics,
  deliverySignals,
}: VisibilityGatesSectionProps) {
  return (
    <div dir="rtl" style={{ display: "grid", gap: "1rem", padding: "1rem" }}>
      <section style={styles.card}>
        <h3 style={styles.title}>مصادر قرار الظهور</h3>
        <p style={styles.description}>
          قرارات ظهور الشريك والمنتج لا تُنشأ محليًا في شاشة التسويق. تُستمد من حالة الشريك،
          واعتماد الكتالوج، وإشارات الدعم التشغيلية عبر المسارات المالكة التالية.
        </p>
        <div style={styles.links}>
          {GOVERNANCE_BRIDGES.map((bridge) => (
            <a key={bridge.id} href={bridge.targetRoute} style={styles.link}>
              {bridge.label}
            </a>
          ))}
        </div>
      </section>

      {!metrics.isBackedByApi ? (
        <section role="alert" style={styles.card}>
          <h3 style={styles.title}>تعذر تحميل الملخص التشغيلي</h3>
          <p style={styles.description}>{metrics.disclosureReason ?? "تعذر تحميل مؤشرات DSH."}</p>
          <RetryButton onClick={() => void reloadMetrics()} />
        </section>
      ) : null}

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.title}>إشارات الدعم المؤثرة على التسويق</h3>
            <p style={styles.description}>
              بيانات فعلية من تحليلات الدعم. وجود تذاكر لا يمنح أو يسحب الظهور تلقائيًا، لكنه يحدد الحالات التي تحتاج مراجعة تشغيلية.
            </p>
          </div>
          <RetryButton onClick={() => void deliverySignals.reload()} />
        </div>

        {deliverySignals.errorMessage ? (
          <p role="alert" style={styles.errorText}>{deliverySignals.errorMessage}</p>
        ) : deliverySignals.items.length === 0 ? (
          <p role="status" style={styles.emptyText}>لا توجد إشارات دعم تشغيلية في النطاق الحالي.</p>
        ) : (
          <div style={styles.signalList}>
            {deliverySignals.items.map((signal) => (
              <a
                key={signal.id}
                href={`/dsh/support?category=${encodeURIComponent(signal.intakeId)}`}
                style={styles.signalCard}
              >
                <div style={styles.signalHeader}>
                  <strong>{signal.title}</strong>
                  <span style={signal.requiresAttention ? styles.attentionBadge : styles.clearBadge}>
                    {signal.statusLabel}
                  </span>
                </div>
                <span style={styles.signalMeta}>المصدر: {signal.source}</span>
                <span style={styles.signalMeta}>آخر تحديث: {signal.generatedAt}</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: colorRoles.surfaceBase,
    border: `1px solid ${colorRoles.borderSubtle}`,
    borderRadius: "0.9rem",
    padding: "1.25rem",
  },
  title: {
    margin: "0 0 0.4rem",
    color: colorRoles.brandStructure,
    fontSize: "1rem",
  },
  description: {
    margin: "0 0 0.9rem",
    opacity: 0.72,
    lineHeight: 1.7,
    fontSize: "0.85rem",
  },
  links: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  link: {
    color: colorRoles.brandAction,
    textDecoration: "none",
    border: `1px solid ${colorRoles.borderSubtle}`,
    borderRadius: "0.5rem",
    padding: "0.45rem 0.75rem",
    fontWeight: 700,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
  },
  errorText: {
    margin: 0,
    color: colorRoles.danger,
  },
  emptyText: {
    margin: 0,
    opacity: 0.7,
  },
  signalList: {
    display: "grid",
    gap: "0.65rem",
  },
  signalCard: {
    display: "grid",
    gap: "0.35rem",
    color: "inherit",
    textDecoration: "none",
    border: `1px solid ${colorRoles.borderSubtle}`,
    borderRadius: "0.65rem",
    padding: "0.85rem",
  },
  signalHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "center",
  },
  attentionBadge: {
    color: colorRoles.danger,
    fontWeight: 700,
  },
  clearBadge: {
    color: colorRoles.success,
    fontWeight: 700,
  },
  signalMeta: {
    fontSize: "0.75rem",
    opacity: 0.62,
  },
};
