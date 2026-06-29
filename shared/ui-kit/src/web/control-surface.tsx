import React from 'react';
import { useDirection } from '../providers';

const webControlSurfaceCss = `
.ui-web-control-surface-header {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--bthwani-control-panel-border);
  background:
    radial-gradient(circle at top right, var(--bthwani-brand-surface), transparent 24%),
    linear-gradient(135deg, var(--bthwani-control-panel-brand-surface) 0%, var(--bthwani-brand-surface) 58%, var(--bthwani-control-panel-surface) 100%),
    var(--bthwani-control-panel-surface);
  box-shadow: 0 10px 24px var(--bthwani-overlay-soft);
  text-align: start;
  overflow: hidden;
}

.ui-web-control-surface-header::after {
  content: '';
  position: absolute;
  inset: auto auto -22% -4%;
  width: 44%;
  height: 58%;
  background: radial-gradient(circle, var(--bthwani-control-panel-brand-surface) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
}
.ui-web-control-surface-header__main {
  display: grid;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.ui-web-control-surface-header__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.ui-web-control-surface-header__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid var(--bthwani-control-panel-border-strong);
  background: var(--bthwani-control-panel-surface);
  color: var(--bthwani-control-panel-brand);
  font-size: 12px;
  font-weight: 800;
}
.ui-web-control-surface-header__chip--brand {
  border-color: var(--bthwani-control-panel-border-strong);
  background: var(--bthwani-control-panel-brand-surface);
}
.ui-web-control-surface-header__chip--accent {
  border-color: var(--bthwani-brand);
  background: var(--bthwani-brand-surface);
  color: var(--bthwani-brand);
}
.ui-web-control-surface-header__title {
  margin: 0;
  color: var(--bthwani-control-panel-brand);
  font-size: 28px;
  line-height: 1.12;
  font-weight: 900;
  letter-spacing: 0;
  max-width: 22ch;
}
.ui-web-control-surface-header__description {
  max-width: 64ch;
  color: var(--bthwani-control-panel-text-muted);
  font-size: 14px;
  line-height: 1.85;
}
.ui-web-control-surface-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
}
.ui-web-control-action-button {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--bthwani-control-panel-border-strong);
  background: linear-gradient(180deg, var(--bthwani-control-panel-surface) 0%, var(--bthwani-control-panel-surface-raised) 100%);
  color: var(--bthwani-control-panel-brand);
  text-decoration: none;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  text-align: center;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.ui-web-control-action-button:hover,
.ui-web-control-action-card:hover,
.ui-web-control-disclosure-item:hover {
  transform: translateY(-1px);
}
.ui-web-control-action-button--primary {
  border-color: var(--bthwani-brand);
  background: linear-gradient(135deg, var(--bthwani-control-panel-brand) 0%, var(--bthwani-brand) 58%, var(--bthwani-brand) 100%);
  color: var(--bthwani-brand-contrast);
  box-shadow: 0 8px 18px var(--bthwani-overlay-soft);
}
.ui-web-control-action-button--secondary {
  border-color: var(--bthwani-control-panel-border-strong);
  background: linear-gradient(180deg, var(--bthwani-control-panel-surface) 0%, var(--bthwani-control-panel-surface-raised) 100%);
}
.ui-web-control-action-card {
  appearance: none;
  box-sizing: border-box;
  display: grid;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 128px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--bthwani-control-panel-border);
  background: linear-gradient(180deg, var(--bthwani-control-panel-surface) 0%, var(--bthwani-control-panel-surface-raised) 100%);
  color: inherit;
  text-decoration: none;
  font: inherit;
  cursor: pointer;
  text-align: start;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 6px 16px var(--bthwani-overlay-soft);
}
.ui-web-control-action-card--primary {
  border-color: var(--bthwani-brand);
  background: linear-gradient(180deg, var(--bthwani-brand-surface) 0%, var(--bthwani-control-panel-surface) 100%);
  box-shadow: 0 8px 18px var(--bthwani-overlay-soft);
}

.ui-web-control-action-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.ui-web-control-action-card__title {
  color: var(--bthwani-control-panel-brand);
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0;
}
.ui-web-control-action-card__badge,
.ui-web-control-disclosure-item__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 8px;
  border-radius: 999px;
  border: 1px solid var(--bthwani-brand);
  background: linear-gradient(180deg, var(--bthwani-brand-surface) 0%, var(--bthwani-control-panel-surface) 100%);
  color: var(--bthwani-brand);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.ui-web-control-action-card__description {
  margin: 0;
  color: var(--bthwani-control-panel-text-muted);
  font-size: 13px;
  line-height: 1.8;
}
.ui-web-control-action-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  color: var(--bthwani-control-panel-text-muted);
  font-size: 12px;
  font-weight: 800;
}
.ui-web-control-action-card__footer-arrow {
  color: var(--bthwani-brand);
  font-size: 14px;
}
.ui-web-control-disclosure-item {
  appearance: none;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--bthwani-control-panel-border);
  background: linear-gradient(180deg, var(--bthwani-control-panel-surface-inset) 0%, var(--bthwani-control-panel-surface-raised) 100%);
  color: inherit;
  text-decoration: none;
  font: inherit;
  cursor: pointer;
  text-align: start;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  box-shadow: inset 0 0 0 1px var(--bthwani-control-panel-surface);
}
.ui-web-control-disclosure-item__text {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.ui-web-control-disclosure-item__label {
  color: var(--bthwani-control-panel-brand);
  font-size: 13px;
  font-weight: 900;
}
.ui-web-control-disclosure-item__description {
  color: var(--bthwani-control-panel-text-muted);
  font-size: 12px;
  line-height: 1.7;
}

@media (max-width: 640px) {
  .ui-web-control-surface-header {
    padding: 14px;
  }

  .ui-web-control-surface-header__actions {
    width: 100%;
  }

  .ui-web-control-surface-header__actions .ui-web-control-action-button {
    width: 100%;
  }
}
.ui-web-compact-surface-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 12px;
  background-color: var(--bthwani-control-panel-surface);
  border-bottom: 1px solid var(--bthwani-control-panel-border);
  border-radius: 12px;
  margin: 0;
}
.ui-web-compact-surface-header__title-block {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.ui-web-compact-surface-header__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--bthwani-control-panel-brand);
}
.ui-web-compact-surface-header__description {
  margin: 0;
  font-size: 13px;
  color: var(--bthwani-control-panel-text-muted);
}
.ui-web-compact-surface-header__pulse {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.ui-web-compact-surface-header__pulse-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background-color: var(--bthwani-control-panel-surface-inset);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--bthwani-control-panel-brand);
}
.ui-web-compact-surface-header__pulse-item span:first-child {
  color: var(--bthwani-control-panel-text-muted);
  font-size: 11px;
}
.ui-web-system-suggestion {
  margin-top: 8px;
  padding: 8px 10px;
  background-color: var(--bthwani-control-panel-surface-inset);
  border-radius: 6px;
  border: 1px solid var(--bthwani-control-panel-border);
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: start;
  direction: rtl;
}
.ui-web-system-suggestion__header {
  font-size: 12px;
  font-weight: 700;
  color: var(--bthwani-control-panel-brand);
}
.ui-web-system-suggestion__reason {
  font-size: 11px;
  color: var(--bthwani-control-panel-text-muted);
}
.ui-web-system-suggestion__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}
.ui-web-system-suggestion__actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.ui-web-system-suggestion__conf-high {
  font-size: 10px;
  font-weight: 700;
  color: var(--bthwani-success-text);
  background-color: var(--bthwani-success-surface);
  padding: 1px 6px;
  border-radius: 99px;
}
.ui-web-system-suggestion__conf-medium {
  font-size: 10px;
  font-weight: 700;
  color: var(--bthwani-warning-text);
  background-color: var(--bthwani-warning-surface);
  padding: 1px 6px;
  border-radius: 99px;
}
.ui-web-system-suggestion__conf-low {
  font-size: 10px;
  font-weight: 700;
  color: var(--bthwani-danger-text);
  background-color: var(--bthwani-danger-surface);
  padding: 1px 6px;
  border-radius: 99px;
}
.ui-web-system-suggestion__audit {
  font-size: 10px;
  font-weight: 700;
  color: var(--bthwani-danger-text);
  background-color: var(--bthwani-danger-surface);
  padding: 1px 6px;
  border-radius: 99px;
}
.ui-web-system-suggestion__btn-primary {
  padding: 4px 10px;
  background-color: var(--bthwani-brand);
  color: var(--bthwani-brand-contrast);
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.ui-web-system-suggestion__btn-secondary {
  padding: 4px 10px;
  background-color: var(--bthwani-control-panel-surface-raised);
  color: var(--bthwani-control-panel-brand);
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.ui-web-cp-viewport {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.ui-web-cp-dense-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--bthwani-control-panel-border);
  background: var(--bthwani-control-panel-surface);
}

.ui-web-cp-dense-header__main {
  display: grid;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.ui-web-cp-dense-header__eyebrow {
  color: var(--bthwani-control-panel-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.ui-web-cp-dense-header__title {
  margin: 0;
  color: var(--bthwani-control-panel-brand);
  font-size: 20px;
  line-height: 1.2;
  font-weight: 900;
}

.ui-web-cp-dense-header__description {
  margin: 0;
  color: var(--bthwani-control-panel-text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.ui-web-cp-dense-header__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ui-web-cp-dense-header__metric {
  display: grid;
  gap: 2px;
  min-width: 88px;
  padding: 6px 8px;
  border-radius: 10px;
  background: var(--bthwani-control-panel-surface-inset);
}

.ui-web-cp-dense-header__metric-label {
  color: var(--bthwani-control-panel-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.ui-web-cp-dense-header__metric-value {
  color: var(--bthwani-control-panel-brand);
  font-size: 15px;
  font-weight: 900;
}

.ui-web-cp-dense-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.ui-web-cp-split-pane {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 10px;
  width: 100%;
  height: 100%;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.ui-web-cp-split-pane--solo {
  grid-template-columns: minmax(0, 1fr);
}
.ui-web-cp-split-pane--solo .ui-web-cp-split-pane__primary {
  grid-column: 1 / -1;
}

.ui-web-cp-split-pane--narrow {
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
}

.ui-web-cp-split-pane--wide {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
}

.ui-web-cp-split-pane--secondary-start {
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
}
.ui-web-cp-split-pane--secondary-start .ui-web-cp-split-pane__primary {
  grid-column: 2;
}
.ui-web-cp-split-pane--secondary-start .ui-web-cp-split-pane__secondary {
  grid-column: 1;
  grid-row: 1;
}

.ui-web-cp-split-pane--secondary-start.ui-web-cp-split-pane--narrow {
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
}

.ui-web-cp-split-pane--secondary-start.ui-web-cp-split-pane--wide {
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
}

.ui-web-cp-split-pane__primary,
.ui-web-cp-split-pane__secondary {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.ui-web-cp-workbench {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.ui-web-cp-workbench__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.ui-web-cp-workbench__main {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.ui-web-cp-lane-tabs,
.ui-web-cp-tertiary-filters {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
}
.ui-web-cp-lane-tabs::-webkit-scrollbar,
.ui-web-cp-tertiary-filters::-webkit-scrollbar {
  display: none;
}

.ui-web-cp-lane-tabs__button,
.ui-web-cp-tertiary-filters__button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--bthwani-control-panel-border-strong);
  background: var(--bthwani-control-panel-surface);
  color: var(--bthwani-control-panel-text-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.ui-web-cp-tertiary-filters__button {
  min-height: 30px;
  padding: 0 10px;
  font-size: 11px;
}

.ui-web-cp-lane-tabs__button--active {
  background: var(--bthwani-control-panel-brand-surface);
  color: var(--bthwani-control-panel-brand);
  border-color: var(--bthwani-control-panel-border-strong);
}

.ui-web-cp-tertiary-filters__button--active {
  background: var(--bthwani-brand-surface);
  color: var(--bthwani-brand);
  border-color: var(--bthwani-brand);
}

.ui-web-cp-lane-tabs__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  min-height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--bthwani-control-panel-surface-inset);
  color: var(--bthwani-control-panel-brand);
  font-size: 10px;
  font-weight: 900;
}

.ui-web-cp-queue {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--bthwani-control-panel-border);
  background: var(--bthwani-control-panel-surface);
  overflow: hidden;
}

.ui-web-cp-queue__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ui-web-cp-queue__title-block {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.ui-web-cp-queue__title {
  margin: 0;
  color: var(--bthwani-control-panel-brand);
  font-size: 15px;
  font-weight: 900;
}

.ui-web-cp-queue__meta {
  color: var(--bthwani-control-panel-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.ui-web-cp-queue__rows {
  display: grid;
  gap: 8px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.ui-web-cp-queue__footer {
  display: flex;
  justify-content: flex-end;
}

.ui-web-cp-compact-pager {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  min-height: 32px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid var(--bthwani-control-panel-border);
  background: var(--bthwani-control-panel-surface);
}

.ui-web-cp-compact-pager__button {
  appearance: none;
  min-width: 32px;
  height: 32px;
  border-radius: 999px;
  border: none;
  background: var(--bthwani-control-panel-surface-inset);
  color: var(--bthwani-control-panel-brand);
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.ui-web-cp-compact-pager__button:disabled {
  opacity: 0.4;
  cursor: default;
}

.ui-web-cp-compact-pager__summary {
  color: var(--bthwani-control-panel-brand);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.ui-web-cp-map-canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 320px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--bthwani-control-panel-border);
  background:
    linear-gradient(180deg, var(--bthwani-control-panel-surface) 0%, var(--bthwani-control-panel-surface-raised) 100%),
    var(--bthwani-control-panel-surface);
  overflow: hidden;
}

.ui-web-cp-map-canvas__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--bthwani-control-panel-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--bthwani-control-panel-border) 1px, transparent 1px);
  background-size: 48px 48px;
  opacity: 0.45;
  pointer-events: none;
}

.ui-web-cp-map-canvas__body {
  position: relative;
  flex: 1;
  min-height: 0;
}

.ui-web-cp-map-canvas__legend {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-web-cp-map-zone,
.ui-web-cp-map-pin {
  position: absolute;
  z-index: 1;
}

.ui-web-cp-map-zone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--bthwani-control-panel-border-strong);
  background: var(--bthwani-control-panel-surface-inset);
  color: var(--bthwani-control-panel-brand);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.ui-web-cp-map-zone--warning {
  background: var(--bthwani-warning-surface);
  border-color: var(--bthwani-warning);
  color: var(--bthwani-warning-text);
}

.ui-web-cp-map-zone--danger {
  background: var(--bthwani-danger-surface);
  border-color: var(--bthwani-danger);
  color: var(--bthwani-danger-text);
}

.ui-web-cp-map-zone--success {
  background: var(--bthwani-success-surface);
  border-color: var(--bthwani-success);
  color: var(--bthwani-success-text);
}

.ui-web-cp-map-pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--bthwani-control-panel-border-strong);
  background: var(--bthwani-control-panel-surface);
  color: var(--bthwani-control-panel-brand);
  font-size: 11px;
  font-weight: 900;
  box-shadow: 0 8px 18px var(--bthwani-overlay-soft);
  cursor: pointer;
}

.ui-web-cp-map-pin--warning {
  color: var(--bthwani-warning-text);
  border-color: var(--bthwani-warning);
}

.ui-web-cp-map-pin--danger {
  color: var(--bthwani-danger-text);
  border-color: var(--bthwani-danger);
}

.ui-web-cp-map-pin--success {
  color: var(--bthwani-success-text);
  border-color: var(--bthwani-success);
}

.ui-web-cp-route-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.ui-web-cp-route-line__path {
  fill: none;
  stroke: var(--bthwani-control-panel-text-muted);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 6 6;
}

.ui-web-cp-route-line__path--warning {
  stroke: var(--bthwani-warning);
}

.ui-web-cp-route-line__path--danger {
  stroke: var(--bthwani-danger);
}

.ui-web-cp-route-line__path--success {
  stroke: var(--bthwani-success);
}

@media (max-width: 960px) {
  .ui-web-cp-dense-header,
  .ui-web-cp-split-pane,
  .ui-web-cp-split-pane--secondary-start,
  .ui-web-cp-split-pane--secondary-start.ui-web-cp-split-pane--narrow,
  .ui-web-cp-split-pane--secondary-start.ui-web-cp-split-pane--wide,
  .ui-web-cp-split-pane--narrow,
  .ui-web-cp-split-pane--wide {
    grid-template-columns: minmax(0, 1fr);
  }

  .ui-web-cp-dense-header {
    flex-direction: column;
  }

  .ui-web-cp-dense-header__actions {
    width: 100%;
    justify-content: flex-start;
  }
}

/* === ControlPanel: StatusTag / ActionCluster / DecisionRow / Recommendation / InspectorShell === */
.ui-web-cp-status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.ui-web-cp-status-tag--neutral { background: var(--bthwani-control-panel-brand-surface); color: var(--bthwani-control-panel-brand); }
.ui-web-cp-status-tag--success { background: var(--bthwani-success-surface); color: var(--bthwani-success-text); }
.ui-web-cp-status-tag--warning { background: var(--bthwani-warning-surface); color: var(--bthwani-warning-text); }
.ui-web-cp-status-tag--danger  { background: var(--bthwani-danger-surface); color: var(--bthwani-danger-text); }
.ui-web-cp-status-tag--info    { background: var(--bthwani-info-surface); color: var(--bthwani-info-text); }

.ui-web-cp-action-cluster { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ui-web-cp-action-cluster__primary {
  padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;
  background: var(--bthwani-control-panel-brand); color: var(--bthwani-brand-contrast); border: none; cursor: pointer; white-space: nowrap;
  transition: background 0.15s ease;
}
.ui-web-cp-action-cluster__primary:hover { background: var(--bthwani-brand); }
.ui-web-cp-action-cluster__secondary {
  padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  background: transparent; color: var(--bthwani-control-panel-brand); border: 1px solid var(--bthwani-control-panel-border-strong);
  cursor: pointer; white-space: nowrap; transition: border-color 0.15s ease;
}
.ui-web-cp-action-cluster__secondary:hover { border-color: var(--bthwani-control-panel-brand); }

.ui-web-cp-decision-row {
  display: grid;
  grid-template-columns: minmax(200px, 1.2fr) minmax(180px, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  background: var(--bthwani-control-panel-surface);
  border: 1px solid var(--bthwani-control-panel-border);
  border-radius: 10px;
  min-width: 0;
}
.ui-web-cp-decision-row--danger  { border-inline-start: 3px solid var(--bthwani-danger); }
.ui-web-cp-decision-row--warning { border-inline-start: 3px solid var(--bthwani-warning); }
.ui-web-cp-decision-row__meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ui-web-cp-decision-row__headline { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ui-web-cp-decision-row__id    { font-size: 13px; font-weight: 800; color: var(--bthwani-control-panel-brand); }
.ui-web-cp-decision-row__title { font-size: 12px; font-weight: 700; color: var(--bthwani-control-panel-brand); line-height: 1.35; }
.ui-web-cp-decision-row__text  { font-size: 11px; color: var(--bthwani-control-panel-text-muted); line-height: 1.35; }
.ui-web-cp-decision-row__sla   { font-size: 10px; font-weight: 800; color: var(--bthwani-control-panel-text-muted); }
.ui-web-cp-decision-row__rec   { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ui-web-cp-decision-row__rec-label  { font-size: 11px; font-weight: 700; color: var(--bthwani-control-panel-brand); }
.ui-web-cp-decision-row__rec-reason { font-size: 11px; color: var(--bthwani-control-panel-text-muted); line-height: 1.35; }

.ui-web-cp-recommendation {
  padding: 8px 12px;
  background: var(--bthwani-control-panel-surface-inset);
  border: 1px solid var(--bthwani-control-panel-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  direction: rtl;
  text-align: right;
}
.ui-web-cp-recommendation__header {
  font-size: 12px; font-weight: 700; color: var(--bthwani-control-panel-brand);
  display: flex; align-items: center; gap: 6px;
}
.ui-web-cp-recommendation__reason { font-size: 11px; color: var(--bthwani-control-panel-text-muted); line-height: 1.4; }
.ui-web-cp-recommendation__actions { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }

.ui-web-cp-inspector-shell {
  display: flex; flex-direction: column;
  background: var(--bthwani-control-panel-surface);
  border-inline-start: 1px solid var(--bthwani-control-panel-border);
  height: 100%; min-width: 0;
}
.ui-web-cp-inspector-shell__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--bthwani-control-panel-border); gap: 8px;
}
.ui-web-cp-inspector-shell__title  { font-size: 14px; font-weight: 800; color: var(--bthwani-control-panel-brand); margin: 0; }
.ui-web-cp-inspector-shell__close  {
  appearance: none; border: none; background: transparent;
  color: var(--bthwani-control-panel-text-muted); font-size: 18px; cursor: pointer; line-height: 1; padding: 2px 6px;
}
.ui-web-cp-inspector-shell__body  { flex: 1; min-height: 0; overflow: hidden; padding: 10px 12px; display: grid; align-content: start; gap: 10px; }
`;

