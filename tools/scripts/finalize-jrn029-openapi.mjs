await import("./integrate-jrn029-openapi.mjs");

const { migrateDshOpenApi } = await import("./dsh-openapi-modular-lib.mjs");
migrateDshOpenApi();

console.log("JRN-029 sovereign OpenAPI bundle, manifest and ownership report are current.");
