import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { islandRoutes, routes } from "./routes";

const sha256 = (content: string) =>
  `'sha256-${createHash("sha256").update(content).digest("base64")}'`;

const expectedHeaders = {
  "content-security-policy":
    "frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "cross-origin-opener-policy": "same-origin",
};

for (const route of routes) {
  test(`${route} responde com os cabeçalhos de segurança e CSP por hash`, async ({ request }) => {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    for (const [name, value] of Object.entries(expectedHeaders)) {
      expect(headers[name], name).toBe(value);
    }
    expect(headers["permissions-policy"]).toContain("camera=()");

    const html = await response.text();
    const meta = /<meta http-equiv="content-security-policy" content="([^"]+)"/.exec(html);
    expect(meta, "CSP no <meta>").not.toBeNull();
    const policy = meta![1]!;
    expect(policy).toContain("default-src 'self'");
    expect(policy).toMatch(/script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')*;/);
    expect(policy).not.toMatch(/unsafe-(inline|eval)/);

    // Script e estilo inline só os que o Astro gera para as ilhas, todos com hash na CSP.
    // JSON-LD é dado, não código: o navegador não executa e a CSP não se aplica.
    for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc=/.test(attributes!) || /type="application\/ld\+json"/.test(attributes!)) continue;
      expect(policy, "script inline sem hash na CSP").toContain(sha256(body!));
    }
    for (const [, body] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
      expect(policy, "estilo inline sem hash na CSP").toContain(sha256(body!));
    }
    expect(html).not.toMatch(/\sstyle="/);
    expect(html).not.toMatch(/\son[a-z]+="/);

    // Só as páginas com ilha do pedido carregam JavaScript.
    const executable = /<script\b(?![^>]*type="application\/ld\+json")/;
    if (islandRoutes.includes(route)) {
      expect(html).toMatch(executable);
    } else {
      expect(html).not.toMatch(executable);
    }
  });
}

test("rota inexistente responde 404 com a página da loja", async ({ page }) => {
  const response = await page.goto("/pagina-que-nao-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Essa página sumiu no espaço");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
});

test("URL com barra no final redireciona para a versão sem barra", async ({ request }) => {
  const response = await request.get("/produtos/", { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(response.status());
  expect(response.headers()["location"]).toBe("/produtos");
});

test("arquivos com hash em /_astro ficam em cache por um ano", async ({ page, request }) => {
  await page.goto("/");
  const stylesheet = await page.locator('link[rel="stylesheet"]').first().getAttribute("href");
  expect(stylesheet).toMatch(/^\/_astro\//);
  const response = await request.get(stylesheet!);
  expect(response.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
});