function WebControlSurfaceStyles() {
  return <style>{webControlSurfaceCss}</style>;
}

export type WebControlSurfaceActionTone = 'primary' | 'secondary';

export type WebControlSurfaceAction = {
  id?: string;
  label: string;
  href?: string;
  onAction?: () => void;
  tone?: WebControlSurfaceActionTone;
};

type RenderableControlAction = WebControlSurfaceAction & {
  className?: string;
};

function renderControlAction(action: RenderableControlAction, key: React.Key) {
  const className = [
    'ui-web-control-action-button',
    action.tone === 'primary'
      ? 'ui-web-control-action-button--primary'
      : 'ui-web-control-action-button--secondary',
    action.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (action.href) {
    return (
      <a
        key={key}
        href={action.href}
        className={className}
        onClick={(event) => {
          if (action.onAction) {
            event.preventDefault();
            action.onAction();
          }
        }}
      >
        {action.label}
      </a>
    );
  }

  return (
    <button key={key} type="button" className={className} onClick={action.onAction}>
      {action.label}
    </button>
  );
}

export type WebControlActionButtonProps = WebControlSurfaceAction & {
  className?: string;
};

export function WebControlActionButton(props: WebControlActionButtonProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      {renderControlAction(props, props.id ?? props.label)}
    </>
  );
}

