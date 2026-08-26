import assert from "node:assert/strict";
import test from "node:test";
import { ATTESTATION_MARKER, parseAttestationBody, parseComments } from "./parse-semantic-attestation.mjs";

const candidateSha = "a".repeat(40);
const otherSha = "b".repeat(40);
const baseContract = {
  schema: "BTHWANI_SEMANTIC_REVIEW",
  version: 1,
  candidateSha,
  verdict: "PASS",
  reviewIdentity: { kind: "external-authorized-host-agent", provider: "codex" },
  reviewProvenance: {
    artifactIdentity: `opencodereview-delegation-${candidateSha}-123`,
    contextSha256: "c".repeat(64),
    packageIntegrity: "/p+9mE+gEG1HrkGZu25ocKxrPWPJbdLhqfbKgG7idMJEc6gLF3RpS/u+2V3lpnKKVallXj7IHW4sSjNFQO1F9w==",
    toolVersion: "1.9.9",
  },
};
const bodyFor = (contract = baseContract) => `${ATTESTATION_MARKER}\n${JSON.stringify(contract)}`;
const comment = (body, login = "trusted-reviewer") => ({ id: 1, user: { login }, body });

 test("accepts one exact canonical external-host attestation", () => {
  const result = parseComments({ comments: [comment(bodyFor())], candidateSha, prAuthor: "candidate" });
  assert.equal(result.attestation.login, "trusted-reviewer");
  assert.equal(result.attestation.contract.candidateSha, candidateSha);
});

test("rejects free-form marker imitations and multiline contracts", () => {
  assert.equal(parseAttestationBody(`${ATTESTATION_MARKER} verdict=PASS head=${candidateSha}`, candidateSha).ok, false);
  assert.equal(parseAttestationBody(`${ATTESTATION_MARKER}\n${JSON.stringify(baseContract)}\nnotes`, candidateSha).ok, false);
});

test("rejects wrong, stale, FAIL, malformed, or extra contract fields", () => {
  for (const contract of [
    { ...baseContract, candidateSha: otherSha },
    { ...baseContract, verdict: "FAIL" },
    { ...baseContract, unexpected: true },
  ]) {
    assert.equal(parseAttestationBody(bodyFor(contract), candidateSha).ok, false);
  }
  assert.equal(parseAttestationBody(`${ATTESTATION_MARKER}\n{not-json}`, candidateSha).ok, false);
});

test("rejects candidate-authored, duplicate, and conflicting attestations", () => {
  assert.throws(
    () => parseComments({ comments: [comment(bodyFor(), "candidate")], candidateSha, prAuthor: "candidate" }),
    /candidate-authored|no valid/u,
  );
  assert.throws(
    () => parseComments({ comments: [comment(bodyFor()), comment(bodyFor())], candidateSha }),
    /duplicate/u,
  );
  assert.throws(
    () => parseComments({ comments: [comment(bodyFor()), comment(bodyFor({ ...baseContract, reviewIdentity: { ...baseContract.reviewIdentity, provider: "chatgpt" } }), "another-reviewer")], candidateSha }),
    /multiple/u,
  );
});

test("rejects malformed GitHub pagination and missing comment identity", () => {
  assert.throws(() => parseComments({ comments: "not-an-array", candidateSha }), /comments must be an array/u);
  assert.throws(() => parseComments({ comments: [comment(bodyFor(), "")], candidateSha }), /no valid/u);
});
