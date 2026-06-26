"use client";

import { PartnersReviewQueueScreen } from "@dsh-cp/partners/PartnersReviewQueueScreen";
import { DshPage } from "../../../shell";

export default function DshPartnersPage() {
  return (
    <DshPage activeSection="partners" sectionLabel="الشركاء والمتاجر">
      <PartnersReviewQueueScreen />
    </DshPage>
  );
}