export type WebControlSurfaceHeaderChipTone = 'neutral' | 'brand' | 'accent';

export type WebControlSurfaceHeaderChip = {
  id?: string;
  label: string;
  tone?: WebControlSurfaceHeaderChipTone;
};

export type WebControlSurfaceHeaderProps = {
  chips?: ReadonlyArray<WebControlSurfaceHeaderChip>;
  title: string;
  description?: string;
  actions?: ReadonlyArray<WebControlSurfaceAction>;
};

export function WebControlSurfaceHeader({
  chips = [],
  title,
  description,
  actions = [],
}: WebControlSurfaceHeaderProps) {
  const { direction } = useDirection();

  return (
    <>
      <WebControlSurfaceStyles />
      <section className="ui-web-control-surface-header" dir={direction}>
        <div className="ui-web-control-surface-header__main">
          {chips.length > 0 ? (
            <div className="ui-web-control-surface-header__chips">
              {chips.map((chip) => {
                const chipClassName = [
                  'ui-web-control-surface-header__chip',
                  chip.tone === 'brand' ? 'ui-web-control-surface-header__chip--brand' : '',
                  chip.tone === 'accent' ? 'ui-web-control-surface-header__chip--accent' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <span key={chip.id ?? chip.label} className={chipClassName}>
                    {chip.label}
                  </span>
                );
              })}
            </div>
          ) : null}

          <h1 className="ui-web-control-surface-header__title">{title}</h1>
          {description ? <p className="ui-web-control-surface-header__description">{description}</p> : null}
        </div>

        {actions.length > 0 ? (
          <div className="ui-web-control-surface-header__actions">
            {actions.map((action) => renderControlAction(action, action.id ?? action.label))}
          </div>
        ) : null}
      </section>
    </>
  );
}

