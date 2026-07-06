package main

import rego.v1

# Helper to identify registry types
is_agent_registry if {
    some entry in input.entries
    entry.primary_file
}

is_skills_registry if {
    some entry in input.entries
    entry.path
}

is_guard_registry if {
    some entry in input.entries
    entry.script
}

# ── 1. Agent Registry Rules ──────────────────────────────────────────────────
# Every agent must have a non-empty description
deny contains msg if {
    is_agent_registry
    input.entries[i].description == ""
    msg := sprintf("Agent '%v' must have a non-empty description.", [input.entries[i].id])
}

# Every agent must have a defined owner
deny contains msg if {
    is_agent_registry
    not input.entries[i].owner
    msg := sprintf("Agent '%v' must have a defined owner.", [input.entries[i].id])
}

# ── 2. Skills Registry Rules ─────────────────────────────────────────────────
# Every skill must be assigned to an owner
deny contains msg if {
    is_skills_registry
    not input.entries[j].owner
    msg := sprintf("Skill '%v' must have a defined owner.", [input.entries[j].id])
}

# Every skill must have a valid scope
deny contains msg if {
    is_skills_registry
    skill := input.entries[j]
    not valid_skill_scope(skill.scope)
    msg := sprintf("Skill '%v' has invalid scope '%v'. Expected one of: platform, backend, shared, infra, frontend, tools.", [skill.id, skill.scope])
}

valid_skill_scope(scope) if {
    scope == "platform"
}
valid_skill_scope(scope) if {
    scope == "backend"
}
valid_skill_scope(scope) if {
    scope == "shared"
}
valid_skill_scope(scope) if {
    scope == "infra"
}
valid_skill_scope(scope) if {
    scope == "frontend"
}
valid_skill_scope(scope) if {
    scope == "tools"
}

# ── 3. Guard Registry Rules ──────────────────────────────────────────────────
# Every guard must have exit_level defined as 'fail' or 'warn'
deny contains msg if {
    is_guard_registry
    guard := input.entries[k]
    guard.script
    not valid_exit_level(guard.exit_level)
    msg := sprintf("Guard '%v' exit_level must be 'fail' or 'warn'. Found: '%v'", [guard.id, guard.exit_level])
}

valid_exit_level(level) if {
    level == "fail"
}
valid_exit_level(level) if {
    level == "warn"
}
