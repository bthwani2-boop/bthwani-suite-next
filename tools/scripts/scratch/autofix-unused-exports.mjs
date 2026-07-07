import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
const knipReportPath = path.join(repoRoot, '.diagnostics/operational-journey-factory/tool-evidence/knip-report.json');

if (!fs.existsSync(knipReportPath)) {
  console.error("Knip report not found at:", knipReportPath);
  process.exit(1);
}

const knipData = JSON.parse(fs.readFileSync(knipReportPath, 'utf8'));
const issues = knipData.issues || [];

console.log(`Processing ${issues.length} files with Knip issues...`);

let fixedCount = 0;

for (const issue of issues) {
  const filePath = path.isAbsolute(issue.file) ? issue.file : path.join(repoRoot, issue.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File does not exist: ${filePath}`);
    continue;
  }

  // We only target frontend/shared/apps code in our workspace
  const isPrimary = (p) => {
    const np = p.replace(/\\/g, '/');
    return (np.includes("services/") || np.includes("apps/") || np.includes("shared/")) 
          && !np.includes("node_modules") 
          && !np.includes("generated")
          && !np.includes(".test.")
          && !np.includes(".spec.");
  };

  if (!isPrimary(filePath)) {
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Unused exports/types list
  const unusedNames = [
    ...(issue.exports || []).map(x => x.name),
    ...(issue.types || []).map(x => x.name)
  ];

  if (unusedNames.length === 0) continue;

  console.log(`File: ${issue.file} (${unusedNames.length} unused exports)`);

  for (const name of unusedNames) {
    if (name === 'default') {
      // Handle export default component at the end of the file: e.g., "export default ComponentName;"
      const defaultExportRegex = new RegExp(`^export\\s+default\\s+(\\w+);?\\s*$`, 'm');
      if (defaultExportRegex.test(content)) {
        content = content.replace(defaultExportRegex, `// export default $1; // Unused default export`);
        console.log(`  - Removed default export reference for component`);
        continue;
      }

      // Handle export default inline: e.g., "export default function ComponentName" -> "function ComponentName"
      const defaultFuncRegex = new RegExp(`\\bexport\\s+default\\s+(function|class|async\\s+function)\\b`, 'g');
      if (defaultFuncRegex.test(content)) {
        content = content.replace(defaultFuncRegex, '$1');
        console.log(`  - Converted inline default export to standard declaration`);
        continue;
      }
      continue;
    }

    // Replace: export const name, export function name, export class name, etc.
    const inlineExportRegex = new RegExp(`\\bexport\\s+(const|let|var|function|async\\s+function|class|type|interface|enum)\\s+${name}\\b`, 'g');
    if (inlineExportRegex.test(content)) {
      content = content.replace(inlineExportRegex, `$1 ${name}`);
      console.log(`  - Removed export keyword from inline declaration of: ${name}`);
      continue;
    }

    // Handle named export blocks: e.g., "export { name1, name2 };"
    // We can look for the name inside an export block and remove it or comment it out if it is the only one.
    const namedExportSingleRegex = new RegExp(`\\bexport\\s+\\{\\s*${name}\\s*\\};?`, 'g');
    if (namedExportSingleRegex.test(content)) {
      content = content.replace(namedExportSingleRegex, `/* export { ${name} }; */`);
      console.log(`  - Commented out single named export block for: ${name}`);
      continue;
    }

    // If it's part of a multi-export block, e.g., "export { a, name, b }"
    // This is more complex, let's use a simpler heuristic: find "export { ... }" and remove the name from it.
    const exportBlockRegex = /export\s+\{([^}]+)\};?/g;
    let match;
    let replacedBlock = false;
    while ((match = exportBlockRegex.exec(content)) !== null) {
      const blockContent = match[1];
      const items = blockContent.split(',').map(x => x.trim());
      if (items.includes(name)) {
        const filteredItems = items.filter(x => x !== name && x !== `${name} as default`);
        if (filteredItems.length === 0) {
          content = content.replace(match[0], `/* export { ${blockContent} }; */`);
        } else {
          content = content.replace(match[0], `export { ${filteredItems.join(', ')} };`);
        }
        console.log(`  - Removed ${name} from named export block`);
        replacedBlock = true;
        break;
      }
    }

    if (replacedBlock) continue;

    console.warn(`  - Could not find export declaration for: ${name}`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
  }
}

console.log(`Done. Fixed ${fixedCount} files.`);
