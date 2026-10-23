import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "astro/zod";
import { describe, expect, it } from "vitest";
import { createProductSchema } from "../domain/catalog";

const productsDir = join(dirname(fileURLToPath(import.meta.url)), "produtos");
const schema = createProductSchema(z.string());
const files = readdirSync(productsDir).filter((file) => file.endsWith(".json"));
const products = files.map((file) => ({
  slug: file.replace(/\.json$/, ""),
  data: schema.parse(JSON.parse(readFileSync(join(productsDir, file), "utf8"))),
}));

/**
 * Preços exatamente como nos flyers enviados pela loja (pasta lojinhalua, outubro de 2026).
 * Mudou o preço? Atualize o JSON do produto e esta tabela no mesmo PR.
 */
const flyerPrices: Record<string, Record<string, number>> = {
  "camiseta-sublimacao": { "Frente ou costas": 4000, "Frente e costas": 5000 },
  "camiseta-dtf": { "Estampa A4": 6000, "Estampa A3": 7000 },
  "camiseta-oversized-dtf": { "Estampa A4": 7000, "Estampa A3": 8000 },
  "camiseta-polo-dtf": { Unidade: 7000 },
  "caneca-comum": { Unidade: 3500 },
  "caneca-colorida": { Unidade: 4500 },
  "caneca-coracao": { Unidade: 4800 },
  "caneca-magica": { Unidade: 5000 },
};

describe("catálogo", () => {
  it("tem os 8 produtos dos flyers, nem mais nem menos", () => {
    expect(products.map((product) => product.slug).sort()).toEqual(Object.keys(flyerPrices).sort());
  });

  it.each(products.map((product) => [product.slug, product] as const))(
    "%s tem os preços dos flyers",
    (slug, product) => {
      const prices = Object.fromEntries(
        product.data.variants.map((variant) => [variant.label, variant.priceCents]),
      );
      expect(prices).toEqual(flyerPrices[slug]);
    },
  );

  it.each(products.map((product) => [product.slug, product] as const))(
    "%s usa slug de URL simples e uma imagem que existe",
    (slug, product) => {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(existsSync(resolve(productsDir, product.data.image.src))).toBe(true);
    },
  );

  it("marca como ilustração toda imagem que não é foto da loja", () => {
    for (const product of products) {
      const isSvg = product.data.image.src.endsWith(".svg");
      expect(product.data.image.kind).toBe(isSvg ? "ilustracao" : "foto");
    }
  });

  it("não repete a ordem dentro da mesma categoria", () => {
    const keys = products.map((product) => `${product.data.category}:${product.data.order}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
