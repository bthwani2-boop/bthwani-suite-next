import { spawnSync } from "node:child_process";
import process from "node:process";

const passthrough = [];
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === "--") {
    continue;
  }
  if (arg === "--affected") {
    passthrough.push("-Affected");
    continue;
  }
  if (arg.startsWith("--stage=")) {
    passthrough.push("-Stage", arg.slice("--stage=".length));
    continue;
  }
  if (arg === "--stage") {
    passthrough.push("-Stage", process.argv[index + 1] ?? "");
    index += 1;
    continue;
  }
  if (arg.startsWith("--capability=")) {
    passthrough.push("-Capability", arg.slice("--capability=".length));
    continue;
  }
  if (arg === "--capability") {
    passthrough.push("-Capability", process.argv[index + 1] ?? "");
    index += 1;
    continue;
  }
  if (arg.startsWith("--artifact=")) {
    passthrough.push("-Artifact", arg.slice("--artifact=".length));
    continue;
  }
  if (arg === "--artifact") {
    passthrough.push("-Artifact", process.argv[index + 1] ?? "");
    index += 1;
    continue;
  }
  if (arg.startsWith("--impact=")) {
    passthrough.push("-Impact", arg.slice("--impact=".length));
    continue;
  }
  if (arg === "--impact") {
    passthrough.push("-Impact", process.argv[index + 1] ?? "");
    index += 1;
    continue;
  }
  passthrough.push(arg);
}

const result = spawnSync(
  "pwsh",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "tools/guards/sdlc/Invoke-SdlcGate.ps1",
    ...passthrough,
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
