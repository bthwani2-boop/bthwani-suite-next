import { fileURLToPath } from "node:url";

const windowsBridgePath = fileURLToPath(new URL("./invoke-package-manager.ps1", import.meta.url));
const allowedPackageManagers = new Set(["pnpm", "npx"]);
const allowedDirectCommands = new Map([
  ["node", () => process.execPath],
  ["git", () => "git"],
]);

function normalizeArgs(args) {
  if (!Array.isArray(args)) throw new TypeError("command arguments must be an array");
  return args.map((arg) => String(arg));
}

export function resolvePackageManagerInvocation(
  command,
  args,
  environment = process.env,
  platform = process.platform,
) {
  void environment;
  const normalizedArgs = normalizeArgs(args);

  if (command === process.execPath) {
    return { executable: process.execPath, args: normalizedArgs };
  }

  const directExecutable = allowedDirectCommands.get(command);
  if (directExecutable) {
    return { executable: directExecutable(), args: normalizedArgs };
  }

  if (!allowedPackageManagers.has(command)) {
    throw new Error(`Unsupported governed command '${command}'`);
  }

  if (platform === "win32") {
    return {
      executable: "pwsh",
      args: [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        windowsBridgePath,
        command,
        ...normalizedArgs,
      ],
    };
  }

  return { executable: command, args: normalizedArgs };
}
