import { notFound } from "next/navigation";
import {
  Jrn033VisualEvidenceScreen,
  type Jrn033VisualEvidenceMode,
} from "@dsh-cp/finance/Jrn033VisualEvidenceScreen";
import { publicRuntimeFlags } from "../../../../config/public-runtime-flags";

const supportedModes = new Set<Jrn033VisualEvidenceMode>(["success", "empty", "frozen", "error", "loading"]);

type Props = {
  readonly searchParams: Promise<{ readonly mode?: string }>;
};

export default async function Jrn033VisualEvidencePage({ searchParams }: Props) {
  if (!publicRuntimeFlags.jrn033VisualEvidenceEnabled) notFound();
  const params = await searchParams;
  const requestedMode = params.mode ?? "success";
  const mode = supportedModes.has(requestedMode as Jrn033VisualEvidenceMode)
    ? requestedMode as Jrn033VisualEvidenceMode
    : "success";
  return <Jrn033VisualEvidenceScreen mode={mode} />;
}
