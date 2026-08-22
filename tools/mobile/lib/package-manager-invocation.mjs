import fs from "node:fs";

function existingNodeCli(environment) {
  const candidate = environment.npm_execpath;
  return candidate && fs.existsSync(candidate) ? candidate : undefined;
}

function windowsCommandInvocation(command, args, environment) {
  return {
    executable: environment.ComSpec || process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", command, ...args],
  };
}

export function resolvePackageManagerInvocation(command, args, environment = process.env) {
  if (command === "pnpm") {
    const pnpmCli = existingNodeCli(environment);
    if (pnpmCli) {
      return { executable: process.execPath, args: [pnpmCli, ...args] };
    }
    if (process.platform === "win32") {
      return windowsCommandInvocation("pnpm", args, environment);
    }
    return { executable: "pnpm", args };
  }

  if (command === "npx") {
    if (process.platform === "win32") {
      return windowsCommandInvocation("npx", args, environment);
    }
    return { executable: "npx", args };
  }

  return { executable: command, args };
}
