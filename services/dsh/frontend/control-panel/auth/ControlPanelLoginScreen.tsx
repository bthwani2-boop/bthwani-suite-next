"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { TokenResponse } from "@bthwani/core-identity";
import { identityErrorPresentation } from "@bthwani/core-identity";
import { alpha, colorRoles } from "@bthwani/ui-kit";
import { useControlPanelSession } from "../session";

export type ControlPanelLoginScreenProps = {
  readonly returnTo: string;
  readonly onAuthenticated: (returnTo: string) => void;
  readonly developmentMode?: boolean;
  readonly requestDevelopmentSession?: () => Promise<TokenResponse>;
};

export function ControlPanelLoginScreen({
  returnTo,
  onAuthenticated,
  developmentMode = false,
  requestDevelopmentSession,
}: ControlPanelLoginScreenProps) {
  const { state, login, retryBootstrap, adoptSession } = useControlPanelSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [quickLoginPending, setQuickLoginPending] = useState(false);
  const [quickLoginError, setQuickLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (state.kind === "authenticated") onAuthenticated(returnTo);
  }, [state.kind, returnTo, onAuthenticated]);

  async function handleQuickLogin() {
    if (quickLoginPending || !requestDevelopmentSession) return;
    setQuickLoginPending(true);
    setQuickLoginError(null);
    try {
      await adoptSession(await requestDevelopmentSession());
    } catch (error) {
      setQuickLoginError(
        error instanceof Error && error.name === "TimeoutError"
          ? "DEV_SESSION_BROKER_UNAVAILABLE"
          : error instanceof Error
            ? error.message
            : "DEV_SESSION_BROKER_UNAVAILABLE",
      );
    } finally {
      setQuickLoginPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await login(username.trim(), password);
  }

  const isSubmitting = state.kind === "authenticating";
  const passwordReady = username.trim().length > 0 && password.length >= 6;
  const submitDisabled = isSubmitting || !passwordReady;
  const errorPresentation = state.kind === "error"
    ? identityErrorPresentation(state.message)
    : null;
  const quickErrorPresentation = quickLoginError
    ? identityErrorPresentation(quickLoginError)
    : null;

  const inputStyle = {
    padding: "0.625rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--cp-card-border)",
    background: "var(--cp-card-bg)",
    color: "var(--cp-text-primary)",
  } as const;

  if (state.kind === "service_unavailable") {
    return (
      <div
        dir="rtl"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--cp-main-bg)",
          padding: "1rem",
        }}
      >
        <div
          role="alert"
          style={{
            width: "30rem",
            maxWidth: "100%",
            display: "grid",
            gap: "1rem",
            padding: "2rem",
            borderRadius: "1rem",
            border: "1px solid var(--cp-card-border)",
            background: "var(--cp-card-bg)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>خدمة الهوية غير متاحة</h1>
          <p style={{ margin: 0, lineHeight: 1.8 }}>
            لم تُعامل الحالة كفشل بيانات دخول، ولم تُحذف الجلسة المحفوظة. أعد الفحص بعد عودة الخدمة.
          </p>
          <button
            type="button"
            onClick={() => void retryBootstrap()}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "var(--cp-grad-blue)",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            إعادة الفحص
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--cp-main-bg)",
        padding: "1rem",
      }}
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        style={{
          width: "26rem",
          maxWidth: "100%",
          display: "grid",
          gap: "1rem",
          padding: "2rem",
          borderRadius: "1rem",
          border: "1px solid var(--cp-card-border)",
          background: "var(--cp-card-bg)",
          boxShadow: `0 1px 2px ${alpha(colorRoles.shadowBase, 0.06)}`,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>الدخول إلى لوحة بثواني</h1>
          <p style={{ margin: "0.25rem 0 0", opacity: 0.72, fontSize: "0.875rem", lineHeight: 1.8 }}>
            قم بتسجيل الدخول باستخدام بيانات حسابك المعتمدة.
          </p>
        </div>

        <label style={{ display: "grid", gap: "0.375rem", fontSize: "0.875rem" }}>
          اسم المستخدم
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "0.375rem", fontSize: "0.875rem" }}>
          كلمة المرور
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            minLength={6}
            style={inputStyle}
          />
        </label>

        <p style={{ margin: 0, opacity: 0.68, fontSize: "0.8rem", lineHeight: 1.7 }}>
          هذا المسار للحسابات السيادية أو التشغيلية البديلة المصرح بها فقط.
        </p>

        {errorPresentation ? (
          <p role="alert" style={{ margin: 0, color: colorRoles.danger, fontSize: "0.875rem" }}>
            {errorPresentation.title}: {errorPresentation.description}
          </p>
        ) : null}

        {quickErrorPresentation ? (
          <p role="alert" style={{ margin: 0, color: colorRoles.danger, fontSize: "0.875rem" }}>
            {quickErrorPresentation.title}: {quickErrorPresentation.description}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitDisabled || quickLoginPending}
          style={{
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "var(--cp-grad-blue)",
            color: "white",
            fontWeight: 700,
            cursor: isSubmitting ? "wait" : submitDisabled ? "not-allowed" : "pointer",
            opacity: submitDisabled || quickLoginPending ? 0.65 : 1,
          }}
        >
          {isSubmitting ? "جاري التحقق..." : "تسجيل الدخول"}
        </button>

        {developmentMode && requestDevelopmentSession ? (
          <button
            type="button"
            onClick={() => void handleQuickLogin()}
            disabled={isSubmitting || quickLoginPending}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--cp-card-border)",
              background: "transparent",
              color: "var(--cp-text-primary)",
              fontWeight: 700,
              cursor: isSubmitting || quickLoginPending ? "wait" : "pointer",
              opacity: isSubmitting || quickLoginPending ? 0.65 : 1,
              marginTop: "0.5rem",
            }}
          >
            {quickLoginPending ? "جاري الدخول السريع..." : "دخول سريع كمشغل التطوير المحلي"}
          </button>
        ) : null}
      </form>
    </div>
  );
}
