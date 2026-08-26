// Local developer documentation viewer. Serves the six materialized contract
// bundles that the provenance gate already pins byte-for-byte; no bundling,
// no network tool invocation, and no generated files inside contracts/.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

const specs = [
  { bundle: 'core/identity/contracts/generated/identity.bundle.openapi.yaml', name: 'Core - Identity API' },
  { bundle: 'core/workforce/contracts/generated/workforce.bundle.openapi.yaml', name: 'Core - Workforce API' },
  { bundle: 'core/platform-control/contracts/generated/platform-control.bundle.openapi.yaml', name: 'Core - Platform Control API' },
  { bundle: 'core/providers/contracts/generated/providers.bundle.openapi.yaml', name: 'Core - Providers API' },
  { bundle: 'services/dsh/contracts/generated/dsh.bundle.openapi.yaml', name: 'Services - DSH API' },
  { bundle: 'services/wlt/contracts/generated/wlt.bundle.openapi.yaml', name: 'Services - WLT API' }
];

for (const spec of specs) {
  if (!fs.existsSync(path.join(rootDir, spec.bundle))) {
    console.error(`Missing materialized bundle: ${spec.bundle}. Run "pnpm exec nx run contracts:materialize" first.`);
    process.exit(1);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderIndex());
    return;
  }

  const matchedSpec = specs.find((s) => req.url === `/${path.basename(s.bundle)}`);
  if (matchedSpec) {
    fs.readFile(path.join(rootDir, matchedSpec.bundle), (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/yaml' });
        res.end(content);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Swagger UI serving materialized bundles at http://localhost:${PORT}`);
});

function renderIndex() {
  const urlsList = specs
    .map((s) => `{ url: "./${path.basename(s.bundle)}", name: "${s.name}" }`)
    .join(',\n          ');
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
