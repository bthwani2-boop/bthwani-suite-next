import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { colorRoles } from "@bthwani/ui-kit";
import { DshFieldSurface } from "./components/DshFieldSurface";
import { DshFieldProfileCompletionScreen } from "./account/DshFieldProfileCompletionScreen";
import {
  fetchFieldOperationalReadiness,
  type FieldOperationalReadiness,
} from "./field-operational-readiness.api";
import type { DshFieldSurfaceProps } from "./dsh-field.routes";
import { IdentitySessionGate } from "../shared/session/IdentitySessionGate";
import {
  WorkforceAccessGate,
  WorkforceProfileProvider,
} from "../shared/workforce";
import { useDshMobilePushRegistration } from "../shared/notifications/use-mobile-push-registration";
import {
  DshOperationalReadinessBoundary,
  DshReadinessRequirementList,
} from "../shared/readiness/DshOperationalReadinessBoundary";

const FIELD_REASON_MESSAGES: Readonly<Record<string, string>> = {
  fieldProfile: "الملف المهني للميداني غير مكتمل.",
  cityCode: "مدينة العمل غير محددة.",
  serviceZoneId: "منطقة الخدمة غير محددة.",
  supervisorActorId: "المشرف المسؤول غير محدد.",
  nationalIdNumber: "بيانات الهوية الوطنية غير مكتملة.",
  identityFrontMediaRef: "صورة الهوية غير مرفقة.",
  identityApproved: "الهوية لم تعتمد بعد.",
  contractMediaRef: "العقد غير مرفق.",
  contractApproved: "العقد لم يعتمد بعد.",
};

export type DshFieldApplicationProps = DshFieldSurfaceProps & {
  readonly pushScheme: string;
};

function FieldApplicationContent({ pushScheme, ...surfaceProps }: DshFieldApplicationProps) {
  const identity = useIdentitySession();
  useDshMobilePushRegistration(identity.state.kind, "app-field", pushScheme);
  const logout = () => void identity.logout();

  return (
    <View style={styles.root}>
      <IdentitySessionGate requiredRole="field" requiredSurface="app-field">
        <WorkforceAccessGate
          expectedKind="field"
          onLogout={logout}
          incompleteContent={<DshFieldProfileCompletionScreen onLogout={logout} />}
        >
          <DshOperationalReadinessBoundary<FieldOperationalReadiness>
            load={fetchFieldOperationalReadiness}
            loadingAccessibilityLabel="جارٍ التحقق من الجاهزية..."
            unavailableMessage="تعذر التحقق من جاهزية العمل الآن."
            backgroundColor={colorRoles.surfaceMuted}
            renderBlocked={(readiness, onRefresh) => (
              <DshReadinessRequirementList
                missing={readiness.missing}
                messages={FIELD_REASON_MESSAGES}
                subtitle="الرجاء معالجة الملاحظات التالية قبل المتابعة:"
                onRefresh={onRefresh}
              />
            )}
          >
            <DshFieldSurface {...surfaceProps} />
          </DshOperationalReadinessBoundary>
        </WorkforceAccessGate>
      </IdentitySessionGate>
    </View>
  );
}

export function DshFieldApplication(props: DshFieldApplicationProps) {
  return (
    <WorkforceProfileProvider>
      <FieldApplicationContent {...props} />
    </WorkforceProfileProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceMuted },
});
