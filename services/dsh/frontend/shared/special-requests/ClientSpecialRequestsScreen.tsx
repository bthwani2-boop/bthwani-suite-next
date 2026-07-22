import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Screen, StateView, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import {
  canClientApproveSpecialRequestQuote,
  canClientCancelSpecialRequest,
  clientCancellationActionLabel,
  isClientQuoteDecisionPending,
  specialRequestStatusLabel,
  specialRequestTypeLabel,
} from "./special-requests.actions";
import { useClientSpecialRequestsListController } from "./use-special-requests-controller";
import type { DshSpecialRequestResponse } from "./special-requests.types";

export type ClientSpecialRequestsScreenProps = {
  readonly onBack: () => void;
  readonly onCreateShein: () => void;
  readonly onCreateAwnak: () => void;
};

function quoteLabel(request: DshSpecialRequestResponse): string | null {
  if (request.estimatedAmountMinorUnits === null || request.estimatedAmountMinorUnits === undefined || !request.currency) {
    return null;
  }
  try {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: request.currency,
    }).format(request.estimatedAmountMinorUnits / 100);
  } catch {
    return `${request.estimatedAmountMinorUnits} ${request.currency}`;
  }
}

export function ClientSpecialRequestsScreen({
  onBack,
  onCreateShein,
  onCreateAwnak,
}: ClientSpecialRequestsScreenProps) {
  const {
    requests,
    total,
    loadState,
    busyRequestId,
    load,
    cancelRequest,
    approveQuote,
  } = useClientSpecialRequestsListController();

  if (loadState === "loading" && requests.length === 0) {
    return (
      <Screen padded>
        <StateView
          stateId="loading"
          title="جاري تحميل طلباتك الخاصة"
          description="تتم قراءة أحدث حالة من خدمة DSH."
        />
      </Screen>
    );
  }

  if (loadState === "offline" || loadState === "error" || loadState === "forbidden" || loadState === "conflict") {
    const stateCopy = {
      offline: {
        title: "تعذر الاتصال",
        description: "تحقق من الشبكة ثم أعد المحاولة.",
      },
      error: {
        title: "تعذر تحميل الطلبات",
        description: "حدث خطأ أثناء قراءة طلباتك الخاصة.",
      },
      forbidden: {
        title: "الوصول غير متاح",
        description: "أعد تسجيل الدخول بالحساب الذي أنشأ الطلبات.",
      },
      conflict: {
        title: "تغيرت حالة الطلب",
        description: "أعد القراءة للحصول على النسخة الأحدث.",
      },
    } as const;
    const copy = stateCopy[loadState];
    return (
      <Screen padded>
        <StateView
          title={copy.title}
          description={copy.description}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void load()}
        />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Button label="رجوع" tone="secondary" onPress={onBack} />
          <View style={styles.headerCopy}>
            <Text role="headingSm" style={styles.rtlText}>طلباتي الخاصة</Text>
            <Text style={styles.secondaryText}>إجمالي الطلبات: {total}</Text>
          </View>
        </View>

        <View style={styles.createRow}>
          <Button label="طلب شي إن" tone="primary" onPress={onCreateShein} style={styles.flexButton} />
          <Button label="طلب عونك" tone="secondary" onPress={onCreateAwnak} style={styles.flexButton} />
        </View>

        {requests.length === 0 ? (
          <StateView
            stateId="empty"
            title="لا توجد طلبات خاصة"
            description="أنشئ طلب عونك أو طلب شراء مساعد من شي إن."
            actionLabel="طلب عونك"
            onActionPress={onCreateAwnak}
          />
        ) : (
          <View style={styles.list}>
            {requests.map((request) => {
              const amount = quoteLabel(request);
              const isBusy = busyRequestId === request.id;
              const canApprove = canClientApproveSpecialRequestQuote(request);
              const canCancel = canClientCancelSpecialRequest(request);
              const quoteDecisionPending = isClientQuoteDecisionPending(request);
              const cancellationLabel = clientCancellationActionLabel(request);

              return (
                <View key={request.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text role="titleSm" style={styles.rtlText}>{specialRequestTypeLabel(request)}</Text>
                    <Text style={styles.statusText}>{specialRequestStatusLabel(request)}</Text>
                  </View>
                  <Text style={styles.secondaryText}>المرجع: {request.id}</Text>
                  <Text style={styles.secondaryText}>النسخة: {request.version}</Text>
                  {amount ? <Text style={styles.amountText}>العرض: {amount}</Text> : null}
                  {request.rejectionReason ? (
                    <Text style={styles.errorText}>سبب الرفض: {request.rejectionReason}</Text>
                  ) : null}
                  {request.wltPaymentSessionId ? (
                    <Text style={styles.successText}>تم إنشاء جلسة الدفع: {request.wltPaymentSessionId}</Text>
                  ) : null}

                  {canApprove || canCancel ? (
                    <View style={styles.actionRow}>
                      {canApprove ? (
                        <Button
                          label={isBusy ? "جاري الاعتماد..." : "اعتماد العرض والدفع"}
                          tone="primary"
                          disabled={isBusy}
                          onPress={() => void approveQuote(request)}
                          style={styles.flexButton}
                        />
                      ) : null}
                      {canCancel ? (
                        <Button
                          label={isBusy
                            ? quoteDecisionPending ? "جاري رفض العرض..." : "جاري الإلغاء..."
                            : cancellationLabel}
                          tone="danger"
                          disabled={isBusy}
                          onPress={() => void cancelRequest(request)}
                          style={styles.flexButton}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <Button label="تحديث الحالات" tone="secondary" onPress={() => void load()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing[3],
    justifyContent: "space-between",
  },
  headerCopy: {
    alignItems: "flex-end",
    flex: 1,
  },
  createRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  list: {
    gap: spacing[3],
  },
  card: {
    backgroundColor: colorRoles.surfaceBase,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[4],
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  flexButton: {
    flex: 1,
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  statusText: {
    color: colorRoles.brandAction,
    fontWeight: "700",
  },
  secondaryText: {
    color: colorRoles.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  amountText: {
    color: colorRoles.textPrimary,
    fontWeight: "700",
    textAlign: "right",
  },
  errorText: {
    color: colorRoles.danger,
    textAlign: "right",
  },
  successText: {
    color: colorRoles.success,
    textAlign: "right",
  },
});
