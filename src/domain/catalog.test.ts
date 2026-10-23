import { z } from "astro/zod";
import { describe, expect, it } from "vitest";
import {
  type CatalogProduct,
  createProductSchema,
  groupByCategory,
  hasSinglePrice,
  relatedProducts,
  sortProducts,
  startingPriceCents,
} from "./catalog";

function product(
  id: string,
  category: "camisetas" | "canecas",
  order: number,
  prices: number[],
  name = id,
): CatalogProduct {
  return {
    id,
    data: {
      name,
      category,
      order,
      variants: prices.map((priceCents, index) => ({ label: `V${index}`, priceCents })),
    },
  };
}

const schema = createProductSchema(z.string());
const valid = {
  name: "Camiseta em DTF",
  category: "camisetas",
  technique: "DTF",
  summary: "Camiseta com estampa em DTF no tamanho A4 ou A3.",
  image: { src: "camiseta.svg", alt: "Ilustração de uma camiseta preta", kind: "ilustracao" },
  variants: [
    { label: "Estampa A4", priceCents: 6000 },
    { label: "Estampa A3", priceCents: 7000 },
  ],
  notes: ["Arte minimalista de até 10 cm vem de brinde."],
  order: 2,
};

describe("createProductSchema", () => {
  it("aceita um produto válido e completa notas ausentes com lista vazia", () => {
    expect(schema.parse(valid).variants).toHaveLength(2);
    expect(schema.parse({ ...valid, notes: undefined }).notes).toEqual([]);
  });

  it.each([
    ["preço em reais com centavos", { variants: [{ label: "A4", priceCents: 60.5 }] }],
    ["preço zero", { variants: [{ label: "A4", priceCents: 0 }] }],
    ["sem variações", { variants: [] }],
    [
      "variações repetidas",
      {
        variants: [
          { label: "A4", priceCents: 6000 },
          { label: "A4", priceCents: 7000 },
        ],
      },
    ],
    ["categoria desconhecida", { category: "azulejos" }],
    ["técnica desconhecida", { technique: "Bordado" }],
    ["imagem sem tipo", { image: { src: "x.svg", alt: "Texto alternativo ok" } }],
    ["texto alternativo curto", { image: { src: "x.svg", alt: "x", kind: "foto" } }],
    ["nome curto", { name: "Ca" }],
  ])("recusa %s", (_, override) => {
    expect(schema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("preços", () => {
  it("usa o menor preço como 'a partir de'", () => {
    expect(startingPriceCents(product("dtf", "camisetas", 1, [7000, 6000]))).toBe(6000);
  });

  it("identifica produto de preço único", () => {
    expect(hasSinglePrice(product("caneca", "canecas", 1, [3500]))).toBe(true);
    expect(hasSinglePrice(product("dtf", "camisetas", 1, [6000, 7000]))).toBe(false);
  });
});

describe("ordenação e agrupamento", () => {
  const catalog = [
    product("caneca-magica", "canecas", 4, [5000]),
    product("camiseta-dtf", "camisetas", 2, [6000, 7000]),
    product("caneca-comum", "canecas", 1, [3500]),
    product("camiseta-sublimacao", "camisetas", 1, [4000, 5000]),
    product("camiseta-b", "camisetas", 2, [6000], "Bata"),
  ];

  it("ordena por categoria, depois ordem, depois nome", () => {
    expect(sortProducts(catalog).map((item) => item.id)).toEqual([
      "camiseta-sublimacao",
      "camiseta-b",
      "camiseta-dtf",
      "caneca-comum",
      "caneca-magica",
    ]);
  });

  it("não altera a lista original", () => {
    const before = catalog.map((item) => item.id);
    sortProducts(catalog);
    expect(catalog.map((item) => item.id)).toEqual(before);
  });

  it("agrupa por categoria na ordem de exibição", () => {
    const groups = groupByCategory(catalog);
    expect(groups.map((group) => [group.id, group.name, group.products.length])).toEqual([
      ["camisetas", "Camisetas", 3],
      ["canecas", "Canecas", 2],
    ]);
  });

  it("omite categorias sem produtos", () => {
    expect(groupByCategory([product("caneca", "canecas", 1, [3500])]).map((g) => g.id)).toEqual([
      "canecas",
    ]);
  });

  it("sugere outros produtos da mesma categoria, sem o atual", () => {
    const current = catalog[1]!;
    expect(relatedProducts(catalog, current).map((item) => item.id)).toEqual([
      "camiseta-sublimacao",
      "camiseta-b",
    ]);
    expect(relatedProducts(catalog, current, 1)).toHaveLength(1);
  });
});
