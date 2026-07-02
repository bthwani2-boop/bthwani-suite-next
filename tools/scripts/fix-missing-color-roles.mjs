import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');

function walk(dir, filter, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next' && file !== 'dist' && file !== '.diagnostics') {
        walk(filePath, filter, callback);
      }
    } else if (stat.isFile() && filter(file)) {
      callback(filePath);
    }
  }
}

const tsFileFilter = (filename) => filename.endsWith('.ts') || filename.endsWith('.tsx');

walk(workspaceRoot, tsFileFilter, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('colorRoles')) {
    return;
  }

  // Check if it already imports colorRoles
  // We match imports of colorRoles from either ui-kit or relative paths
  const importRegex = /import\s+{[^}]*colorRoles[^}]*}\s+from\s+['"][^'"]+['"]/s;
  if (importRegex.test(content)) {
    return;
  }

  // File uses colorRoles but doesn't import it.
  // Check if it imports from @bthwani/ui-kit
  const uikitImportRegex = /(import\s+{([^}]+)}\s+from\s+['"]@bthwani\/ui-kit['"];?)/g;
  if (uikitImportRegex.test(content)) {
    content = content.replace(uikitImportRegex, (match, fullImport, importsText) => {
      // Add colorRoles to the imports
      const trimmedImports = importsText.trim();
      const separator = trimmedImports.endsWith(',') ? '' : ',';
      const newImports = trimmedImports + separator + '\n  colorRoles,';
      // format nicely
      const replacement = `import {\n  ${newImports.split(',').map(s => s.trim()).filter(Boolean).join(',\n  ')},\n} from '@bthwani/ui-kit';`;
      return replacement;
    });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[FIXED] Added colorRoles import to: ${path.relative(workspaceRoot, filePath)}`);
  } else {
    // If it uses colorRoles but doesn't import @bthwani/ui-kit at all
    // Let's check if it is in shared/ui-kit where it should import from relative path
    if (filePath.includes('shared' + path.sep + 'ui-kit')) {
      // Find relative path to tokens/colors
      const relativeToTokens = path.relative(path.dirname(filePath), path.resolve(workspaceRoot, 'shared/ui-kit/src/tokens/colors'));
      const relativeImportPath = relativeToTokens.startsWith('.') ? relativeToTokens.replace(/\\/g, '/') : './' + relativeToTokens.replace(/\\/g, '/');
      
      // Let's prepend or find first import to insert it
      const firstImportIndex = content.indexOf('import ');
      if (firstImportIndex !== -1) {
        const newImport = `import { colorRoles } from "${relativeImportPath}";\n`;
        content = content.slice(0, firstImportIndex) + newImport + content.slice(firstImportIndex);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[FIXED UI-KIT] Added relative colorRoles import to: ${path.relative(workspaceRoot, filePath)}`);
      }
    } else {
      console.log(`[WARN] File uses colorRoles but has no @bthwani/ui-kit import: ${path.relative(workspaceRoot, filePath)}`);
    }
  }
});
