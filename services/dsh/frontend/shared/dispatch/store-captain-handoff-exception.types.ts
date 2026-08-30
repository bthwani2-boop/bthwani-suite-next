import type { DshStoreCaptainHandoffExceptionReason } from "../orders/orders.types.ts";

export type StoreCaptainHandoffExceptionActor = "partner" | "captain";

export type StoreCaptainHandoffExceptionAttemptIntent = {
  readonly actor: StoreCaptainHandoffExceptionActor;
  readonly actorId: string;
  readonly entityId: string;
  readonly reasonCode: DshStoreCaptainHandoffExceptionReason;
  readonly note: string;
};
