"use client";

import { Suspense } from "react";
import { OperationsHubScreen } from "@dsh-cp/operations/OperationsHubScreen";

export default function DshOperationsPage() {
  return (
    <Suspense fallback={<div>جاري التحميل...</div>}>
      <OperationsHubScreen />
    </Suspense>
  );
}
