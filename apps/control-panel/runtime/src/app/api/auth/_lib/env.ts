// Compatibility boundary. Runtime environment access lives in the governed
// server configuration layer so browser-facing modules never read process.env.
export * from "./server-config";
