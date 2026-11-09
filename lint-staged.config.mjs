// ESLint flat configs live per workspace, so lint the workspaces (not the file list).
export default {
  "*.{ts,tsx,js,mjs,cjs}": () => "pnpm lint",
  "*.{ts,tsx,js,mjs,cjs,json,md,yml,yaml,css}": "prettier --write",
};
