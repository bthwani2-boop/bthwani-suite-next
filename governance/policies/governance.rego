package main

# ── 1. Agent Registry Rules ──────────────────────────────────────────────────
# Every agent must have a non-empty description
deny[msg] {
    input.entries[i].description == ""
    msg := sprintf("Agent '%v' must have a non-empty description.", [input.entries[i].id])
}

# Every agent must have a defined owner
deny[msg] {
    not input.entries[i].owner
    msg := sprintf("Agent '%v' must have a defined owner.", [input.entries[i].id])
}

# ── 2. Skills Registry Rules ─────────────────────────────────────────────────
# Every skill must be assigned to an owner
deny[msg] {
    not input.entries[j].owner
    msg := sprintf("Skill '%v' must have a defined owner.", [input.entries[j].id])
}

# Every skill must have a valid scope
deny[msg] {
    skill := input.entries[j]
    not valid_skill_scope(skill.scope)
    msg := sprintf("Skill '%v' has invalid scope '%v'. Expected one of: platform, backend, shared, infra, frontend, tools.", [skill.id, skill.scope])
}

valid_skill_scope("platform")
valid_skill_scope("backend")
valid_skill_scope("shared")
valid_skill_scope("infra")
valid_skill_scope("frontend")
valid_skill_scope("tools")

# ── 3. Guard Registry Rules ──────────────────────────────────────────────────
# Every guard must have exit_level defined as 'fail' or 'warn'
deny[msg] {
    guard := input.entries[k]
    guard.script
    not valid_exit_level(guard.exit_level)
    msg := sprintf("Guard '%v' exit_level must be 'fail' or 'warn'. Found: '%v'", [guard.id, guard.exit_level])
}

valid_exit_level("fail")
valid_exit_level("warn")
