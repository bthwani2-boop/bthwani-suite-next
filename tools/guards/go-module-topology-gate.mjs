import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const failures = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const trackedGoMods = execFileSync("git", ["ls-files", "**/go.mod", "go.mod"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((relative) => fs.existsSync(path.join(root, relative)));
const workspace = read("go.work");
const workspaceModules = new Set(
  [...workspace.matchAll(/^\s+\.\/(.+)\s*$/gm)].map((match) => match[1].replaceAll("\\", "/")),
);
for (const moduleDir of workspaceModules) {
  const goMod = path.posix.join(moduleDir, "go.mod");
  if (fs.existsSync(path.join(root, goMod)) && !trackedGoMods.includes(goMod)) {
    trackedGoMods.push(goMod);
  }
}

for (const goMod of trackedGoMods) {
  const moduleDir = path.posix.dirname(goMod);
  if (!workspaceModules.has(moduleDir)) {
    failures.push(`${goMod}: module is not registered in go.work`);
  }

  const source = read(goMod);
  for (const match of source.matchAll(/^\s*replace\s+\S+\s+=>\s+(\.\.\/[^\s]+)\s*$/gm)) {
    const target = path.resolve(root, moduleDir, match[1]);
    if (!fs.existsSync(target)) {
      failures.push(`${goMod}: local replace target is missing: ${match[1]}`);
    }
  }
}

for (const trackedPath of execFileSync("git", ["ls-files", "shared/go/**"], {
  cwd: root,
  encoding: "utf8",
}).trim().split(/\r?\n/).filter(Boolean)) {
  if (!fs.existsSync(path.join(root, trackedPath))) continue;
  failures.push(`${trackedPath}: language-first shared/go topology is forbidden`);
}

for (const goMod of trackedGoMods) {
  const moduleDir = path.posix.dirname(goMod);
  const dockerfile = path.posix.join(moduleDir, "Dockerfile");
  if (!fs.existsSync(path.join(root, dockerfile))) continue;

  const source = read(goMod);
  const dockerSource = read(dockerfile);
  const downloadIndex = dockerSource.indexOf("RUN go mod download");
  if (downloadIndex < 0) continue;

  for (const match of source.matchAll(/^\s*replace\s+\S+\s+=>\s+(\.\.\/[^\s]+)\s*$/gm)) {
    const target = path.resolve(root, moduleDir, match[1]);
    if (!fs.existsSync(target)) continue;
    const relativeTarget = path.relative(root, target).replaceAll("\\", "/");
    const requiredCopy = `COPY ${relativeTarget}/`;
    const copyIndex = dockerSource.indexOf(requiredCopy);
    if (copyIndex < 0 || copyIndex > downloadIndex) {
      failures.push(`${dockerfile}: local replacement ${relativeTarget} must be copied before RUN go mod download`);
    }
  }
}

if (failures.length > 0) {
  console.error("go-module-topology-gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`go-module-topology-gate: PASS modules=${trackedGoMods.length}`);
