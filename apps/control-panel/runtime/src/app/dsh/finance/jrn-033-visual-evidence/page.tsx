import { notFound } from "next/navigation";
import {
  Jrn033VisualEvidenceScreen,
  type Jrn033VisualEvidenceMode,
} from "@dsh-cp/finance/Jrn033VisualEvidenceScreen";

const supportedModes = new Set<Jrn033VisualEvidenceMode>(["success", "empty", "frozen", "error", "loading"]);

type Props = {
  readonly searchParams: Promise<{ readonly mode?: string }>;
};

export default async function Jrn033VisualEvidencePage({ searchParams }: Props) {
  if (process.env.NEXT_PUBLIC_JRN_033_VISUAL_EVIDENCE !== "1") notFound();
  const params = await searchParams;
  const requestedMode = params.mode ?? "success";
  const mode = supportedModes.has(requestedMode as Jrn033VisualEvidenceMode)
    ? requestedMode as Jrn033VisualEvidenceMode
    : "success";
  return <Jrn033VisualEvidenceScreen mode={mode} />;
}
