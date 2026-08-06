"use client";

import { Suspense } from "react";
import { OperationsHubScreen } from "@bthwani/dsh/control-panel/operations";

export default function DshOperationsPage() {
  return (
    <Suspense fallback={<div>جاري التحميل...</div>}>
      <OperationsHubScreen />
    </Suspense>
  );
}
