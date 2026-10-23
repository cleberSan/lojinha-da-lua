import { readdirSync } from "node:fs";

/** Slugs lidos da mesma pasta que gera as páginas: produto novo entra nos testes sozinho. */
export const productSlugs = readdirSync(new URL("../src/content/produtos/", import.meta.url))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();

export const routes = ["/", "/produtos", ...productSlugs.map((slug) => `/produtos/${slug}`)];

export const orderPhone = "5511958877762";
