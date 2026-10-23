import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { indexableRoutes, noindexRoutes, orderPhone, productSlugs } from "./routes";

/**
 * O build dos testes usa SITE_URL igual ao endereço do `wrangler dev` (CONTRIBUTING.md), então
 * canonical, Open Graph, JSON-LD e sitemap apontam para o próprio servidor de teste.
 */
const absolute = (path: string, baseURL: string | undefined) => new URL(path, baseURL).href;

async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  expect(raw, "JSON-LD na página").not.toBeNull();
  return JSON.parse(raw!) as Record<string, unknown>[];
}

function productFile(slug: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/content/produtos/${slug}.json`, import.meta.url), "utf8"),
  ) as { name: string; image: { kind: string }; variants: { priceCents: number }[] };
}

for (const route of indexableRoutes) {
  test(`${route} tem canonical, Open Graph e imagem de prévia que carrega`, async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto(route);
    const url = absolute(route, baseURL);
    await expect(
      page.locator('link[rel="canonical"]'),
      "build com SITE_URL do teste?",
    ).toHaveAttribute("href", url);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", url);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Lojinha Da Lua/,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");

    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toMatch(new RegExp(`^${absolute("/_astro/", baseURL)}`));
    const response = await request.get(image!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/jpeg");
  });
}

for (const route of [...noindexRoutes, "/pagina-que-nao-existe"]) {
  test(`${route} fica fora dos buscadores`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });
}

test("a página inicial descreve a loja em JSON-LD", async ({ page, baseURL }) => {
  await page.goto("/");
  const [organization, website] = await jsonLd(page);
  expect(organization).toMatchObject({
    "@type": "Organization",
    name: "Lojinha Da Lua",
    url: absolute("/", baseURL),
    sameAs: ["https://www.instagram.com/lojinhadalua___"],
    contactPoint: { telephone: `+${orderPhone}` },
  });
  expect(website).toMatchObject({ "@type": "WebSite", url: absolute("/", baseURL) });
});

for (const slug of productSlugs) {
  test(`/produtos/${slug} tem JSON-LD com os preços do catálogo`, async ({
    page,
    request,
    baseURL,
  }) => {
    const product = productFile(slug);
    const cents = product.variants.map((variant) => variant.priceCents);
    const price = (value: number) => (value / 100).toFixed(2);
    await page.goto(`/produtos/${slug}`);
    const [data, breadcrumb] = await jsonLd(page);

    expect(data).toMatchObject({
      "@type": "Product",
      name: product.name,
      url: absolute(`/produtos/${slug}`, baseURL),
    });
    const offers = data!["offers"] as Record<string, unknown>;
    const [low, high] = [Math.min(...cents), Math.max(...cents)];
    if (low === high) {
      expect(offers).toMatchObject({ "@type": "Offer", price: price(low), priceCurrency: "BRL" });
    } else {
      expect(offers).toMatchObject({
        "@type": "AggregateOffer",
        lowPrice: price(low),
        highPrice: price(high),
        priceCurrency: "BRL",
      });
    }

    // Só foto da loja vai para o JSON-LD; ilustração provisória fica de fora (ADR-0003).
    if (product.image.kind === "foto") {
      const [image] = data!["image"] as string[];
      expect((await request.get(image!)).status()).toBe(200);
    } else {
      expect(data).not.toHaveProperty("image");
    }

    const items = breadcrumb!["itemListElement"] as { item: string }[];
    expect(items.map((item) => item.item)).toEqual([
      absolute("/", baseURL),
      expect.stringMatching(/\/produtos#(camisetas|canecas)$/),
      absolute(`/produtos/${slug}`, baseURL),
    ]);
  });
}

test("robots.txt aponta o sitemap, que lista só as páginas indexáveis", async ({
  request,
  baseURL,
}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${absolute("/sitemap.xml", baseURL)}`);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const locations = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, loc]) => loc,
  );
  expect(locations.sort()).toEqual(indexableRoutes.map((route) => absolute(route, baseURL)).sort());
  for (const location of locations) {
    expect((await request.get(location!)).status(), location).toBe(200);
  }
});
