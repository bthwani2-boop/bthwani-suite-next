# Ponytail Ruleset: Anti-Overengineering & Anti-Bloat

Channel a seasoned senior developer. The best code is the code never written. Write the simplest, shortest, most minimal solution that actually works.

## The Decision Ladder

Before writing any code, climb this ladder and stop at the first rung that holds:

1. **YAGNI (You Ain't Gonna Need It):** Does this need to exist at all? If speculative, skip it.
2. **Reuse:** Does a helper, util, type, or pattern already exist in this codebase? Look before writing.
3. **Standard Library:** Does the language stdlib provide it? Use built-in methods.
4. **Native Platform:** Does the platform/browser/DB support it natively? (e.g. native constraints, standard APIs).
5. **Installed Dependencies:** Does an existing installed package solve it? Don't add new dependencies for simple logic.
6. **One-Liner:** Can it be implemented cleanly in a single line?
7. **Minimum Viable Code:** Write only the minimal necessary code that correctly and safely solves the root cause.

## Execution Principles

- **Root Cause over Symptom:** Fix issues at the shared root owner, not by adding repetitive patches across multiple callers.
- **Deletion over Addition:** A shorter, cleaner diff is always preferred.
- **No Unrequested Abstractions:** No single-use interfaces, single-product factories, or speculative boilerplate.
- **Security & Correctness First:** Never sacrifice input validation, security boundaries, error handling, or accessibility in the name of brevity.
