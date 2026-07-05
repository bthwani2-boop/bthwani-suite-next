import reactCompiler from "eslint-plugin-react-compiler";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.expo/**",
      "**/coverage/**",
      "**/graphify-out/**",
      "**/.yagni-out/**",
      "**/.nx/**",
      "**/.cache/**",
      "**/tools/registry/runs/**"
    ]
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.jsx"],
    plugins: {
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-compiler/react-compiler": "error",
    },
  }
];
