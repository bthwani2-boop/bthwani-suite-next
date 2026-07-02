import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dshDir = path.resolve(__dirname, "../../services/dsh");
const distDir = path.join(dshDir, "dist");
const nestedDir = path.join(distDir, "services/dsh");

if (fs.existsSync(nestedDir)) {
  for (const sub of ["frontend", "domain", "clients"]) {
    const target = path.join(nestedDir, sub);
    const linkPath = path.join(distDir, sub);

    if (fs.existsSync(target)) {
      // Remove existing symlink or directory if any
      if (fs.existsSync(linkPath)) {
        try {
          fs.rmSync(linkPath, { recursive: true, force: true });
        } catch (e) {
          console.warn(`Could not remove existing path ${linkPath}:`, e.message);
        }
      }

      // Create symlink/junction cross-platform
      try {
        const isWindows = process.platform === "win32";
        fs.symlinkSync(
          path.relative(path.dirname(linkPath), target),
          linkPath,
          isWindows ? "junction" : "dir"
        );
        console.log(`Successfully linked ${linkPath} -> ${target}`);
      } catch (e) {
        console.warn(`Symlink failed, falling back to copy for ${sub}:`, e.message);
        try {
          fs.cpSync(target, linkPath, { recursive: true });
          console.log(`Successfully copied ${target} -> ${linkPath}`);
        } catch (copyErr) {
          console.error(`Failed to copy ${sub}:`, copyErr.message);
        }
      }
    }
  }
} else {
  console.log("No nested dist services/dsh directory found to link.");
}
