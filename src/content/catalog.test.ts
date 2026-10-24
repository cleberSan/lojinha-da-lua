import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "astro/zod";
import { describe, expect, it } from "vitest";
import { createProductSchema } from "../domain/catalog";
import { MAX_ORDER_ITEMS, toOrderLine } from "../domain/order";
import { buildOrderMessage, MAX_QUANTITY } from "../domain/whatsapp";

const productsDir = join(dirname(fileURLToPath(import.meta.url)), "produtos");

/** Largura e altura de um PNG ou JPEG, lidas do cabeçalho, sem depender de biblioteca de imagem. */
function imageSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.toString("latin1", 1, 4) === "PNG") {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.readUInt16BE(0) !== 0xffd8) {
    throw new Error("A imagem não é PNG nem JPEG.");
  }
  // JPEG: pula de segmento em segmento até o SOFn, que guarda altura e largura.
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    const marker = bytes.readUInt8(offset + 1);
    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  throw new Error("JPEG sem cabeçalho de quadro.");
}
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

  it.each(
    products
      .filter((product) => !product.data.image.src.endsWith(".svg"))
      .map((product) => [product.slug, product] as const),
  )("%s tem foto quadrada de pelo menos 1200 px", (_slug, product) => {
    // O cartão no celular e a página do produto em tela 2x pedem 900 px ou mais (ADR-0009).
    const { width, height } = imageSize(readFileSync(resolve(productsDir, product.data.image.src)));
    expect(width).toBe(height);
    expect(width).toBeGreaterThanOrEqual(1200);
  });

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

  it("o maior pedido possível cabe numa mensagem do WhatsApp", () => {
    // Toda variação do catálogo com a quantidade máxima: se um produto novo ou um nome longo
    // estourar o limite da mensagem, o teste avisa antes do site.
    const lines = products.flatMap((product) =>
      product.data.variants.map((variant) =>
        toOrderLine({ slug: product.slug, ...product.data }, variant, MAX_QUANTITY),
      ),
    );
    expect(lines.length).toBeLessThanOrEqual(MAX_ORDER_ITEMS);
    expect(() => buildOrderMessage("Lojinha Da Lua", lines)).not.toThrow();
  });
});
