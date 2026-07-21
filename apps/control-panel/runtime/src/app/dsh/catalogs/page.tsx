"use client";

import Link from "next/link";
import { CatalogDashboardScreen } from "@dsh-cp/catalogs/CatalogDashboardScreen";

export default function DshCatalogsPage() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.75rem 1rem" }}>
        <Link
          href="/dsh/catalogs/governance"
          style={{
            padding: "0.55rem 0.9rem",
            border: "1px solid currentColor",
            borderRadius: "0.5rem",
            fontWeight: 700,
          }}
        >
          غرفة الخصائص والبدائل والتدقيق
        </Link>
      </div>
      <CatalogDashboardScreen />
    </>
  );
}
