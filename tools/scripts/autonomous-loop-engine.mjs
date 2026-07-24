import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("==========================================");
console.log("🧠 BThwani Autonomous Deep Loop Engine 🧠");
console.log("==========================================\n");

let loops = 0;
const MAX_LOOPS = 5;
let success = false;

// 1. AST/Regex Fixer Logic
function fixOpenApiTags() {
  console.log("[Auto-Fix] Running AST surgical injector for OpenAPI operation-tags...");
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
    
    const lines = content.replace(/\r/g, '').split("\n");
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
  console.log(`[Auto-Fix] Recovered and injected ${totalFixed} tags!`);
}

// 2. The Loop
while (!success && loops < MAX_LOOPS) {
  loops++;
  console.log(`\n▶️ Starting Deep Diagnostic Loop #${loops}...`);
  try {
    // Phase 1: Linting / Formatting
    console.log("[Diagnostic] Running Prettier write...");
    execSync("pnpm exec prettier --write \"**/*.{ts,js,json,md,yaml}\" --ignore-path .prettierignore", { stdio: "ignore" });
    
    // Phase 2: Deep Contract Compliance
    console.log("[Diagnostic] Verifying OpenAPI Contracts...");
    execSync("pnpm run contracts:spectral", { stdio: "pipe" });
    
    console.log(`\n✅ Loop #${loops} successful! 0 errors detected. 100% Accuracy reached.`);
    success = true;
  } catch (error) {
    console.log(`❌ Loop #${loops} detected failures.`);
    const stdout = error.stdout ? error.stdout.toString() : "";
    const stderr = error.stderr ? error.stderr.toString() : "";
    const output = stdout + stderr;
    
    // Parse deep diagnostics
    if (output.includes("operation-tags")) {
       console.log("[Analysis] Deep Diagnostic flagged missing OpenAPI tags.");
       fixOpenApiTags();
    } else {
       console.log("[Analysis] Unknown error. Dumping partial log for next manual review:");
       console.log(output.substring(0, 500));
       // In a real advanced agent, we would pipe this to an LLM endpoint, 
       // but for this core static engine, we abort if we don't have a regex rule.
       console.log("⚠️ Cannot auto-fix this specific error. Aborting loop.");
       break;
    }
  }
}

if (!success) {
  console.error("❌ Autonomous Deep Loop Engine failed to achieve 100% accuracy within limit.");
  process.exit(1);
} else {
  console.log("🎉 Autonomous Deep Loop Engine completed all layers successfully.");
}