export type WebControlActionCardProps = {
  id?: string;
  title: string;
  description: string;
  footerLabel: string;
  href?: string;
  badge?: string;
  tone?: WebControlSurfaceActionTone;
  onAction?: () => void;
};

export function WebControlActionCard({
  id,
  title,
  description,
  footerLabel,
  href,
  badge,
  tone = 'secondary',
  onAction,
}: WebControlActionCardProps) {
  const className = [
    'ui-web-control-action-card',
    tone === 'primary' ? 'ui-web-control-action-card--primary' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <div className="ui-web-control-action-card__top">
        <strong className="ui-web-control-action-card__title">{title}</strong>
        {badge ? <span className="ui-web-control-action-card__badge">{badge}</span> : null}
      </div>
      <p className="ui-web-control-action-card__description">{description}</p>
      <span className="ui-web-control-action-card__footer">
        <span>{footerLabel}</span>
        <span className="ui-web-control-action-card__footer-arrow">&gt;</span>
      </span>
    </>
  );

  return (
    <>
      <WebControlSurfaceStyles />
      {href ? (
        <a
          key={id ?? title}
          href={href}
          className={className}
          onClick={(event) => {
            if (onAction) {
              event.preventDefault();
              onAction();
            }
          }}
        >
          {content}
        </a>
      ) : (
        <button key={id ?? title} type="button" className={className} onClick={onAction}>
          {content}
        </button>
      )}
    </>
  );
}

