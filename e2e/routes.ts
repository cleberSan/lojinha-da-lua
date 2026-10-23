import { readdirSync } from "node:fs";

/** Slugs lidos da mesma pasta que gera as páginas: produto novo entra nos testes sozinho. */
export const productSlugs = readdirSync(new URL("../src/content/produtos/", import.meta.url))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();

export const productRoutes = productSlugs.map((slug) => `/produtos/${slug}`);

export const routes = ["/", "/produtos", "/pedido", "/contato", "/privacidade", ...productRoutes];

/** Fora dos buscadores e do sitemap (src/config/site.ts). */
export const noindexRoutes = ["/pedido"];

export const indexableRoutes = routes.filter((route) => !noindexRoutes.includes(route));

/** Únicas páginas com JavaScript: as que têm ilha React do pedido (ADR-0006). */
export const islandRoutes = ["/pedido", ...productRoutes];

export const orderPhone = "5511958877762";
