import React, { type ReactNode } from 'react';
import { useDirection } from '../providers';

const webPageFrameCss = `
.ui-web-page-frame-root {
  display: flex;
  justify-content: center;
  padding: 18px;
}

.ui-web-page-frame-root--embedded {
  padding: 0;
}

.ui-web-page-frame-content {
  width: 100%;
  max-width: 960px;
}

.ui-web-page-frame-content--narrow {
  max-width: 880px;
}

.ui-web-page-frame-content--compact {
  max-width: 920px;
}

.ui-web-page-frame-content--regular {
  max-width: 980px;
}

.ui-web-page-frame-content--wide {
  max-width: 1120px;
}

.ui-web-page-frame-content--centered {
  text-align: center;
}

.ui-web-page-frame-eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--bthwani-brand);
  font-weight: 800;
}

.ui-web-page-frame-title-block {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.ui-web-page-frame-title-block--with-eyebrow {
  margin-top: 8px;
}

.ui-web-page-frame-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.12;
  color: var(--bthwani-control-panel-brand);
  letter-spacing: 0;
}

.ui-web-page-frame-description {
  margin: 0;
  font-size: 16px;
  line-height: 1.75;
  color: var(--bthwani-control-panel-text-muted);
}

.ui-web-mission-hero-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--bthwani-control-panel-border);
  background:
    radial-gradient(circle at top right, var(--bthwani-brand-surface), transparent 25%),
    linear-gradient(180deg, var(--bthwani-control-panel-surface-inset) 0%, var(--bthwani-control-panel-surface) 68%);
  box-shadow: 0 10px 24px var(--bthwani-overlay-soft);
}

.ui-web-mission-hero-card--dense {
  gap: 12px;
  padding: 18px;
}

.ui-web-mission-hero-card--compact {
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
}

.ui-web-mission-hero-card__badge-row,
.ui-web-mission-hero-card__meta-row,
.ui-web-mission-hero-card__cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-web-mission-hero-card__eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--bthwani-brand);
  font-weight: 800;
}

.ui-web-mission-hero-card__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  color: var(--bthwani-control-panel-brand);
  letter-spacing: 0;
}

.ui-web-mission-hero-card--dense .ui-web-mission-hero-card__title {
  font-size: 28px;
}

.ui-web-mission-hero-card--compact .ui-web-mission-hero-card__title {
  font-size: 24px;
}

.ui-web-mission-hero-card__description {
  margin: 0;
  font-size: 16px;
  line-height: 1.78;
  color: var(--bthwani-control-panel-text);
}

.ui-web-mission-hero-card__badge,
.ui-web-mission-hero-card__meta-chip {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.ui-web-mission-hero-card__badge {
  padding: 5px 10px;
  background: linear-gradient(180deg, var(--bthwani-brand-surface) 0%, var(--bthwani-control-panel-surface) 100%);
  color: var(--bthwani-control-panel-brand);
  border: 1px solid var(--bthwani-brand);
}

.ui-web-mission-hero-card__meta-chip {
  padding: 7px 11px;
  border: 1px solid var(--bthwani-control-panel-border-strong);
  background: var(--bthwani-control-panel-surface);
  color: var(--bthwani-control-panel-text);
}

.ui-web-mission-hero-card__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 800;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.ui-web-mission-hero-card__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px var(--bthwani-overlay-soft);
}

.ui-web-mission-hero-card__cta--secondary {
  border: 1px solid var(--bthwani-control-panel-border-strong);
  color: var(--bthwani-control-panel-brand);
  background: var(--bthwani-control-panel-surface);
}

.ui-web-mission-hero-card__cta--primary {
  background: linear-gradient(135deg, var(--bthwani-control-panel-brand) 0%, var(--bthwani-brand) 58%, var(--bthwani-brand) 100%);
  color: var(--bthwani-brand-contrast);
  box-shadow: 0 8px 18px var(--bthwani-overlay-soft);
}

.ui-web-section-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--bthwani-control-panel-border);
  background: linear-gradient(180deg, var(--bthwani-control-panel-surface) 0%, var(--bthwani-control-panel-surface-raised) 100%);
  box-shadow: 0 8px 20px var(--bthwani-overlay-soft);
}

.ui-web-section-card__header {
  display: grid;
  gap: 8px;
}

.ui-web-section-card__title {
  margin: 0;
  font-size: 20px;
  color: var(--bthwani-control-panel-brand);
  letter-spacing: 0;
}

.ui-web-section-card__description {
  margin: 0;
  font-size: 15px;
  line-height: 1.72;
  color: var(--bthwani-control-panel-text-muted);
}

.ui-web-signal-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--bthwani-control-panel-border);
  background: linear-gradient(180deg, var(--bthwani-control-panel-surface) 0%, var(--bthwani-control-panel-surface-raised) 100%);
  box-shadow: 0 6px 16px var(--bthwani-overlay-soft);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.ui-web-signal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px var(--bthwani-overlay-soft);
}

.ui-web-signal-card--best {
  border-color: var(--bthwani-success);
  background: linear-gradient(180deg, var(--bthwani-success-surface) 0%, var(--bthwani-control-panel-surface) 100%);
}

.ui-web-signal-card--danger {
  border-color: var(--bthwani-danger);
  background: linear-gradient(180deg, var(--bthwani-danger-surface) 0%, var(--bthwani-control-panel-surface) 100%);
}

.ui-web-signal-card--warning {
  border-color: var(--bthwani-warning);
  background: linear-gradient(180deg, var(--bthwani-warning-surface) 0%, var(--bthwani-control-panel-surface) 100%);
}

.ui-web-signal-card--info {
  border-color: var(--bthwani-info);
  background: linear-gradient(180deg, var(--bthwani-info-surface) 0%, var(--bthwani-control-panel-surface) 100%);
}

.ui-web-signal-card--brand {
  border-color: var(--bthwani-brand);
  background: linear-gradient(180deg, var(--bthwani-brand-surface) 0%, var(--bthwani-control-panel-surface) 100%);
}

.ui-web-signal-card__title {
  margin: 0;
  font-size: 13px;
  color: var(--bthwani-control-panel-text-muted);
  font-weight: 800;
}

.ui-web-signal-card__value {
  margin: 0;
  font-size: 26px;
  line-height: 1;
  font-weight: 900;
  color: var(--bthwani-control-panel-brand);
  letter-spacing: 0;
}

.ui-web-signal-card__description {
  margin: 0;
  font-size: 14px;
  line-height: 1.72;
  color: var(--bthwani-control-panel-text-muted);
}

@media (max-width: 640px) {
  .ui-web-page-frame-root {
    padding: 18px;
  }

  .ui-web-mission-hero-card,
  .ui-web-section-card,
  .ui-web-signal-card {
    border-radius: 12px;
  }
}
`;

