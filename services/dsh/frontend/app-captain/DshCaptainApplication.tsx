import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { colorRoles } from "@bthwani/ui-kit";
import { DshCaptainSurface } from "./DshCaptainSurface";
import type { DshCaptainSurfaceProps } from "./dsh-captain.types";
import { IdentitySessionGate } from "../shared/session/IdentitySessionGate";
import {
  WorkforceAccessGate,
  WorkforceProfileProvider,
} from "../shared/workforce";
import {
  fetchOwnCaptainReadiness,
  type DshCaptainReadiness,
} from "../shared/dispatch";
import { useDshMobilePushRegistration } from "../shared/notifications/use-mobile-push-registration";
import {
  DshOperationalReadinessBoundary,
  DshReadinessRequirementList,
} from "../shared/readiness/DshOperationalReadinessBoundary";

const CAPTAIN_REASON_MESSAGES: Readonly<Record<string, string>> = {
  IDENTITY_SUSPENDED: "تم تعليق الهوية الرقمية الخاصة بك. يرجى مراجعة الإدارة.",
  PROFILE_INCOMPLETE: "الملف المهني غير مكتمل. يرجى استكمال المتطلبات.",
  DOCUMENTS_EXPIRED: "هناك مستندات تشغيلية منتهية الصلاحية.",
  ENGAGEMENT_INACTIVE: "حالة الارتباط المهني لا تسمح ببدء العمل.",
  DISPATCH_ACCREDITATION_REQUIRED: "اعتماد التشغيل للتوصيل غير مكتمل.",
  DISPATCH_SUSPENDED: "حالة التشغيل للتوصيل موقوفة حالياً.",
  DISPATCH_PROFILE_REQUIRED: "ملف التشغيل للتوصيل غير مكتمل.",
  CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED: "الأهلية المالية للكابتن غير مكتملة.",
};

export type DshCaptainApplicationProps = DshCaptainSurfaceProps & {
  readonly pushScheme: string;
};

function CaptainApplicationContent({ pushScheme, ...surfaceProps }: DshCaptainApplicationProps) {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-captain", pushScheme);
  const logout = () => void identity.logout();

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="captain" requiredSurface="app-captain">
        <WorkforceAccessGate expectedKind="captain" onLogout={logout}>
          <DshOperationalReadinessBoundary<DshCaptainReadiness>
            load={fetchOwnCaptainReadiness}
            loadingAccessibilityLabel="جارٍ التحقق من جاهزية الكابتن..."
            unavailableMessage="تعذر التحقق من الجاهزية التشغيلية الآن. أعد المحاولة قبل بدء العمل."
            backgroundColor={colorRoles.surfaceBase}
            renderBlocked={(readiness, onRefresh) => (
              <DshReadinessRequirementList
                missing={readiness.missing}
                messages={CAPTAIN_REASON_MESSAGES}
                subtitle="الرجاء معالجة المتطلبات التالية قبل المتابعة:"
                onRefresh={onRefresh}
              />
            )}
          >
            <DshCaptainSurface {...surfaceProps} />
          </DshOperationalReadinessBoundary>
        </WorkforceAccessGate>
      </IdentitySessionGate>
    </View>
  );
}

export function DshCaptainApplication(props: DshCaptainApplicationProps) {
  return (
    <WorkforceProfileProvider>
      <CaptainApplicationContent {...props} />
    </WorkforceProfileProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
});
