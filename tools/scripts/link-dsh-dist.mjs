import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dshDir = path.resolve(__dirname, "../../services/dsh");
const distDir = path.join(dshDir, "dist");
const nestedDir = path.join(distDir, "services/dsh");
const subdirs = ["frontend", "domain", "clients"];

function existsByLstat(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

function removePath(p) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      if (existsByLstat(p)) {
        fs.rmSync(p, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 150,
        });
      }

      if (!existsByLstat(p)) {
        return;
      }
    } catch (error) {
      if (attempt === 5) {
        throw new Error(`Failed to remove ${p}: ${error.message}`);
      }
    }
  }

  if (existsByLstat(p)) {
    throw new Error(`Failed to remove ${p}: path still exists`);
  }
}

function linkOrCopyDir(target, linkPath, label) {
  removePath(linkPath);
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });

  try {
    const isWindows = process.platform === "win32";
    const relativeTarget = path.relative(path.dirname(linkPath), target);

    fs.symlinkSync(
      relativeTarget,
      linkPath,
      isWindows ? "junction" : "dir"
    );

    console.log(`Successfully linked ${linkPath} -> ${target}`);
    return;
  } catch (error) {
    console.warn(`Symlink failed for ${label}; falling back to copy: ${error.message}`);
  }

  removePath(linkPath);

  fs.cpSync(target, linkPath, {
    recursive: true,
    force: true,
    errorOnExist: false,
    dereference: false,
  });

  if (!existsByLstat(linkPath)) {
    throw new Error(`Failed to copy ${label}: ${linkPath} was not created`);
  }

  console.log(`Successfully copied ${target} -> ${linkPath}`);
}

try {
  if (!existsByLstat(nestedDir)) {
    console.log("No nested dist services/dsh directory found to link.");
    process.exit(0);
  }

  for (const sub of subdirs) {
    const target = path.join(nestedDir, sub);
    const linkPath = path.join(distDir, sub);

    if (!existsByLstat(target)) {
      console.log(`Skipping ${sub}: target not found.`);
      continue;
    }

    linkOrCopyDir(target, linkPath, sub);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
