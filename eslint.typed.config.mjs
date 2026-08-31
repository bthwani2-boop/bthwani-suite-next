import tseslint from "typescript-eslint";

const typedFiles = [
  "apps/**/*.{ts,tsx,mts,cts}",
  "core/**/*.{ts,tsx,mts,cts}",
  "services/**/*.{ts,tsx,mts,cts}",
  "shared/**/*.{ts,tsx,mts,cts}",
];

const ignores = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.expo/**",
  "**/coverage/**",
  "**/generated/**",
  "**/.nx/**",
  "**/.cache/**",
  "**/graphify-out/**",
  "**/.yagni-out/**",
];

export default tseslint.config(
  { ignores },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: typedFiles,
    languageOptions: {
      ...(config.languageOptions ?? {}),
      parserOptions: {
        ...(config.languageOptions?.parserOptions ?? {}),
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  })),
);