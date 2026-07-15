const fs = require('fs');

const path = 'services/dsh/backend/internal/centralcatalog/centralcatalog.go';
let code = fs.readFileSync(path, 'utf8');

// 1. Add 'version' to XColumns constants
const columnUpdates = [
  { const: 'domainColumns', old: 'created_at, updated_at`', new: 'created_at, updated_at, version`' },
  { const: 'nodeColumns', old: 'created_at, updated_at`', new: 'created_at, updated_at, version`' },
  { const: 'masterProductColumns', old: 'created_at, updated_at`', new: 'created_at, updated_at, version`' },
  { const: 'assortmentColumns', old: 'created_at, updated_at`', new: 'created_at, updated_at, version`' },
  { const: 'proposalColumns', old: 'created_at, updated_at`', new: 'created_at, updated_at, version`' },
  { const: 'policyColumns', old: 'created_at, updated_at`', new: 'created_at, updated_at, version`' },
  { const: 'assetColumns', old: 'created_at, updated_at`', new: 'created_at, updated_at, version`' }
];

columnUpdates.forEach(c => {
	const regex = new RegExp(`const ${c.const} = \`[\\s\\S]*?${c.old}`);
	code = code.replace(regex, match => match.replace(c.old, c.new));
});

// 2. Add '&x.Version' to scanX functions
const scanUpdates = [
  { func: 'scanDomain', obj: 'd' },
  { func: 'scanNode', obj: 'n' },
  { func: 'scanMasterProduct', obj: 'p' },
  { func: 'scanAssortment', obj: 'a' },
  { func: 'scanProductProposal', obj: 'p' }, // check if it's called scanProposal or scanProductProposal
  { func: 'scanPlatformPolicy', obj: 'p' },
  { func: 'scanCatalogAsset', obj: 'a' }
];

scanUpdates.forEach(s => {
	const regex = new RegExp(`func ${s.func}\\([\\s\\S]*?&${s.obj}\\.UpdatedAt\\)`);
	code = code.replace(regex, match => match.replace(`&${s.obj}.UpdatedAt`, `&${s.obj}.UpdatedAt, &${s.obj}.Version`));
});

// 3. Add 'version = version + 1' to UPDATE queries
// We just replace 'updated_at=now()' with 'updated_at=now(), version = version + 1'
code = code.replaceAll('updated_at=now()', 'updated_at=now(), version = version + 1');

// 4. UpdateDomain missing ErrConflict
// Replace the start of UpdateDomain query execution with the OCC check
const updateDomainSearch = `	result, err := db.ExecContext(ctx, \`UPDATE dsh_catalog_domains SET`;
const updateDomainReplace = `	if input.ExpectedVersion != nil {
		current, err := GetDomain(ctx, db, id)
		if err != nil {
			return Domain{}, err
		}
		if current.Version != *input.ExpectedVersion {
			return Domain{}, ErrConflict
		}
	}
	result, err := db.ExecContext(ctx, \`UPDATE dsh_catalog_domains SET`;
code = code.replace(updateDomainSearch, updateDomainReplace);

fs.writeFileSync(path, code);
console.log('Fixed OCC bugs.');
