const fs = require('fs');

const path = 'services/dsh/backend/internal/centralcatalog/centralcatalog.go';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Version int `json:"version"` to Domain, Node, MasterProduct, ProductProposal, PlatformPolicy, CatalogAsset
const structs = ['Domain', 'Node', 'MasterProduct', 'ProductProposal', 'PlatformPolicy', 'CatalogAsset'];
structs.forEach(s => {
	const regex = new RegExp(`type ${s} struct \\{[\\s\\S]*?\\n\\}`);
	code = code.replace(regex, (match) => {
		if (match.includes('Version ')) return match;
		return match.replace(`type ${s} struct {`, `type ${s} struct {\n\tVersion int \`json:"version"\``);
	});
});

// 2. Add ExpectedVersion *int `json:"expectedVersion"` to Patch/Put structs
const patchStructs = ['NodePatchInput', 'MasterProductPatchInput', 'PlatformPolicyPutInput', 'PlatformPolicyPatchInput'];
patchStructs.forEach(s => {
	const regex = new RegExp(`type ${s} struct \\{[\\s\\S]*?\\n\\}`);
	code = code.replace(regex, (match) => {
		if (match.includes('ExpectedVersion ')) return match;
		return match.replace(`type ${s} struct {`, `type ${s} struct {\n\tExpectedVersion *int \`json:"expectedVersion"\``);
	});
});

fs.writeFileSync(path, code);
console.log('Added Version fields to structs.');
