"use client";

import { Suspense } from "react";
import { PartnersReviewQueueScreen } from "@dsh-cp/partners";
import { useRouter } from "next/navigation";

export default function DshPartnersPage() {
  const router = useRouter();

  return (
    <Suspense fallback={<div>جاري تحميل الشركاء...</div>}>
      <PartnersReviewQueueScreen
        onOpenPartner={(partnerId) => router.push(`/dsh/partners/${partnerId}`)}
      />
    </Suspense>
  );
}