export type WebControlDisclosureItemProps = {
  id?: string;
  label: string;
  description: string;
  href?: string;
  badge?: string;
  onAction?: () => void;
};

export function WebControlDisclosureItem({
  id,
  label,
  description,
  href,
  badge,
  onAction,
}: WebControlDisclosureItemProps) {
  const content = (
    <>
      <div className="ui-web-control-disclosure-item__text">
        <strong className="ui-web-control-disclosure-item__label">{label}</strong>
        <span className="ui-web-control-disclosure-item__description">{description}</span>
      </div>
      {badge ? <span className="ui-web-control-disclosure-item__badge">{badge}</span> : null}
    </>
  );

  return (
    <>
      <WebControlSurfaceStyles />
      {href ? (
        <a
          key={id ?? label}
          href={href}
          className="ui-web-control-disclosure-item"
          onClick={(event) => {
            if (onAction) {
              event.preventDefault();
              onAction();
            }
          }}
        >
          {content}
        </a>
      ) : (
        <button key={id ?? label} type="button" className="ui-web-control-disclosure-item" onClick={onAction}>
          {content}
        </button>
      )}
    </>
  );
}

export type WebCompactSurfaceHeaderProps = {
  title: string;
  /** @deprecated Use description instead */
  subtitle?: string;
  description?: string;
  metrics?: ReadonlyArray<{ id: string; title: string; value: string }>;
  onBack?: () => void;
};

export function WebCompactSurfaceHeader({ title, description, subtitle, onBack, metrics = [] }: WebCompactSurfaceHeaderProps) {
  const resolvedDescription = description ?? subtitle;
  return (
    <>
      <WebControlSurfaceStyles />
      <header className="ui-web-compact-surface-header" dir="rtl">
        <div className="ui-web-compact-surface-header__title-block">
          <h1 className="ui-web-compact-surface-header__title">{title}</h1>
          {resolvedDescription && <p className="ui-web-compact-surface-header__description">{resolvedDescription}</p>}
        </div>
        <div className="ui-web-compact-surface-header__pulse">
          {metrics.map((metric) => (
            <div key={metric.id} className="ui-web-compact-surface-header__pulse-item">
              <span>{metric.title}</span>
              <span>{metric.value}</span>
            </div>
          ))}
        </div>
      </header>
    </>
  );
}

export type WebSystemSuggestionActionProps = {
  id: string;
  label: string;
  tone?: 'primary' | 'secondary';
  onAction?: () => void;
};

export type WebSystemSuggestionProps = {
  title: string;
  reason?: string;
  confidence?: 'high' | 'medium' | 'low';
  auditTag?: string;
  primaryAction?: WebSystemSuggestionActionProps;
  secondaryAction?: WebSystemSuggestionActionProps;
};

