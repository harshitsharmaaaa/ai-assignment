// Root flat config — delegates to shared configs per workspace.
import backend from "@leadflow/eslint-config/node.js";
import frontend from "@leadflow/eslint-config/next.js";

export default [
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**", "packages/db/src/generated/**"] },
  ...backend,
  ...frontend,
];
