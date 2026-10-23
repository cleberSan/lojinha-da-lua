import { describe, expect, it } from "vitest";
import {
  addItem,
  countUnits,
  createOrderCatalog,
  formatUnits,
  MAX_ORDER_ITEMS,
  MAX_STORED_LENGTH,
  type OrderCatalogEntry,
  type OrderItem,
  parseQuantityInput,
  parseStoredOrder,
  removeItem,
  resolveOrder,
  serializeOrder,
  setItemQuantity,
  toOrderCatalogEntry,
  toOrderLines,
} from "./order";
import { MAX_QUANTITY } from "./whatsapp";

const dtf: OrderCatalogEntry = {
  slug: "camiseta-dtf",
  name: "Camiseta em DTF",
  variants: [
    { label: "Estampa A4", priceCents: 6000 },
    { label: "Estampa A3", priceCents: 7000 },
  ],
};
const magica: OrderCatalogEntry = {
  slug: "caneca-magica",
  name: "Caneca mágica",
  variants: [{ label: "Unidade", priceCents: 5000 }],
};
const catalog = createOrderCatalog([dtf, magica]);

const a3 = (quantity = 1): OrderItem => ({ slug: "camiseta-dtf", variant: "Estampa A3", quantity });
const caneca = (quantity = 1): OrderItem => ({
  slug: "caneca-magica",
  variant: "Unidade",
  quantity,
});

/** Catálogo com muitas variações, para testar o limite de linhas. */
const wideCatalog = createOrderCatalog([
  {
    slug: "muitas",
    name: "Muitas",
    variants: Array.from({ length: MAX_ORDER_ITEMS + 5 }, (_, index) => ({
      label: `V${index}`,
      priceCents: 1000,
    })),
  },
]);
const fullOrder = Array.from({ length: MAX_ORDER_ITEMS }, (_, index) => ({
  slug: "muitas",
  variant: `V${index}`,
  quantity: 1,
}));

describe("toOrderCatalogEntry", () => {
  it("leva só slug, nome e variações do produto", () => {
    const entry = toOrderCatalogEntry({
      id: "camiseta-dtf",
      data: {
        name: "Camiseta em DTF",
        category: "camisetas",
        order: 2,
        variants: [{ label: "Estampa A4", priceCents: 6000, extra: true } as never],
      },
    });
    expect(entry).toEqual({
      slug: "camiseta-dtf",
      name: "Camiseta em DTF",
      variants: [{ label: "Estampa A4", priceCents: 6000 }],
    });
  });
});

describe("addItem", () => {
  it("acrescenta uma variação nova no fim do pedido", () => {
    const result = addItem([caneca()], a3(2), catalog);
    expect(result).toEqual({ status: "added", items: [caneca(), a3(2)], quantity: 2 });
  });

  it("soma na linha existente quando a variação se repete", () => {
    const result = addItem([a3(2), caneca()], a3(3), catalog);
    expect(result).toEqual({ status: "added", items: [a3(5), caneca()], quantity: 5 });
  });

  it("limita a soma a MAX_QUANTITY e avisa", () => {
    const result = addItem([a3(MAX_QUANTITY - 1)], a3(5), catalog);
    expect(result).toEqual({ status: "capped", items: [a3(MAX_QUANTITY)], quantity: MAX_QUANTITY });
  });

  it("não muda a lista recebida", () => {
    const items = [a3(1)];
    addItem(items, a3(1), catalog);
    expect(items).toEqual([a3(1)]);
  });

  it("recusa linha nova quando o pedido já tem MAX_ORDER_ITEMS linhas", () => {
    const result = addItem(fullOrder, { slug: "muitas", variant: "V21", quantity: 1 }, wideCatalog);
    expect(result).toEqual({ status: "full" });
  });

  it("ainda soma numa linha existente com o pedido cheio", () => {
    const result = addItem(fullOrder, { slug: "muitas", variant: "V0", quantity: 1 }, wideCatalog);
    expect(result.status).toBe("added");
  });

  it.each([
    ["produto fora do catálogo", { slug: "camiseta-x", variant: "Estampa A3", quantity: 1 }],
    ["variação fora do catálogo", { slug: "camiseta-dtf", variant: "Estampa A5", quantity: 1 }],
    [
      "slug que só existe no protótipo de objetos",
      { slug: "__proto__", variant: "x", quantity: 1 },
    ],
    ["quantidade zero", a3(0)],
    ["quantidade negativa", a3(-1)],
    ["quantidade fracionada", a3(1.5)],
    ["quantidade acima do limite", a3(MAX_QUANTITY + 1)],
    ["quantidade NaN", a3(Number.NaN)],
  ])("recusa %s", (_case, item) => {
    expect(addItem([], item, catalog)).toEqual({ status: "invalid" });
  });
});

