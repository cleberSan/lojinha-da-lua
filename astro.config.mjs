// @ts-check
import { writeFile } from "node:fs/promises";
import { defineConfig } from "astro/config";
import { metaCspDirectives, renderHeadersFile } from "./src/config/security.ts";

/** Grava dist/_headers a partir de src/config/security.ts, a única fonte dos cabeçalhos. */
function cloudflareHeaders() {
  return /** @type {import("astro").AstroIntegration} */ ({
    name: "lojinha:cloudflare-headers",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        await writeFile(new URL("_headers", dir), renderHeadersFile());
        logger.info("_headers gerado");
      },
    },
  });
}

export default defineConfig({
  // Gera produtos.html em vez de produtos/index.html: URLs sem barra no final, como os
  // arquivos estáticos da Cloudflare servem por padrão (ADR-0002).
  build: { format: "file", inlineStylesheets: "never" },
  trailingSlash: "never",
  security: {
    csp: {
      algorithm: "SHA-256",
      directives: [...metaCspDirectives],
    },
  },
  integrations: [cloudflareHeaders()],
  devToolbar: { enabled: false },
});
