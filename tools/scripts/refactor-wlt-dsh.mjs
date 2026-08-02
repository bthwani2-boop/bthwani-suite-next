import fs from 'fs/promises';
import path from 'path';

async function walkDir(dir, pattern, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      await walkDir(filePath, pattern, fileList);
    } else if (filePath.endsWith(pattern)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function replaceInFiles(dir, ext, replacements) {
  const files = await walkDir(dir, ext);
  for (const file of files) {
    let content = await fs.readFile(file, 'utf8');
    let modified = false;
    for (const [search, replace] of replacements) {
      if (typeof search === 'string') {
        if (content.includes(search)) {
          content = content.replaceAll(search, replace);
          modified = true;
        }
      } else {
        if (search.test(content)) {
          content = content.replace(search, replace);
          modified = true;
        }
      }
    }
    if (modified) {
      await fs.writeFile(file, content, 'utf8');
      console.log(`Updated: ${file}`);
    }
  }
}

async function main() {
  const replacements = [
    ['wltFetchJson', 'dshFetchJson'],
    ['wltPostJson', 'dshPostJson'],
    ['getWltApiBaseUrl', 'resolveDshApiBaseUrl'],
    ['resolveWltApiBaseUrl', 'resolveDshApiBaseUrl'],
    ['WLT_API_BASE_URL', 'DSH_API_BASE_URL'],
    ['wlt-http/wlt-api-base-url', 'dsh-http/dsh-api-base-url'],
    ['wlt-http/wlt-http-request', 'dsh-http/dsh-http-request'],
    ['WltReferenceApiResult', 'DshReferenceApiResult']
  ];

  await replaceInFiles('services/wlt/frontend/shared/dsh', '.ts', replacements);
  await replaceInFiles('services/wlt/frontend/shared/dsh', '.tsx', replacements);
  await replaceInFiles('apps', '.ts', replacements);
  await replaceInFiles('apps', '.tsx', replacements);
}

main().catch(console.error);
