import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');
const outputDir = path.resolve(rootDir, 'dist-swagger');

const specs = [
  { input: 'contracts/master.openapi.yaml', output: 'master.bundled.json', name: 'Master API Index' },
  { input: 'core/identity/contracts/auth.openapi.yaml', output: 'identity.bundled.json', name: 'Core - Identity API' },
  { input: 'core/providers/contracts/providers.openapi.yaml', output: 'providers.bundled.json', name: 'Core - Providers API' },
  { input: 'services/dsh/contracts/dsh.openapi.yaml', output: 'dsh.bundled.json', name: 'Services - Dsh API' },
  { input: 'services/wlt/contracts/wlt.openapi.yaml', output: 'wlt.bundled.json', name: 'Services - Wlt API' }
];

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Bundling all OpenAPI specifications to dist-swagger...');
for (const spec of specs) {
  const inputPath = path.resolve(rootDir, spec.input);
  const outputPath = path.resolve(outputDir, spec.output);
  console.log(`Bundling ${spec.name} to ${outputPath}...`);
  try {
    execSync(`pnpm dlx @apidevtools/swagger-cli bundle "${inputPath}" --outfile "${outputPath}" --type json`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(`Failed to bundle ${spec.name}:`, error.message);
    process.exit(1);
  }
}
console.log('All bundles completed successfully.');

// Write index.html to output directory
const htmlContent = getHtmlContent();
fs.writeFileSync(path.resolve(outputDir, 'index.html'), htmlContent, 'utf8');
console.log('index.html written successfully.');

function getHtmlContent() {
  const urlsList = specs.map(s => `{ url: "./${s.output}", name: "${s.name}" }`).join(',\n          ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BThwani API Documentation (Swagger UI)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -y-scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        urls: [
          ${urlsList}
        ],
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
}
