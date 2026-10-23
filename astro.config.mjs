// @ts-check
import { writeFile } from "node:fs/promises";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import { metaCspDirectives, renderHeadersFile } from "./src/config/security.ts";
import { isIndexable, publicPath, siteUrlFromEnv } from "./src/config/site.ts";
import { renderRobots, renderSitemap } from "./src/domain/seo.ts";

const site = siteUrlFromEnv(process.env);

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

/**
 * Grava robots.txt sempre e sitemap.xml quando SITE_URL está definida (ADR-0007), com as
 * páginas geradas no build menos as de src/config/site.ts que ficam fora dos buscadores.
 */
function searchEngineFiles() {
  return /** @type {import("astro").AstroIntegration} */ ({
    name: "lojinha:search-engine-files",
    hooks: {
      "astro:build:done": async ({ dir, pages, logger }) => {
        await writeFile(new URL("robots.txt", dir), renderRobots(site));
        if (!site) {
          logger.warn("SITE_URL não definida: build sem sitemap.xml, canonical e JSON-LD");
          return;
        }
        const paths = pages.map((page) => publicPath(page.pathname)).filter(isIndexable);
        await writeFile(new URL("sitemap.xml", dir), renderSitemap(site, paths));
        logger.info(`sitemap.xml gerado com ${paths.length} páginas`);
      },
    },
  });
}

export default defineConfig({
  ...(site ? { site: site.origin } : {}),
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
  // React só nas ilhas do pedido (ADR-0006); as demais páginas saem sem JavaScript.
  integrations: [react(), cloudflareHeaders(), searchEngineFiles()],
  devToolbar: { enabled: false },
});
