// Compatibility boundary. Runtime environment access lives in the governed
// server configuration layer so browser-facing modules never read environment variables directly.
export * from "./server-config";
