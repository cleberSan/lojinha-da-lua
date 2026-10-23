/**
 * Cabeçalhos de segurança do site (ADR-0004).
 *
 * A CSP fica dividida em duas partes que o navegador aplica juntas:
 * - no <meta> de cada página, gerado pelo Astro: as diretivas de recursos abaixo mais
 *   script-src e style-src com os hashes calculados no build, sem 'unsafe-inline';
 * - no cabeçalho HTTP: as diretivas que um <meta> não aceita, como frame-ancestors.
 */
export const metaCspDirectives = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
] as const;

export const headerCsp = [
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join("; ");

export const securityHeaders: Readonly<Record<string, string>> = {
  "Content-Security-Policy": headerCsp,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/** Arquivos em /_astro/ têm hash no nome: podem ficar em cache por um ano. */
export const immutableAssetsCacheControl = "public, max-age=31536000, immutable";

/**
 * Conteúdo do arquivo `_headers` lido pelos arquivos estáticos da Cloudflare.
 * Formato: um caminho por bloco e um cabeçalho por linha, indentado.
 */
export function renderHeadersFile(): string {
  const block = (path: string, headers: Readonly<Record<string, string>>) =>
    [path, ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)].join("\n");

  return [
    block("/*", securityHeaders),
    block("/_astro/*", { "Cache-Control": immutableAssetsCacheControl }),
  ]
    .join("\n\n")
    .concat("\n");
}
