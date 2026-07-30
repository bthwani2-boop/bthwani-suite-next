from __future__ import annotations

import re
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Patterns for SaaS and Tenancy (case-insensitive)
SAAS_PATTERN = re.compile(r"\bsaas\b", re.IGNORECASE)
TENANT_PATTERN = re.compile(r"\btenant(s|ry|cy)?\b", re.IGNORECASE)

# Exemptions: Files/folders that are allowed to mention these terms as part of guards, policy definitions, or agent rules.
EXEMPT_PATHS = {
    "tools/guards/nomenclature-guard.mjs",
    "governance/policies/product.md",
    "governance/product/platform-model.yaml",
    "AGENTS.md",
    "tools/scripts/diagnose-saas-tenancy.py",
}

IGNORE_DIRS = {".git", "node_modules", ".nx", ".cache", ".agents"}

def should_skip(relative_path: str) -> bool:
    if relative_path in EXEMPT_PATHS:
        return True
    parts = relative_path.split("/")
    for ignore in IGNORE_DIRS:
        if ignore in parts:
            return True
    return False

def diagnose() -> None:
    findings = []
    
    # Supported text file extensions
    text_extensions = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".yaml", ".yml", ".json", ".sql", ".go", ".py", ".ps1", ".md", ".sh"}
    
    for root, dirs, files in os.walk(ROOT):
        # Prune search space to speed up and avoid binary files or massive folders
        rel_dir = os.path.relpath(root, ROOT).replace("\\", "/")
        if rel_dir == ".":
            rel_dir = ""
            
        # Modify dirs in-place to avoid walking skipped directories
        dirs[:] = [d for d in dirs if not should_skip(f"{rel_dir}/{d}".strip("/"))]
        
        for file in files:
            file_path = Path(root) / file
            if file_path.suffix.lower() not in text_extensions:
                continue
                
            rel_file_path = os.path.relpath(file_path, ROOT).replace("\\", "/")
            if should_skip(rel_file_path):
                continue
                
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                lines = content.splitlines()
                for line_idx, line in enumerate(lines, 1):
                    has_saas = SAAS_PATTERN.search(line)
                    has_tenant = TENANT_PATTERN.search(line)
                    if has_saas or has_tenant:
                        findings.append({
                            "file": rel_file_path,
                            "line_num": line_idx,
                            "content": line.strip(),
                            "type": "SaaS" if has_saas else "Tenancy"
                        })
            except Exception as e:
                # Silently ignore read failures for lock files or binary formats
                pass

    # Categorize findings
    app_source = []
    database_schema = []
    infra_config = []
    other = []
    
    for f in findings:
        file = f["file"]
        if file.startswith(("services/", "core/", "apps/shared/", "shared/")) and file.endswith((".go", ".ts", ".tsx", ".js", ".py")):
            app_source.append(f)
        elif "migrations" in file or file.endswith(".sql"):
            database_schema.append(f)
        elif file.startswith("infra/") or file.endswith((".ps1", ".sh", ".yml", ".yaml", "docker-compose")):
            infra_config.append(f)
        else:
            other.append(f)
            
    # Generate report
    report_lines = [
        "# Deep Diagnostics Report: SaaS & Tenancy Leftovers",
        "",
        f"Generated from local HEAD reference.",
        "",
        "## Summary of Findings",
        f"- **Application Source Leftovers**: {len(app_source)} references",
        f"- **Database / Migration Leftovers**: {len(database_schema)} references",
        f"- **Infrastructure & Config Leftovers**: {len(infra_config)} references",
        f"- **Other File Leftovers**: {len(other)} references",
        "",
    ]
    
    def format_group(title: str, items: list[dict]) -> None:
        report_lines.append(f"## {title} ({len(items)} found)")
        if not items:
            report_lines.append("No leftover references found in this category.")
            report_lines.append("")
            return
        
        report_lines.append("| File | Line | Occurrence |")
        report_lines.append("|---|---|---|")
        for item in items:
            escaped_content = item["content"].replace("|", "\\|")
            report_lines.append(f"| [{item['file']}](file:///{ROOT}/{item['file']}#L{item['line_num']}) | {item['line_num']} | `{escaped_content}` |")
        report_lines.append("")

    format_group("Application Source Code", app_source)
    format_group("Database Schemas & Migrations", database_schema)
    format_group("Infrastructure & Configuration", infra_config)
    format_group("Other files (Tests, Docs, Manifests)", other)

    # Write report
    diag_dir = ROOT / ".diagnostics"
    diag_dir.mkdir(exist_ok=True)
    report_file = diag_dir / "saas-tenancy-leftovers-report.md"
    report_file.write_text("\n".join(report_lines), encoding="utf-8")
    
    print(f"Deep diagnostics complete. Report written to {report_file.resolve()}")
    print(f"Total findings: {len(findings)}")
    print(f"Active application code findings: {len(app_source)}")
    print(f"Database schema findings: {len(database_schema)}")
    print(f"Infrastructure findings: {len(infra_config)}")

if __name__ == "__main__":
    diagnose()
