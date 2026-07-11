"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useControlPanelSession } from "@dsh-shared/session/control-panel-session";

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
    const succeeded = await login(username.trim(), password);
    if (!succeeded) {
      setSubmitError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  }

  const isSubmitting = state.kind === "authenticating";

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--main-bg, rgb(240, 244, 250))",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "24rem",
          maxWidth: "90vw",
          display: "grid",
          gap: "1rem",
          padding: "2rem",
          borderRadius: "1rem",
          border: "1px solid var(--card-border, rgb(226, 232, 243))",
          background: "var(--card-bg, rgb(255, 255, 255))",
          boxShadow: "0 1px 2px rgba(13, 20, 37, 0.06)",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>لوحة تحكم DSH</h1>
          <p style={{ margin: "0.25rem 0 0", opacity: 0.7, fontSize: "0.875rem" }}>
            سجّل الدخول بحساب مصرّح للوصول إلى لوحة التحكم.
          </p>
        </div>

        <label style={{ display: "grid", gap: "0.375rem", fontSize: "0.875rem" }}>
          اسم المستخدم
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            style={{
              padding: "0.625rem 0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--card-border, rgb(226, 232, 243))",
            }}
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
            minLength={12}
            style={{
              padding: "0.625rem 0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--card-border, rgb(226, 232, 243))",
            }}
          />
        </label>

        {submitError && (
          <p role="alert" style={{ margin: 0, color: "rgb(220, 38, 38)", fontSize: "0.875rem" }}>
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={username.trim().length === 0 || password.length < 12 || isSubmitting}
          style={{
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "var(--grad-blue, linear-gradient(135deg,rgb(59, 123, 255),rgb(94, 151, 255)))",
            color: "white",
            fontWeight: 700,
            cursor: isSubmitting ? "wait" : "pointer",
          }}
        >
          {isSubmitting ? "جاري التحقق..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
