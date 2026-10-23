import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Os testes E2E (e2e/*.spec.ts) rodam no Playwright, não no Vitest.
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Regras e configuração em TypeScript. Páginas, componentes e as ilhas React são
      // cobertos pelos testes E2E, que rodam sobre o build (ADR-0001 e ADR-0006): toda regra
      // que as ilhas usam fica em src/domain, com teste unitário.
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/content.config.ts", "src/components/**", "src/islands/**"],
      reporter: ["text", "lcov", "cobertura"],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
