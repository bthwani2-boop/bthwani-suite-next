import { corrId } from "../_kernel/dsh-http-request";

export function generateSpecialRequestIdempotencyKey(): string {
  return corrId("sr");
}
