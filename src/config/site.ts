/**
 * Endereço público e indexação (ADR-0007).
 *
 * O endereço vem da variável SITE_URL no build. Sem ela o site funciona igual, mas sai sem
 * canonical, sem URLs absolutas no Open Graph, sem JSON-LD e sem sitemap, que exigem URL
 * absoluta. Nos testes E2E ela aponta para o próprio `wrangler dev`.
 */
export function parseSiteUrl(value: string | undefined): URL | undefined {
  if (value === undefined || value.trim() === "") return undefined;

  if (!URL.canParse(value)) {
    throw new Error(`SITE_URL inválida: ${value}`);
  }
  const url = new URL(value);
  const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error(`SITE_URL precisa usar https (http só para 127.0.0.1 ou localhost): ${value}`);
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error(`SITE_URL deve ter só a origem, sem caminho, query ou credenciais: ${value}`);
  }
  return url;
}

/**
 * Endereço do site a partir das variáveis de ambiente do build. No build da Cloudflare
 * (Workers Builds define WORKERS_CI=1) a SITE_URL é obrigatória: sem ela a produção sairia
 * sem canonical, prévia de links e sitemap, e só um aviso no log mostraria isso.
 */
export function siteUrlFromEnv(env: Readonly<Record<string, string | undefined>>): URL | undefined {
  const site = parseSiteUrl(env["SITE_URL"]);
  if (site === undefined && env["WORKERS_CI"] === "1") {
    throw new Error(
      "SITE_URL precisa estar definida nas variáveis de build da Cloudflare (CONTRIBUTING.md)",
    );
  }
  return site;
}

/**
 * Páginas fora dos buscadores: o pedido é pessoal de cada aparelho e o 404 não é conteúdo.
 * Recebem `<meta name="robots" content="noindex">` e ficam fora do sitemap.
 */
export const noindexPaths: readonly string[] = ["/404", "/pedido"];

/**
 * Caminho público de uma página: sem ".html", sem "index" e sem barra no final, como a
 * Cloudflare serve (ADR-0002). Aceita tanto o `Astro.url.pathname` quanto os caminhos do
 * fim do build, que vêm sem a barra inicial.
 */
export function publicPath(pathname: string): string {
  return `/${pathname}`
    .replace(/\/{2,}/g, "/")
    .replace(/\.html$/, "")
    .replace(/(^|\/)index$/, "$1")
    .replace(/(.)\/$/, "$1");
}

export function isIndexable(pathname: string): boolean {
  return !noindexPaths.includes(publicPath(pathname));
}