export function WebSystemSuggestion({
  title,
  reason,
  confidence,
  auditTag,
  primaryAction,
  secondaryAction,
}: WebSystemSuggestionProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <div className="ui-web-system-suggestion">
        <span className="ui-web-system-suggestion__header">{title}</span>
        {reason && <span className="ui-web-system-suggestion__reason">{reason}</span>}
        <div className="ui-web-system-suggestion__meta">
          {confidence === 'high' && <span className="ui-web-system-suggestion__conf-high">ثقة عالية</span>}
          {confidence === 'medium' && <span className="ui-web-system-suggestion__conf-medium">ثقة متوسطة</span>}
          {confidence === 'low' && <span className="ui-web-system-suggestion__conf-low">مراجعة مطلوبة</span>}
          {auditTag && <span className="ui-web-system-suggestion__audit">{auditTag}</span>}
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="ui-web-system-suggestion__actions">
            {primaryAction && (
              <button
                type="button"
                className="ui-web-system-suggestion__btn-primary"
                onClick={primaryAction.onAction}
              >
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button
                type="button"
                className="ui-web-system-suggestion__btn-secondary"
                onClick={secondaryAction.onAction}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Control Panel Lane Primitives ────────────────────────────────────────────

type WebControlPanelPosition = {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
};

type WebControlPanelMapTone = 'neutral' | 'success' | 'warning' | 'danger';

function joinClassNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function resolveCssLength(value?: number | string) {
  if (typeof value === 'number') {
    return `${value}px`;
  }

  return value;
}

function resolvePositionStyle(position?: WebControlPanelPosition): React.CSSProperties | undefined {
  if (!position) {
    return undefined;
  }

  return {
    top: resolveCssLength(position.top),
    insetInlineEnd: resolveCssLength(position.right),
    bottom: resolveCssLength(position.bottom),
    insetInlineStart: resolveCssLength(position.left),
  };
}

export type WebControlPanelViewportProps = {
  children?: React.ReactNode;
  className?: string;
};

export function WebControlPanelViewport({ children, className }: WebControlPanelViewportProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <section className={joinClassNames('ui-web-cp-viewport', className)}>{children}</section>
    </>
  );
}

export type WebControlPanelDenseHeaderMetric = {
  id: string;
  label: string;
  value: string;
};

export type WebControlPanelDenseHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  metrics?: ReadonlyArray<WebControlPanelDenseHeaderMetric>;
  actions?: React.ReactNode;
};

export function WebControlPanelDenseHeader({
  eyebrow,
  title,
  description,
  metrics = [],
  actions,
}: WebControlPanelDenseHeaderProps) {
  const { direction } = useDirection();

  return (
    <>
      <WebControlSurfaceStyles />
      <header className="ui-web-cp-dense-header" dir={direction}>
        <div className="ui-web-cp-dense-header__main">
          {eyebrow ? <span className="ui-web-cp-dense-header__eyebrow">{eyebrow}</span> : null}
          <h2 className="ui-web-cp-dense-header__title">{title}</h2>
          {description ? <p className="ui-web-cp-dense-header__description">{description}</p> : null}
          {metrics.length > 0 ? (
            <div className="ui-web-cp-dense-header__metrics">
              {metrics.map((metric) => (
                <div key={metric.id} className="ui-web-cp-dense-header__metric">
                  <span className="ui-web-cp-dense-header__metric-label">{metric.label}</span>
                  <span className="ui-web-cp-dense-header__metric-value">{metric.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {actions ? <div className="ui-web-cp-dense-header__actions">{actions}</div> : null}
      </header>
    </>
  );
}

export type WebControlPanelSplitPaneWidth = 'narrow' | 'regular' | 'wide';

export type WebControlPanelSplitPaneProps = {
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  secondaryPosition?: 'end' | 'start';
  secondaryWidth?: WebControlPanelSplitPaneWidth;
};

export function WebControlPanelSplitPane({
  primary,
  secondary,
  secondaryPosition = 'end',
  secondaryWidth = 'regular',
}: WebControlPanelSplitPaneProps) {
  const hasSecondary = !!secondary;
  return (
    <>
      <WebControlSurfaceStyles />
      <div
        className={joinClassNames(
          'ui-web-cp-split-pane',
          !hasSecondary && 'ui-web-cp-split-pane--solo',
          hasSecondary && secondaryWidth === 'narrow' && 'ui-web-cp-split-pane--narrow',
          hasSecondary && secondaryWidth === 'wide' && 'ui-web-cp-split-pane--wide',
          hasSecondary && secondaryPosition === 'start' && 'ui-web-cp-split-pane--secondary-start',
        )}
      >
        <div className="ui-web-cp-split-pane__primary">{primary}</div>
        {hasSecondary ? <div className="ui-web-cp-split-pane__secondary">{secondary}</div> : null}
      </div>
    </>
  );
}

export type WebControlPanelWorkbenchProps = {
  header?: React.ReactNode;
  controls?: React.ReactNode;
  main?: React.ReactNode;
  inspector?: React.ReactNode;
  footer?: React.ReactNode;
  secondaryPosition?: 'end' | 'start';
  secondaryWidth?: WebControlPanelSplitPaneWidth;
};

export function WebControlPanelWorkbench({
  header,
  controls,
  main,
  inspector,
  footer,
  secondaryPosition,
  secondaryWidth,
}: WebControlPanelWorkbenchProps) {
  return (
    <WebControlPanelViewport>
      {header}
      {controls}
      <div className="ui-web-cp-workbench">
        <div className="ui-web-cp-workbench__body">
          <WebControlPanelSplitPane
            primary={<div className="ui-web-cp-workbench__main">{main}</div>}
            secondary={inspector}
            secondaryPosition={secondaryPosition}
            secondaryWidth={secondaryWidth}
          />
        </div>
      </div>
      {footer}
    </WebControlPanelViewport>
  );
}

export type WebControlPanelLaneTabItem = {
  id: string;
  label: string;
  badge?: string;
  active?: boolean;
};

export type WebControlPanelLaneTabsProps = {
  items: ReadonlyArray<WebControlPanelLaneTabItem>;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
};

export function WebControlPanelLaneTabs({ items, onSelect, ariaLabel }: WebControlPanelLaneTabsProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <nav className="ui-web-cp-lane-tabs" aria-label={ariaLabel}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={joinClassNames('ui-web-cp-lane-tabs__button', item.active && 'ui-web-cp-lane-tabs__button--active')}
            aria-current={item.active ? 'page' : undefined}
            onClick={() => onSelect?.(item.id)}
          >
            <span>{item.label}</span>
            {item.badge ? <span className="ui-web-cp-lane-tabs__badge">{item.badge}</span> : null}
          </button>
        ))}
      </nav>
    </>
  );
}

export type WebControlPanelTertiaryFilterItem = WebControlPanelLaneTabItem;

export type WebControlPanelTertiaryFiltersProps = {
  items: ReadonlyArray<WebControlPanelTertiaryFilterItem>;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
};

export function WebControlPanelTertiaryFilters({
  items,
  onSelect,
  ariaLabel,
}: WebControlPanelTertiaryFiltersProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <nav className="ui-web-cp-tertiary-filters" aria-label={ariaLabel}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={joinClassNames(
              'ui-web-cp-tertiary-filters__button',
              item.active && 'ui-web-cp-tertiary-filters__button--active',
            )}
            aria-current={item.active ? 'page' : undefined}
            onClick={() => onSelect?.(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}

export type WebControlPanelCompactPagerProps = {
  page: number;
  totalPages: number;
  previousLabel?: string;
  nextLabel?: string;
  summaryLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
};

export function WebControlPanelCompactPager({
  page,
  totalPages,
  previousLabel = 'السابق',
  nextLabel = 'التالي',
  summaryLabel,
  onPrevious,
  onNext,
}: WebControlPanelCompactPagerProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const currentPage = Math.min(Math.max(page, 1), safeTotalPages);
  const resolvedSummary = summaryLabel ?? `صفحة ${currentPage} من ${safeTotalPages}`;

  return (
    <>
      <WebControlSurfaceStyles />
      <div className="ui-web-cp-compact-pager">
        <button
          type="button"
          className="ui-web-cp-compact-pager__button"
          onClick={onPrevious}
          disabled={currentPage <= 1 || !onPrevious}
        >
          {previousLabel}
        </button>
        <span className="ui-web-cp-compact-pager__summary">{resolvedSummary}</span>
        <button
          type="button"
          className="ui-web-cp-compact-pager__button"
          onClick={onNext}
          disabled={currentPage >= safeTotalPages || !onNext}
        >
          {nextLabel}
        </button>
      </div>
    </>
  );
}

export type WebControlPanelQueueProps = {
  title?: string;
  meta?: string;
  actions?: React.ReactNode;
  pager?: React.ReactNode;
  emptyState?: React.ReactNode;
  children?: React.ReactNode;
};

export function WebControlPanelQueue({
  title,
  meta,
  actions,
  pager,
  emptyState,
  children,
}: WebControlPanelQueueProps) {
  const hasContent = React.Children.count(children) > 0;

  return (
    <>
      <WebControlSurfaceStyles />
      <section className="ui-web-cp-queue">
        {(title || meta || actions) ? (
          <div className="ui-web-cp-queue__header">
            <div className="ui-web-cp-queue__title-block">
              {title ? <h3 className="ui-web-cp-queue__title">{title}</h3> : null}
              {meta ? <span className="ui-web-cp-queue__meta">{meta}</span> : null}
            </div>
            {actions}
          </div>
        ) : null}
        <div className="ui-web-cp-queue__rows">{hasContent ? children : emptyState}</div>
        {pager ? <div className="ui-web-cp-queue__footer">{pager}</div> : null}
      </section>
    </>
  );
}

export type WebControlPanelMapCanvasProps = {
  children?: React.ReactNode;
  legend?: React.ReactNode;
};

export function WebControlPanelMapCanvas({ children, legend }: WebControlPanelMapCanvasProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <section className="ui-web-cp-map-canvas">
        <div className="ui-web-cp-map-canvas__grid" />
        {legend ? <div className="ui-web-cp-map-canvas__legend">{legend}</div> : null}
        <div className="ui-web-cp-map-canvas__body">{children}</div>
      </section>
    </>
  );
}

export type WebControlPanelMiniMapZoneProps = {
  label: string;
  tone?: WebControlPanelMapTone;
  width?: number | string;
  height?: number | string;
  position?: WebControlPanelPosition;
  onSelect?: () => void;
};

export function WebControlPanelMiniMapZone({
  label,
  tone = 'neutral',
  width = 96,
  height = 96,
  position,
  onSelect,
}: WebControlPanelMiniMapZoneProps) {
  const style: React.CSSProperties = {
    ...resolvePositionStyle(position),
    width: resolveCssLength(width),
    height: resolveCssLength(height),
  };

  return (
    <>
      <WebControlSurfaceStyles />
      <button
        type="button"
        className={joinClassNames('ui-web-cp-map-zone', tone !== 'neutral' && `ui-web-cp-map-zone--${tone}`)}
        style={style}
        onClick={onSelect}
      >
        {label}
      </button>
    </>
  );
}

export type WebControlPanelMapPinProps = {
  label: string;
  tone?: WebControlPanelMapTone;
  position?: WebControlPanelPosition;
  onSelect?: () => void;
};

export function WebControlPanelMapPin({
  label,
  tone = 'neutral',
  position,
  onSelect,
}: WebControlPanelMapPinProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <button
        type="button"
        className={joinClassNames('ui-web-cp-map-pin', tone !== 'neutral' && `ui-web-cp-map-pin--${tone}`)}
        style={resolvePositionStyle(position)}
        onClick={onSelect}
      >
        {label}
      </button>
    </>
  );
}

export type WebControlPanelRouteLineProps = {
  points: string;
  tone?: WebControlPanelMapTone;
};

export function WebControlPanelRouteLine({ points, tone = 'neutral' }: WebControlPanelRouteLineProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <svg className="ui-web-cp-route-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={points}
          className={joinClassNames(
            'ui-web-cp-route-line__path',
            tone !== 'neutral' && `ui-web-cp-route-line__path--${tone}`,
          )}
        />
      </svg>
    </>
  );
}

export type WebControlPanelStatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type WebControlPanelStatusTagProps = { label: string; tone?: WebControlPanelStatusTone };
export function WebControlPanelStatusTag({ label, tone = 'neutral' }: WebControlPanelStatusTagProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <span className={`ui-web-cp-status-tag ui-web-cp-status-tag--${tone}`}>{label}</span>
    </>
  );
}

export type WebControlPanelActionItem = { id: string; label: string; onAction?: () => void };
export type WebControlPanelActionClusterProps = {
  primary?: WebControlPanelActionItem;
  secondary?: WebControlPanelActionItem;
};
export function WebControlPanelActionCluster({ primary, secondary }: WebControlPanelActionClusterProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <div className="ui-web-cp-action-cluster">
        {primary?.onAction && <button type="button" className="ui-web-cp-action-cluster__primary" onClick={primary.onAction}>{primary.label}</button>}
        {secondary?.onAction && <button type="button" className="ui-web-cp-action-cluster__secondary" onClick={secondary.onAction}>{secondary.label}</button>}
      </div>
    </>
  );
}

