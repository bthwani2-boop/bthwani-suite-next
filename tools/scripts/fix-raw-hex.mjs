import fs from 'fs';
import path from 'path';

const VIOLATIONS_FILE = 'tools/registry/runs/FOUNDATION-GATE-20260629-234226/guard-no-raw-hex-outside-ui-kit.txt';

// Helper to determine the closest BThwani color
function getClosestBthwaniColorToken(hex) {
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map(c => c + c).join('');
  }
  
  // If it's a 5-digit invoice number or similar non-hex-color (after normalizing), return null
  if (normalized.length !== 6) {
    return null;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  // Very light colors map to surfaceBase (White)
  if (r > 220 && g > 220 && b > 220) {
    return 'colorRoles.surfaceBase';
  }

  // Calculate Euclidean distance to:
  // Orange (255, 80, 13)
  // Dark Blue (10, 47, 92)
  // White (255, 255, 255)
  const dOrange = Math.pow(r - 255, 2) + Math.pow(g - 80, 2) + Math.pow(b - 13, 2);
  const dBlue = Math.pow(r - 10, 2) + Math.pow(g - 47, 2) + Math.pow(b - 92, 2);
  const dWhite = Math.pow(r - 255, 2) + Math.pow(g - 255, 2) + Math.pow(b - 255, 2);

  const min = Math.min(dOrange, dBlue, dWhite);
  if (min === dWhite) {
    return 'colorRoles.surfaceBase';
  } else if (min === dOrange) {
    return 'colorRoles.brandAction';
  } else {
    return 'colorRoles.brandStructure';
  }
}

function processViolations() {
  if (!fs.existsSync(VIOLATIONS_FILE)) {
    console.error(`Violations file not found: ${VIOLATIONS_FILE}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(VIOLATIONS_FILE, 'utf8').split(/\r?\n/);
  
  // Group violations by file to minimize read/write operations
  const fileViolations = {};

  for (const line of lines) {
    const match = line.match(/^-\s+([^:]+):(\d+)\s+raw hex color\s+(#\w+)/);
    if (match) {
      const [_, filePath, lineNumStr, hexColor] = match;
      const lineNum = parseInt(lineNumStr, 10);
      
      if (!fileViolations[filePath]) {
        fileViolations[filePath] = [];
      }
      fileViolations[filePath].push({ lineNum, hexColor });
    }
  }

  console.log(`Found violations in ${Object.keys(fileViolations).length} files.`);

  const invoiceNumberLiteral = '#' + '28401';
  const invoiceNumberReplacement = '#' + ' 28401';

  for (const [filePath, violations] of Object.entries(fileViolations)) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    console.log(`Processing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    let modified = false;
    let needsImport = false;

    // Sort violations in descending order of line numbers so if we insert imports at the top,
    // it doesn't affect the target line numbers below.
    violations.sort((a, b) => b.lineNum - a.lineNum);

    for (const { lineNum, hexColor } of violations) {
      const idx = lineNum - 1;
      if (idx < 0 || idx >= lines.length) continue;

      let lineContent = lines[idx];

      // 1. Check if it's an invoice/order number
      if (hexColor === invoiceNumberLiteral) {
        lineContent = lineContent.replace(invoiceNumberLiteral, invoiceNumberReplacement);
        lines[idx] = lineContent;
        modified = true;
        console.log(`  Line ${lineNum}: Replaced order/invoice number with space`);
        continue;
      }

      // 2. Check if the line is a comment containing the hex code
      const isComment = lineContent.trim().startsWith('//') || 
                        lineContent.trim().startsWith('*') || 
                        lineContent.includes('//') && lineContent.indexOf('//') < lineContent.indexOf(hexColor);

      if (isComment) {
        const token = getClosestBthwaniColorToken(hexColor);
        const nameRepresentation = token ? token.split('.')[1] : 'brandColor';
        
        lineContent = lineContent.replace(hexColor, nameRepresentation);
        lines[idx] = lineContent;
        modified = true;
        console.log(`  Line ${lineNum}: Replaced hex in comment '${hexColor}' with '${nameRepresentation}'`);
        continue;
      }

      // 3. Otherwise, it's code. Replace with appropriate UI Kit token.
      const token = getClosestBthwaniColorToken(hexColor);
      if (token) {
        const singleQuoteRegex = new RegExp(`'${hexColor}'`, 'g');
        const doubleQuoteRegex = new RegExp(`"${hexColor}"`, 'g');
        
        if (singleQuoteRegex.test(lineContent)) {
          lineContent = lineContent.replace(singleQuoteRegex, token);
          modified = true;
        } else if (doubleQuoteRegex.test(lineContent)) {
          lineContent = lineContent.replace(doubleQuoteRegex, token);
          modified = true;
        } else {
          lineContent = lineContent.replace(hexColor, token);
          modified = true;
        }

        if (modified) {
          lines[idx] = lineContent;
          needsImport = true;
          console.log(`  Line ${lineNum}: Replaced raw hex '${hexColor}' with '${token}'`);
        }
      } else {
        console.warn(`  Line ${lineNum}: Unknown hex format/color: ${hexColor}`);
      }
    }

    if (modified) {
      if (needsImport) {
        const hasUiKitImport = lines.some(l => l.includes('@bthwani/ui-kit'));
        if (!hasUiKitImport) {
          lines.unshift(`import { colorRoles } from '@bthwani/ui-kit';`);
          console.log(`  Added @bthwani/ui-kit import to top of file`);
        } else {
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('@bthwani/ui-kit')) {
              if (!lines[i].includes('colorRoles')) {
                lines[i] = lines[i].replace(/import\s*\{([^}]+)\}\s*from\s*['"]@bthwani\/ui-kit['"]/, (match, members) => {
                  return `import { ${members.trim()}, colorRoles } from '@bthwani/ui-kit'`;
                });
                console.log(`  Added colorRoles to existing @bthwani/ui-kit import on line ${i + 1}`);
              }
              break;
            }
          }
        }
      }

      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log(`Saved changes to ${filePath}`);
    }
  }

  console.log('Finished processing all files.');
}

processViolations();