describe("setItemQuantity e removeItem", () => {
  it("troca a quantidade só da linha indicada", () => {
    expect(setItemQuantity([a3(1), caneca(1)], a3(), 4)).toEqual([a3(4), caneca(1)]);
  });

  it.each([
    [0, 1],
    [-3, 1],
    [2.9, 2],
    [MAX_QUANTITY + 50, MAX_QUANTITY],
  ])("limita %d a %d", (input, expected) => {
    expect(setItemQuantity([a3(5)], a3(), input)).toEqual([a3(expected)]);
  });

  it("ignora valor que não é número", () => {
    expect(setItemQuantity([a3(5)], a3(), Number.NaN)).toEqual([a3(5)]);
    expect(setItemQuantity([a3(5)], a3(), Number.POSITIVE_INFINITY)).toEqual([a3(5)]);
  });

  it("remove só a linha indicada", () => {
    expect(removeItem([a3(), caneca()], a3())).toEqual([caneca()]);
    expect(removeItem([a3()], caneca())).toEqual([a3()]);
  });

  it("conta as unidades do pedido", () => {
    expect(countUnits([a3(2), caneca(3)])).toBe(5);
    expect(countUnits([])).toBe(0);
    expect(formatUnits(1)).toBe("1 item");
    expect(formatUnits(5)).toBe("5 itens");
  });
});

describe("parseQuantityInput", () => {
  it.each([
    ["1", 1],
    [" 12 ", 12],
    ["099", 99],
    [String(MAX_QUANTITY), MAX_QUANTITY],
  ])("aceita %j", (input, expected) => {
    expect(parseQuantityInput(input)).toBe(expected);
  });

  it.each(["", "0", "100", "1000", "-1", "+2", "1.5", "1,5", "1e2", "dois", "0x10"])(
    "recusa %j",
    (input) => {
      expect(parseQuantityInput(input)).toBeUndefined();
    },
  );
});

describe("toOrderLines", () => {
  it("usa nome e preço do catálogo e só mostra a variação quando há mais de uma", () => {
    expect(toOrderLines([a3(2), caneca(1)], catalog)).toEqual([
      {
        productName: "Camiseta em DTF",
        variantLabel: "Estampa A3",
        unitPriceCents: 7000,
        quantity: 2,
      },
      { productName: "Caneca mágica", variantLabel: undefined, unitPriceCents: 5000, quantity: 1 },
    ]);
  });

  it("mantém o item salvo junto da linha resolvida", () => {
    expect(resolveOrder([caneca(2)], catalog)).toEqual([
      {
        item: caneca(2),
        line: {
          productName: "Caneca mágica",
          variantLabel: undefined,
          unitPriceCents: 5000,
          quantity: 2,
        },
      },
    ]);
  });

  it("deixa de fora item que não está no catálogo", () => {
    expect(toOrderLines([{ slug: "sumiu", variant: "Unidade", quantity: 1 }], catalog)).toEqual([]);
  });
});

describe("serializeOrder e parseStoredOrder", () => {
  it("lê de volta o que gravou", () => {
    const items = [a3(2), caneca(1)];
    expect(parseStoredOrder(serializeOrder(items), catalog)).toEqual({ items, dropped: 0 });
  });

  it("grava só slug, variação e quantidade", () => {
    const withExtra = { ...a3(1), priceCents: 1 } as OrderItem;
    expect(JSON.parse(serializeOrder([withExtra]))).toEqual({ version: 1, items: [a3(1)] });
  });

  it.each([
    ["nada salvo", null],
    ["JSON quebrado", "{"],
    ["texto solto", '"pedido"'],
    ["lista no lugar do objeto", "[]"],
    ["versão desconhecida", JSON.stringify({ version: 2, items: [a3()] })],
    ["itens que não são lista", JSON.stringify({ version: 1, items: {} })],
    ["conteúdo grande demais", "x".repeat(MAX_STORED_LENGTH + 1)],
  ])("começa vazio com %s", (_case, raw) => {
    expect(parseStoredOrder(raw, catalog)).toEqual({ items: [], dropped: 0 });
  });

  it("descarta e conta itens que não conferem, sem perder os válidos", () => {
    const raw = JSON.stringify({
      version: 1,
      items: [
        a3(2),
        { slug: "camiseta-dtf", variant: "Estampa A5", quantity: 1 },
        { slug: "sumiu", variant: "Unidade", quantity: 1 },
        { slug: "caneca-magica", variant: "Unidade", quantity: "2" },
        { slug: "caneca-magica", variant: "Unidade", quantity: 500 },
        { slug: 1, variant: "Unidade", quantity: 1 },
        null,
        "caneca",
        caneca(1),
      ],
    });
    expect(parseStoredOrder(raw, catalog)).toEqual({ items: [a3(2), caneca(1)], dropped: 7 });
  });

  it("ignora campos extras, como um preço editado no aparelho", () => {
    const raw = JSON.stringify({ version: 1, items: [{ ...a3(1), priceCents: 1 }] });
    const { items } = parseStoredOrder(raw, catalog);
    expect(items).toEqual([a3(1)]);
    expect(toOrderLines(items, catalog)[0]?.unitPriceCents).toBe(7000);
  });

  it("não se deixa enganar por __proto__ no JSON salvo", () => {
    const raw =
      '{"version":1,"items":[{"__proto__":{"slug":"caneca-magica"},"variant":"Unidade","quantity":1}]}';
    expect(parseStoredOrder(raw, catalog)).toEqual({ items: [], dropped: 1 });
  });

  it("soma linhas repetidas e respeita os limites", () => {
    const repeated = JSON.stringify({ version: 1, items: [a3(60), a3(60)] });
    expect(parseStoredOrder(repeated, catalog).items).toEqual([a3(MAX_QUANTITY)]);

    const tooMany = JSON.stringify({
      version: 1,
      items: [...fullOrder, { slug: "muitas", variant: "V20", quantity: 1 }],
    });
    expect(parseStoredOrder(tooMany, wideCatalog)).toEqual({ items: fullOrder, dropped: 1 });
  });
});
