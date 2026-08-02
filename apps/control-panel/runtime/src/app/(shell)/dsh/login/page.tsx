"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useControlPanelSession } from "@bthwani/dsh/control-panel/session";
import { colorRoles, alpha } from "@bthwani/ui-kit";

function resolveSafeReturnTo(raw: string | null): string {
  if (!raw) return "/dsh/dashboard";
  if (!raw.startsWith("/dsh") || raw.startsWith("//") || raw.includes("://")) {
    return "/dsh/dashboard";
  }
  return raw;
}

export default function DshLoginPage() {
  return (
    <Suspense fallback={null}>
      <DshLoginForm />
    </Suspense>
  );
}

function DshLoginForm() {
  const { state, login } = useControlPanelSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const returnTo = resolveSafeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    if (state.kind === "authenticated") {
      router.replace(returnTo);
    }
  }, [state.kind, returnTo, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError(null);

    try {
      await login(username.trim(), password);
    } catch (err) {
      setSubmitError("اسم المستخدم أو كلمة المرور غير صحيحة.");
    }
  }

  const isSubmitting = state.kind === "authenticating";
  const passwordReady = username.trim().length > 0 && password.length >= 6;
  const submitDisabled = isSubmitting || !passwordReady;

  const inputStyle = {
    padding: "0.625rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
    color: "var(--text-primary)",
  } as const;

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--main-bg)",
        padding: "1rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "26rem",
          maxWidth: "100%",
          display: "grid",
          gap: "1rem",
          padding: "2rem",
          borderRadius: "1rem",
          border: "1px solid var(--card-border)",
          background: "var(--card-bg)",
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

        {submitError ? (
          <p role="alert" style={{ margin: 0, color: colorRoles.danger, fontSize: "0.875rem" }}>
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitDisabled}
          style={{
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "var(--grad-blue)",
            color: "white",
            fontWeight: 700,
            cursor: isSubmitting ? "wait" : submitDisabled ? "not-allowed" : "pointer",
            opacity: submitDisabled ? 0.65 : 1,
          }}
        >
          {isSubmitting ? "جاري التحقق..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
