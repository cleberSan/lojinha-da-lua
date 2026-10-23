import { expect, test } from "@playwright/test";
import { routes } from "./routes";

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

    // Nada inline que a CSP precisaria liberar: estilos e scripts vêm de arquivos.
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).not.toMatch(/\sstyle="/);
    expect(html).not.toMatch(/\son[a-z]+="/);
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