export type WebControlPanelDecisionRowRisk = 'danger' | 'warning' | 'neutral';
export type WebControlPanelDecisionRowProps = {
  entityId: string;
  entityLabel?: string;
  status?: string;
  statusTone?: WebControlPanelStatusTone;
  risk?: WebControlPanelDecisionRowRisk;
  recommendation?: string;
  reason?: string;
  sla?: string;
  primaryAction?: WebControlPanelActionItem;
  secondaryAction?: WebControlPanelActionItem;
  onInspect?: () => void;
};
export function WebControlPanelDecisionRow({
  entityId, entityLabel, status, statusTone = 'neutral', risk = 'neutral',
  recommendation, reason, sla, primaryAction, secondaryAction, onInspect,
}: WebControlPanelDecisionRowProps) {
  const rowClass = ['ui-web-cp-decision-row',
    risk === 'danger' ? 'ui-web-cp-decision-row--danger' : '',
    risk === 'warning' ? 'ui-web-cp-decision-row--warning' : '',
  ].filter(Boolean).join(' ');
  return (
    <>
      <WebControlSurfaceStyles />
      <div className={rowClass}>
        <div className="ui-web-cp-decision-row__meta">
          <div className="ui-web-cp-decision-row__headline">
            <span className="ui-web-cp-decision-row__id">{entityId}</span>
            {status && <WebControlPanelStatusTag label={status} tone={statusTone} />}
          </div>
          {entityLabel && <span className="ui-web-cp-decision-row__title">{entityLabel}</span>}
          {sla && <span className="ui-web-cp-decision-row__sla">{sla}</span>}
        </div>
        {(recommendation || reason) && (
          <div className="ui-web-cp-decision-row__rec">
            {recommendation && <span className="ui-web-cp-decision-row__rec-label">{recommendation}</span>}
            {reason && <span className="ui-web-cp-decision-row__rec-reason">{reason}</span>}
          </div>
        )}
        <div className="ui-web-cp-action-cluster">
          {primaryAction?.onAction && <button type="button" className="ui-web-cp-action-cluster__primary" onClick={primaryAction.onAction}>{primaryAction.label}</button>}
          {secondaryAction?.onAction && <button type="button" className="ui-web-cp-action-cluster__secondary" onClick={secondaryAction.onAction}>{secondaryAction.label}</button>}
          {onInspect && <button type="button" className="ui-web-cp-action-cluster__secondary" onClick={onInspect} aria-label="فتح التفاصيل">←</button>}
        </div>
      </div>
    </>
  );
}

