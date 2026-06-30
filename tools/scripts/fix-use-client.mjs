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
  
  // check if "use client" is present in the file
  const useClientRegex = /^(?:[^\n]*\n)*?\s*['"]use client['"];?\s*\n/i;
  
  // If it's present but NOT on the first line (excluding comments or empty lines maybe?
  // Next.js requires it to be before any import or executable code. Comments are allowed before it, but imports are not.
  // So if there's any import before "use client", we must move "use client" to the very top.
  const hasImportBeforeUseClient = /import\s+[^]+?['"]use client['"]/i.test(content);
  
  if (hasImportBeforeUseClient) {
    // Find and remove "use client" directive
    const cleanedContent = content.replace(/['"]use client['"];?\s*\n?/g, '');
    // Prepend it to the very top
    const newContent = `"use client";\n` + cleanedContent;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`[FIXED "use client"] Moved "use client" to top of: ${path.relative(workspaceRoot, filePath)}`);
  }
});
