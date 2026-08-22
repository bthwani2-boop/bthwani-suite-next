import { fileURLToPath } from "node:url";

const pnpmWindowsBridge = fileURLToPath(new URL("./invoke-pnpm.ps1", import.meta.url));
const allowedDirectCommands = new Map([
  ["node", process.execPath],
  ["git", "git"],
]);

function normalizeArguments(args) {
  if (!Array.isArray(args)) {
    throw new TypeError("package-manager invocation arguments must be an array");
  }
  return args.map((arg) => String(arg));
}

function encodeArguments(args) {
  return Buffer.from(JSON.stringify(args), "utf8").toString("base64");
}

export function resolvePackageManagerInvocation(
  command,
  args,
  environment = process.env,
  platform = process.platform,
) {
  void environment;
  const normalizedArgs = normalizeArguments(args);

  if (command === process.execPath) {
    return { executable: process.execPath, args: normalizedArgs };
  }

  const directExecutable = allowedDirectCommands.get(command);
  if (directExecutable) {
    return { executable: directExecutable, args: normalizedArgs };
  }

  if (command !== "pnpm") {
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
        pnpmWindowsBridge,
        encodeArguments(normalizedArgs),
      ],
    };
  }

  return { executable: "pnpm", args: normalizedArgs };
}
