import { useCallback } from "react";
import { issueFieldActivationCode } from "./field-activation.api";

export function useFieldActivationIssuer() {
  return useCallback((phone: string) => issueFieldActivationCode(phone), []);
}
