package main

import rego.v1

is_agent_registry if {
    some entry in input.entries
    object.get(entry, "primary_file", "") != ""
}

is_skills_registry if {
    input.schemaVersion == 3
    some entry in input.entries
    object.get(entry, "contract_level", "") != ""
}

is_guard_registry if {
    some entry in input.entries
    object.get(entry, "script", "") != ""
}

# Agent registry

deny contains msg if {
    is_agent_registry
    agent := input.entries[_]
    object.get(agent, "description", "") == ""
    msg := sprintf("Agent '%v' must have a non-empty description.", [agent.id])
}

deny contains msg if {
    is_agent_registry
    agent := input.entries[_]
    object.get(agent, "owner", "") == ""
    msg := sprintf("Agent '%v' must have a defined owner.", [agent.id])
}

deny contains msg if {
    is_agent_registry
    agent := input.entries[_]
    object.get(agent, "may_final_approve_own_work", false)
    msg := sprintf("Agent '%v' may not approve its own work.", [agent.id])
}

deny contains msg if {
    is_agent_registry
    agent := input.entries[_]
    agent.kind == "adapter"
    count(object.get(agent, "approval_domains", [])) > 0
    msg := sprintf("Adapter '%v' may not own approval domains.", [agent.id])
}

# Skill registry

valid_skill_scope(scope) if scope == "platform"
valid_skill_scope(scope) if scope == "backend"
valid_skill_scope(scope) if scope == "shared"
valid_skill_scope(scope) if scope == "infra"
valid_skill_scope(scope) if scope == "frontend"
valid_skill_scope(scope) if scope == "tools"
valid_skill_scope(scope) if scope == "product"
valid_skill_scope(scope) if scope == "security"

deny contains msg if {
    is_skills_registry
    skill := input.entries[_]
    object.get(skill, "owner", "") == ""
    msg := sprintf("Skill '%v' must have a defined owner.", [skill.id])
}

deny contains msg if {
    is_skills_registry
    skill := input.entries[_]
    not valid_skill_scope(skill.scope)
    msg := sprintf("Skill '%v' has invalid scope '%v'.", [skill.id, skill.scope])
}

deny contains msg if {
    is_skills_registry
    skill := input.entries[_]
    skill.status in {"active", "conditional"}
    skill.contract_level != "governed"
    msg := sprintf("Active or conditional skill '%v' must be governed.", [skill.id])
}

deny contains msg if {
    is_skills_registry
    skill := input.entries[_]
    skill.contract_level == "legacy"
    skill.status != "retired"
    msg := sprintf("Legacy skill '%v' must be retired.", [skill.id])
}

deny contains msg if {
    is_skills_registry
    skill := input.entries[_]
    skill.status == "retired"
    object.get(skill, "retirement_reason", "") == ""
    msg := sprintf("Retired skill '%v' requires a retirement reason.", [skill.id])
}

deny contains msg if {
    is_skills_registry
    skill := input.entries[_]
    skill.status == "retired"
    count(object.get(skill, "authority", [])) > 0
    msg := sprintf("Retired skill '%v' may not own authority.", [skill.id])
}

deny contains msg if {
    is_skills_registry
    skill := input.entries[_]
    skill.status == "retired"
    count(object.get(skill, "depends_on", [])) > 0
    msg := sprintf("Retired skill '%v' may not keep dependencies.", [skill.id])
}

# Guard registry

valid_exit_level(level) if level == "fail"
valid_exit_level(level) if level == "warn"

deny contains msg if {
    is_guard_registry
    guard := input.entries[_]
    not valid_exit_level(guard.exit_level)
    msg := sprintf("Guard '%v' exit_level must be fail or warn. Found '%v'.", [guard.id, guard.exit_level])
}

deny contains msg if {
    is_guard_registry
    guard := input.entries[_]
    guard.id in {"governance-schema", "agent-governance", "guard-registry", "sdlc", "workflow-lint", "workflow-security", "actions-pin"}
    guard.exit_level != "fail"
    msg := sprintf("Critical guard '%v' must be fail-level.", [guard.id])
}
