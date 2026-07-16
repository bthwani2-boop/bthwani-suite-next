import type { ReactNode } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import type { ActorIdentity } from "@bthwani/core-identity";
import { LoadingState, ErrorState, PermissionState } from "@bthwani/ui-kit";

/**
 * Runtime role literal accepted by DSH surfaces. Sourced from
 * ActorIdentity["roles"] (core/identity) rather than re-declared, so this
 * type always tracks the real identity contract.
 */
export type DshSurfaceRole = ActorIdentity["roles"][number];

export type IdentitySessionGateProps = {
  /** The role required to view this surface (e.g. "client", "partner", "captain", "field"). */
  readonly requiredRole: DshSurfaceRole;
  /**
   * Optional key into ActorIdentity.surfaceAccess (e.g. "app-client"). When
   * provided, the authenticated identity must also have surfaceAccess[key]
   * === true, in addition to holding requiredRole.
   */
  readonly requiredSurface?: string;
  readonly children: ReactNode;
};

/**
 * Single reusable gate for all 4 Expo DSH surfaces (app-client, app-partner,
 * app-captain, app-field). Wraps useIdentitySession() and renders a distinct,
 * real UI for every state the identity session can be in before rendering
 * `children`.
 *
 * Sign-in itself is out of scope here: these runtimes expect an identity
 * session to be restored from storage (configureIdentitySession +
 * configureIdentitySessionStorage, called once at app startup) or injected
 * by a host shell. There is no in-app login screen behind this gate.
 */
export function IdentitySessionGate({
  requiredRole,
  requiredSurface,
  children,
}: IdentitySessionGateProps) {
  const { state } = useIdentitySession();

  switch (state.kind) {
    case "restoring":
    case "authenticating":
      return <LoadingState title="جاري التحقق من الجلسة" description="يتم استعادة جلسة الدخول الحالية." />;

    case "unconfigured":
      return (
        <ErrorState
          title="الجلسة غير مهيأة"
          description="لم يتم تهيئة خدمة الهوية لهذا التطبيق بعد. تواصل مع فريق التشغيل."
        />
      );

    case "error":
      return (
        <ErrorState
          title="تعذر التحقق من الجلسة"
          description={state.message}
        />
      );

    case "signed_out":
      return (
        <PermissionState
          title="لم يتم تسجيل الدخول"
          description="هذا التطبيق لا يملك شاشة تسجيل دخول خاصة به — يجب تسجيل الدخول عبر البوابة المضيفة (Host Shell) قبل فتح هذه الواجهة."
        />
      );

    case "authenticated": {
      const hasRole = state.identity.roles.includes(requiredRole);
      const hasSurfaceAccess =
        requiredSurface === undefined || state.identity.surfaceAccess[requiredSurface] === true;

      if (!hasRole || !hasSurfaceAccess) {
        return (
          <PermissionState
            title="لا تملك صلاحية الوصول"
            description={
              !hasRole
                ? `هذه الواجهة مخصصة لدور "${requiredRole}" ولا يملكه المستخدم الحالي.`
                : `المستخدم الحالي لا يملك صلاحية الوصول إلى سطح "${requiredSurface}".`
            }
          />
        );
      }

      return <>{children}</>;
    }

    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
