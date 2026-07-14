import { useState, useEffect } from "react";
import type { CatalogSubmission, CatalogSubmissionState } from "./catalog.types";

const INITIAL_MOCK_SUBMISSIONS: CatalogSubmission[] = [
  {
    id: "sub-1",
    storeId: "store-albaraka",
    revision: 3,
    status: "submitted",
    submittedBy: "user-partner-1",
    reviewReason: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sub-2",
    storeId: "store-yemen-mall",
    revision: 1,
    status: "submitted",
    submittedBy: "user-partner-2",
    reviewReason: "",
    createdAt: new Date().toISOString(),
  },
];

export function useCatalogApprovalController(authSession: string) {
  const [submissions, setSubmissions] = useState<CatalogSubmission[]>([]);
  const [kind, setKind] = useState<CatalogSubmissionState["kind"]>("loading");
  const [action, setAction] = useState<"idle" | "submitting">("idle");

  useEffect(() => {
    const stored = localStorage.getItem("bthwani-catalog-submissions");
    if (stored) {
      setSubmissions(JSON.parse(stored));
    } else {
      localStorage.setItem("bthwani-catalog-submissions", JSON.stringify(INITIAL_MOCK_SUBMISSIONS));
      setSubmissions(INITIAL_MOCK_SUBMISSIONS);
    }
    setKind("success");
  }, []);

  const save = (updated: CatalogSubmission[]) => {
    localStorage.setItem("bthwani-catalog-submissions", JSON.stringify(updated));
    setSubmissions(updated);
  };

  const decide = async (input: { storeId: string; decision: "approved" | "rejected"; reason: string }) => {
    setAction("submitting");
    const updated = submissions.map((s) =>
      s.storeId === input.storeId ? { ...s, status: input.decision, reviewReason: input.reason } : s
    );
    save(updated);
    setAction("idle");
  };

  const activeSubmissions = submissions.filter((s) => s.status === "submitted");

  const state: CatalogSubmissionState =
    kind === "loading"
      ? { kind: "loading" }
      : activeSubmissions.length === 0
      ? { kind: "empty" }
      : { kind: "success", submissions: activeSubmissions };

  return {
    state: state as CatalogSubmissionState,
    action,
    decide,
  };
}
