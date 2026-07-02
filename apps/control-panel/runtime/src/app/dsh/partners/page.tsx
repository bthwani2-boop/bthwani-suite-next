"use client";

import { Suspense } from "react";
import { PartnersReviewQueueScreen } from "@dsh-cp/partners";
import {
  ControlPanelShell,
  ControlPanelNavigation,
  ControlPanelTopBar,
  useDshNavigation,
} from "../../../shell";
import { useRouter } from "next/navigation";

export default function DshPartnersPage() {
  const router = useRouter();
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم</strong>}
          serviceLabel={<span>الشركاء والمتاجر</span>}
        />
      }
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection="partners"
          onSectionPress={handleSectionPress}
        />
      }
      main={
        <Suspense fallback={<div>جاري تحميل الشركاء...</div>}>
          <PartnersReviewQueueScreen
            onOpenPartner={(partnerId) => router.push(`/dsh/partners/${partnerId}`)}
          />
        </Suspense>
      }
    />
  );
}

