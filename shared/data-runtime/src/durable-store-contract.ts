/**
 * Correctness-critical durable storage contract.
 *
 * The implementation owner may be native secure storage or encrypted browser
 * storage. Every successful mutation proves the platform accepted the write;
 * failures must remain visible to callers so they can fail closed.
 */
export type BthwaniDurableStore = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
  readonly multiRemove: (keys: readonly string[]) => Promise<void>;
};
