import os
import re

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    print(f"Starting legacy slice taxonomy cleanup in: {repo_root}")

    replacements = [
        (r"\bWLT-000\b", "WLT Foundation"),
        (r"\bWLT-001\b", "WLT Payment Sessions"),
        (r"\bWLT-002\b", "WLT Refund Status"),
        (r"\bWLT-003\b", "WLT Settlement Status"),
        (r"\bWLT-004\b", "WLT Commission"),
        (r"\bWLT-005\b", "WLT Ledger"),
        (r"\bDSH-001\b", "Store Discovery"),
        (r"\bDSH-002\b", "Home Discovery"),
        (r"\bDSH-003\b", "Catalog Management"),
        (r"\bDSH-004\b", "Cart & Serviceability"),
        (r"\bDSH-005\b", "Checkout & WLT Handoff"),
        (r"\bDSH-006\b", "Order Fulfillment"),
        (r"\bDSH-007\b", "Dispatch & Captain Delivery"),
        (r"\bDSH-008\b", "Field Verification"),
        (r"\bDSH-009\b", "Support"),
        (r"\bDSH-010\b", "Analytics"),
        (r"\bDSH-011\b", "Notifications"),
        (r"\bDSH-012\b", "Marketing"),
        (r"\bDSH-013\b", "Platform Policies"),
        (r"\bDSH-014\b", "Administration"),
        (r"\bDSH-015\b", "Partner Onboarding & Store Publication"),
        (r"(?<!\.)\bslices\b", "journeys"),
        (r"(?<!\.)\bslice\b", "journey"),
        (r"(?<!\.)\bSlices\b", "Journeys"),
        (r"(?<!\.)\bSlice\b", "Journey"),
        (r"(?<!\.)\bSLICES\b", "JOURNEYS"),
        (r"(?<!\.)\bSLICE\b", "JOURNEY"),
    ]

    EXCLUDED_DIRS = {
        ".git", "node_modules", "evidence", "migrations", ".pnpm-store", ".next", ".expo", ".turbo", ".nx", ".cache", "dist", "build", "out", "coverage", ".diagnostics", ".github"
    }

    allowed_exts = {
        ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".yaml", ".yml", ".json", ".md", ".ps1", ".sql", ".go"
    }

    for root, dirs, files in os.walk(repo_root):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith(".")]
        
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in allowed_exts:
                continue
                
            filepath = os.path.join(root, filename)
            
            # Exclude lockfiles, package.json, and the cleanup scripts
            if filename in ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "package.json", "guard-manifest.json", "no-legacy-slice-labels.mjs", "clean-legacy-slice-taxonomy.py"]:
                continue
            if "scratch" in filepath or "runs" in filepath:
                continue
                
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
            except Exception:
                continue
                
            orig = content
            for pattern, repl in replacements:
                content = re.sub(pattern, repl, content)
                
            if content != orig:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Cleaned: {filepath}")

    print("Cleanup completed successfully!")

if __name__ == "__main__":
    main()