export type WebControlPanelRecommendationProps = {
  title: string;
  reason?: string;
  confidence?: 'high' | 'medium' | 'low';
  auditTag?: string;
  primaryAction?: WebControlPanelActionItem;
  secondaryAction?: WebControlPanelActionItem;
};
export function WebControlPanelRecommendation({ title, reason, confidence, auditTag, primaryAction, secondaryAction }: WebControlPanelRecommendationProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <div className="ui-web-cp-recommendation">
        <div className="ui-web-cp-recommendation__header">
          <span>{title}</span>
          {confidence === 'high' && <span className="ui-web-system-suggestion__conf-high">ثقة عالية</span>}
          {confidence === 'medium' && <span className="ui-web-system-suggestion__conf-medium">ثقة متوسطة</span>}
          {confidence === 'low' && <span className="ui-web-system-suggestion__conf-low">مراجعة مطلوبة</span>}
          {auditTag && <span className="ui-web-system-suggestion__audit">{auditTag}</span>}
        </div>
        {reason && <span className="ui-web-cp-recommendation__reason">{reason}</span>}
        {(primaryAction?.onAction || secondaryAction?.onAction) && (
          <div className="ui-web-cp-recommendation__actions">
            {primaryAction?.onAction && <button type="button" className="ui-web-cp-action-cluster__primary" onClick={primaryAction.onAction}>{primaryAction.label}</button>}
            {secondaryAction?.onAction && <button type="button" className="ui-web-cp-action-cluster__secondary" onClick={secondaryAction.onAction}>{secondaryAction.label}</button>}
          </div>
        )}
      </div>
    </>
  );
}

export type WebControlPanelInspectorShellProps = { title: string; onClose?: () => void; children?: React.ReactNode };
export function WebControlPanelInspectorShell({ title, onClose, children }: WebControlPanelInspectorShellProps) {
  return (
    <>
      <WebControlSurfaceStyles />
      <div className="ui-web-cp-inspector-shell">
        <div className="ui-web-cp-inspector-shell__header">
          <h2 className="ui-web-cp-inspector-shell__title">{title}</h2>
          {onClose && <button type="button" className="ui-web-cp-inspector-shell__close" onClick={onClose} aria-label="إغلاق">×</button>}
        </div>
        <div className="ui-web-cp-inspector-shell__body">{children}</div>
      </div>
    </>
  );
}
