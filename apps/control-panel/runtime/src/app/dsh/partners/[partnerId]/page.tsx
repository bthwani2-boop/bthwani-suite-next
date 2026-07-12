"use client";

import { PartnerDetailScreen } from "@dsh-cp/partners";
import { useRouter, useParams } from "next/navigation";

export default function DshPartnerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = typeof params["partnerId"] === "string" ? params["partnerId"] : "";

  return (
    <PartnerDetailScreen
      partnerId={partnerId}
      onBack={() => router.push("/dsh/partners")}
    />
  );
}
