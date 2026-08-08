# Prompting E2E Test Fixture

Status: EXPERIMENTAL_TEST_ONLY

Agent B remote-head change modifies the same package entry from baseline 1a9c427a0f95f4435fddd28396b494f16e33cd3e.

Expected protocol behavior: Agent A's sibling candidate becomes stale and must fail the fast-forward push gate.
