// Canonical compatibility entrypoint for the Docker runtime bootstrap phase.
// The governed implementation lives with the mobile runtime because it verifies
// all four mobile surfaces against Identity, Workforce and DSH together.
if (!process.argv.includes('--repair')) {
  process.argv.push('--repair');
}

await import('../../apps/mobile/mobile-dev-data.mjs');
