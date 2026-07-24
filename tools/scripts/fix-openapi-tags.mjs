import fs from "fs";
import path from "path";

function findFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "node_modules" || file === ".git" || file === "dist") continue;
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      findFiles(full, files);
    } else if (file.endsWith(".openapi.yaml")) {
      files.push(full);
    }
  }
  return files;
}

const files = findFiles(".");
let totalFixed = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes("paths:")) continue;
  
  const lines = content.split("\n");
  const output = [];
  
  let inPaths = false;
  let pathsIndent = -1;
  let currentPath = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matchIndent = line.match(/^(\s*)/);
    const indent = matchIndent ? matchIndent[1].length : 0;
    const trimmed = line.trim();
    
    output.push(line);
    
    if (trimmed === "paths:") {
      inPaths = true;
      pathsIndent = indent;
      continue;
    }
    
    if (inPaths && trimmed !== "" && !trimmed.startsWith("#")) {
      if (indent <= pathsIndent) {
        inPaths = false;
      }
    }
    
    if (inPaths) {
      if (trimmed.startsWith("/") || trimmed.startsWith('"/') || trimmed.startsWith("'/")) {
         const pathMatch = trimmed.match(/^['"]?(\/[^:'"]+)/);
         if (pathMatch) currentPath = pathMatch[1];
      }
      
      const isOp = trimmed.startsWith("get:") || trimmed.startsWith("post:") || trimmed.startsWith("put:") || trimmed.startsWith("patch:") || trimmed.startsWith("delete:");
      if (isOp && currentPath) {
         let hasTags = false;
         for(let j = i + 1; j < lines.length; j++) {
            const nl = lines[j];
            if (nl.trim() === "" || nl.trim().startsWith("#")) continue;
            const ni = nl.match(/^(\s*)/)[1].length;
            if (ni <= indent) break;
            if (nl.trim().startsWith("tags:")) {
               hasTags = true;
               break;
            }
         }
         
         if (!hasTags) {
            let tagName = "General";
            const segments = currentPath.split("/").filter(Boolean);
            if (segments.length >= 2) {
               tagName = segments[0] + "-" + segments[1].replace(/[{}]/g, '');
            } else if (segments.length === 1) {
               tagName = segments[0];
            }
            output.push(" ".repeat(indent + 2) + 'tags: ["' + tagName + '"]');
            totalFixed++;
         }
      }
    }
  }
  
  fs.writeFileSync(file, output.join("\n"), "utf8");
}

console.log("Fixed " + totalFixed + " operations.");
