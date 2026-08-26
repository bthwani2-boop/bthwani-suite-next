import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const files = {
  runtime: path.join(repositoryRoot, "services/dsh/backend/internal/http/server.go"),
  capabilityMap: path.join(repositoryRoot, "services/dsh/capability-map.ts"),
  entryContract: path.join(repositoryRoot, "services/dsh/contracts/dsh.openapi.yaml"),
  partnerContract: path.join(repositoryRoot, "services/dsh/contracts/paths/partner.paths.yaml"),
};

function read(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

const retiredRoute = ["/dsh/partner", "/invites"].join("");
const retiredOperations = [
  ["list", "DshPartnerInvite", "s"],
  ["accept", "DshPartnerInvite"],
  ["reject", "DshPartnerInvite"],
].map((parts) => parts.join(""));

test("partner invitation retirement leaves no live route, contract, or registry claim", () => {
  const source = Object.values(files).map(read).join("\n");

  assert.doesNotMatch(source, new RegExp(retiredRoute.replaceAll("/", "\\/")));
  for (const operationId of retiredOperations) {
    assert.doesNotMatch(source, new RegExp(operationId));
  }
  assert.doesNotMatch(source, new RegExp(["handle", "NotImplemented"].join("")));
});

test("canonical store-scoped team lifecycle remains contractually and runtime bound", () => {
  const runtime = read(files.runtime);
  const partnerContract = read(files.partnerContract);
  const entryContract = read(files.entryContract);

  assert.match(runtime, /GET \/dsh\/partner\/stores\/{storeId}\/team/);
  assert.match(runtime, /POST \/dsh\/partner\/stores\/{storeId}\/team\/invites/);
  assert.match(runtime, /POST \/dsh\/partner\/stores\/{storeId}\/team\/members\/{memberId}\/action/);
  assert.match(partnerContract, /operationId: listDshPartnerStoreTeam/);
  assert.match(partnerContract, /operationId: inviteDshPartnerStoreTeamMember/);
  assert.match(partnerContract, /operationId: executeDshPartnerStoreTeamMemberAction/);
  assert.match(entryContract, /\/dsh\/partner\/stores\/{storeId}\/team:/);
});
