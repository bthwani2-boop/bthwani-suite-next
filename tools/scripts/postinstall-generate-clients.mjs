#!/usr/bin/env node

// Compatibility entry point for the root postinstall lifecycle.
// The canonical materializer owns freshness detection, deterministic OpenAPI
// composition, client generation, and the local artifact stamp used by Nx.
await import("./materialize-openapi-artifacts.mjs");
