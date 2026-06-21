import type { ReactNode } from "react";

export type PaginationToolbarProps = {
  readonly label: string;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onRetry: () => void;
  readonly prevLabel?: string;
  readonly nextLabel?: string;
  readonly retryLabel?: string;
  readonly children?: ReactNode;
};

export function PaginationToolbar({
  label,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onRetry,
  prevLabel = "السابق",
  nextLabel = "التالي",
  retryLabel = "تحديث",
  children,
}: PaginationToolbarProps) {
  return (
    <div style={toolbarStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={actionsStyle}>
        {children}
        {hasPrev && <PaginationButton label={prevLabel} onClick={onPrev} />}
        {hasNext && <PaginationButton label={nextLabel} onClick={onNext} />}
        <PaginationButton label={retryLabel} onClick={onRetry} />
      </div>
    </div>
  );
}

function PaginationButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={btnStyle}>
      {label}
    </button>
  );
}

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.375rem 1rem",
  fontSize: "0.875rem",
  opacity: 0.75,
};

const labelStyle: React.CSSProperties = {
  flexShrink: 0,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
};

const btnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid currentColor",
  borderRadius: "0.25rem",
  padding: "0.25rem 0.75rem",
  cursor: "pointer",
  fontSize: "0.8rem",
};
