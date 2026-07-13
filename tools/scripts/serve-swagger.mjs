import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');
const contractsDir = path.resolve(rootDir, 'contracts');

const specs = [
  { input: 'contracts/master.openapi.yaml', output: 'contracts/master.bundled.json', name: 'Master API Index' },
  { input: 'core/identity/contracts/auth.openapi.yaml', output: 'contracts/identity.bundled.json', name: 'Core - Identity API' },
  { input: 'core/providers/contracts/providers.openapi.yaml', output: 'contracts/providers.bundled.json', name: 'Core - Providers API' },
  { input: 'core/workforce/contracts/workforce.openapi.yaml', output: 'contracts/workforce.bundled.json', name: 'Core - Workforce API' },
  { input: 'services/dsh/contracts/dsh.openapi.yaml', output: 'contracts/dsh.bundled.json', name: 'Services - Dsh API' },
  { input: 'services/wlt/contracts/wlt.openapi.yaml', output: 'contracts/wlt.bundled.json', name: 'Services - Wlt API' }
];

// 1. Bundle all OpenAPI specifications
console.log('Bundling all OpenAPI specifications...');
for (const spec of specs) {
  console.log(`Bundling ${spec.name}...`);
  try {
    execSync(`pnpm dlx @apidevtools/swagger-cli bundle ${spec.input} --outfile ${spec.output} --type json`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(`Failed to bundle ${spec.name}:`, error.message);
    process.exit(1);
  }
}
console.log('All bundles completed successfully.');

// 2. Start HTTP server
const PORT = 8080;
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getHtmlContent());
    return;
  }

  // Serve bundled files
  const matchedSpec = specs.find(s => req.url === `/${path.basename(s.output)}`);
  if (matchedSpec) {
    const filePath = path.join(rootDir, matchedSpec.output);
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(content);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n==================================================`);
  console.log(`Swagger UI is running at: ${url}`);
  console.log(`==================================================\n`);
  
  // 3. Open browser
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${startCmd} ${url}`);
});

function getHtmlContent() {
  const urlsList = specs.map(s => `{ url: "./${path.basename(s.output)}", name: "${s.name}" }`).join(',\n          ');
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
