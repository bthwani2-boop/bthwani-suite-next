"use client";

import { AdministrationScreen } from "@dsh-cp/administration";
import { DshPage } from "../../../shell";

export default function AdministrationPage() {
  return (
    <DshPage activeSection="administration" sectionLabel="الإدارة والصلاحيات">
      <AdministrationScreen />
    </DshPage>
  );
}
