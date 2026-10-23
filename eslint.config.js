import eslintPluginAstro from "eslint-plugin-astro";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "dist/",
    ".astro/",
    "coverage/",
    "test-results/",
    "playwright-report/",
    "blob-report/",
    ".wrangler/",
  ]),
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  // Regras de acessibilidade do jsx-a11y aplicadas aos componentes .astro.
  ...eslintPluginAstro.configs["jsx-a11y-strict"],
  prettier,
]);
