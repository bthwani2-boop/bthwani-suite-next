"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useControlPanelSession } from "@dsh-shared/session/control-panel-session";
import { colorRoles, alpha } from "@bthwani/ui-kit";

type LoginMode = "access-code" | "password";

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
  const { state, activate, login } = useControlPanelSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>("access-code");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
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

    if (mode === "access-code") {
      const succeeded = await activate(phone.trim(), code.trim());
      if (!succeeded) {
        setSubmitError("كود الدخول غير صحيح أو منتهي أو لا يخص هذا الحساب.");
      }
      return;
    }

    const succeeded = await login(username.trim(), password);
    if (!succeeded) {
      setSubmitError("اسم المستخدم أو كلمة المرور غير صحيحة.");
    }
  }

  const isSubmitting = state.kind === "authenticating";
  const accessCodeReady = phone.trim().length >= 8 && /^\d{6}$/.test(code.trim());
  const passwordReady = username.trim().length > 0 && password.length >= 6;
  const submitDisabled = isSubmitting || (mode === "access-code" ? !accessCodeReady : !passwordReady);

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
            الموظف يدخل أول مرة بكود صادر من منصة بثواني بعد إنشاء حسابه ومنحه صلاحيات القسم.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="طريقة الدخول"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "access-code"}
            onClick={() => {
              setMode("access-code");
              setSubmitError(null);
            }}
            style={{
              padding: "0.65rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--card-border)",
              background: mode === "access-code" ? "var(--grad-blue)" : "transparent",
              color: mode === "access-code" ? "white" : "var(--text-primary)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            كود دخول المنصة
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "password"}
            onClick={() => {
              setMode("password");
              setSubmitError(null);
            }}
            style={{
              padding: "0.65rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--card-border)",
              background: mode === "password" ? "var(--grad-blue)" : "transparent",
              color: mode === "password" ? "white" : "var(--text-primary)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            دخول إداري بديل
          </button>
        </div>

        {mode === "access-code" ? (
          <>
            <label style={{ display: "grid", gap: "0.375rem", fontSize: "0.875rem" }}>
              رقم الهاتف المرتبط بالموظف
              <input
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="777123456"
                required
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: "0.375rem", fontSize: "0.875rem" }}>
              كود الدخول الصادر من منصة بثواني
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6 أرقام"
                pattern="[0-9]{6}"
                required
                style={inputStyle}
              />
            </label>

            <p style={{ margin: 0, opacity: 0.68, fontSize: "0.8rem", lineHeight: 1.7 }}>
              هذا كود سماح بالدخول تمنحه المنصة، وليس رمز تحقق يُرسل تلقائيًا إلى رقم الهاتف.
            </p>
          </>
        ) : (
          <>
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
          </>
        )}

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
          {isSubmitting
            ? "جاري التحقق..."
            : mode === "access-code"
              ? "تسجيل المتصفح والدخول"
              : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