function WebPageFrameStyles() {
  return <style>{webPageFrameCss}</style>;
}

export type WebPageFrameProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  centered?: boolean;
  maxWidth?: number;
  embedded?: boolean;
  showHeader?: boolean;
  children?: ReactNode;
};

export function WebPageFrame({
  title,
  description,
  eyebrow,
  centered = false,
  maxWidth = 960,
  embedded = false,
  showHeader = true,
  children,
}: WebPageFrameProps) {
  const widthClassName = maxWidth <= 880
    ? 'ui-web-page-frame-content--narrow'
    : maxWidth <= 920
      ? 'ui-web-page-frame-content--compact'
      : maxWidth < 1000
        ? 'ui-web-page-frame-content--regular'
        : 'ui-web-page-frame-content--wide';

  const contentClassName = [
    'ui-web-page-frame-content',
    centered ? 'ui-web-page-frame-content--centered' : '',
    widthClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const rootClassName = [
    'ui-web-page-frame-root',
    embedded ? 'ui-web-page-frame-root--embedded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <WebPageFrameStyles />
      <div className={rootClassName}>
        <div className={contentClassName}>
          {showHeader && eyebrow ? <p className="ui-web-page-frame-eyebrow">{eyebrow}</p> : null}
          {showHeader ? (
            <div className={["ui-web-page-frame-title-block", eyebrow ? 'ui-web-page-frame-title-block--with-eyebrow' : ''].filter(Boolean).join(' ')}>
              <h1 className="ui-web-page-frame-title">{title}</h1>
              {description ? <p className="ui-web-page-frame-description">{description}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </>
  );
}

export type WebMissionHeroCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  dense?: boolean;
  compact?: boolean;
  badges?: ReadonlyArray<string>;
  metaItems?: ReadonlyArray<string>;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

export function WebMissionHeroCard({
  eyebrow,
  title,
  description,
  dense = false,
  compact = false,
  badges = [],
  metaItems = [],
  primaryAction,
  secondaryAction,
}: WebMissionHeroCardProps) {
  const { direction } = useDirection();
  const cardClassName = [
    'ui-web-mission-hero-card',
    dense ? 'ui-web-mission-hero-card--dense' : '',
    compact ? 'ui-web-mission-hero-card--compact' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <WebPageFrameStyles />
      <article className={cardClassName} dir={direction}>
        {badges.length > 0 ? (
          <div className="ui-web-mission-hero-card__badge-row">
            {badges.map((badge) => (
              <span key={badge} className="ui-web-mission-hero-card__badge">
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        {eyebrow ? <p className="ui-web-mission-hero-card__eyebrow">{eyebrow}</p> : null}
        <h2 className="ui-web-mission-hero-card__title">{title}</h2>
        {description ? <p className="ui-web-mission-hero-card__description">{description}</p> : null}

        {metaItems.length > 0 ? (
          <div className="ui-web-mission-hero-card__meta-row">
            {metaItems.map((item) => (
              <span key={item} className="ui-web-mission-hero-card__meta-chip">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {(primaryAction || secondaryAction) ? (
          <div className="ui-web-mission-hero-card__cta-row">
            {secondaryAction ? (
              <a className="ui-web-mission-hero-card__cta ui-web-mission-hero-card__cta--secondary" href={secondaryAction.href}>
                {secondaryAction.label}
              </a>
            ) : null}
            {primaryAction ? (
              <a className="ui-web-mission-hero-card__cta ui-web-mission-hero-card__cta--primary" href={primaryAction.href}>
                {primaryAction.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </article>
    </>
  );
}

export type WebSectionCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function WebSectionCard({ title, description, children }: WebSectionCardProps) {
  return (
    <>
      <WebPageFrameStyles />
      <section className="ui-web-section-card">
        <div className="ui-web-section-card__header">
          <h2 className="ui-web-section-card__title">{title}</h2>
          {description ? <p className="ui-web-section-card__description">{description}</p> : null}
        </div>
        {children}
      </section>
    </>
  );
}

export type WebSignalCardTone = 'neutral' | 'best' | 'danger' | 'warning' | 'info' | 'brand';

export type WebSignalCardProps = {
  title: string;
  value: string;
  description: string;
  tone?: WebSignalCardTone;
};

export function WebSignalCard({
  title,
  value,
  description,
  tone = 'neutral',
}: WebSignalCardProps) {
  const className = [
    'ui-web-signal-card',
    tone === 'best' ? 'ui-web-signal-card--best' : '',
    tone === 'danger' ? 'ui-web-signal-card--danger' : '',
    tone === 'warning' ? 'ui-web-signal-card--warning' : '',
    tone === 'info' ? 'ui-web-signal-card--info' : '',
    tone === 'brand' ? 'ui-web-signal-card--brand' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <WebPageFrameStyles />
      <article className={className}>
        <p className="ui-web-signal-card__title">{title}</p>
        <p className="ui-web-signal-card__value">{value}</p>
        <p className="ui-web-signal-card__description">{description}</p>
      </article>
    </>
  );
}
