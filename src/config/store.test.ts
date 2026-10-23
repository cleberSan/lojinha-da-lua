import { describe, expect, it } from "vitest";
import { formatPricesAsOf, orderContact, parseStore, store } from "./store";

const valid = {
  name: "Lojinha Da Lua",
  tagline: "Seu estilo único em produtos personalizados!",
  description: "Produtos personalizados.",
  instagram: { handle: "lojinhadalua___", url: "https://www.instagram.com/lojinhadalua___" },
  whatsapp: [
    { phone: "5511958877762", label: "Atendimento", receivesOrders: true },
    { phone: "5511998241075", label: "Luiz", receivesOrders: false },
  ],
  pricesAsOf: "2026-10",
};

describe("store", () => {
  it("usa os contatos publicados pela loja", () => {
    expect(store.whatsapp.map((contact) => contact.phone)).toEqual([
      "5511958877762",
      "5511998241075",
    ]);
    expect(store.instagram.url).toBe("https://www.instagram.com/lojinhadalua___");
  });

  it("manda os pedidos do site para um único WhatsApp", () => {
    expect(orderContact.phone).toBe("5511958877762");
  });

  it("aceita a configuração válida", () => {
    expect(parseStore(valid).name).toBe("Lojinha Da Lua");
  });

  it.each([
    [
      "número sem o 55",
      { whatsapp: [{ phone: "11958877762", label: "Atendimento", receivesOrders: true }] },
    ],
    [
      "nenhum número recebendo pedidos",
      { whatsapp: [{ phone: "5511958877762", label: "Atendimento", receivesOrders: false }] },
    ],
    [
      "dois números recebendo pedidos",
      {
        whatsapp: [
          { phone: "5511958877762", label: "A", receivesOrders: true },
          { phone: "5511998241075", label: "B", receivesOrders: true },
        ],
      },
    ],
    [
      "Instagram fora do domínio oficial",
      { instagram: { handle: "x", url: "https://evil.example/x" } },
    ],
    ["Instagram em http", { instagram: { handle: "x", url: "http://www.instagram.com/x" } }],
    ["mês inválido", { pricesAsOf: "2026-13" }],
  ])("recusa %s", (_, override) => {
    expect(() => parseStore({ ...valid, ...override })).toThrow();
  });
});

describe("formatPricesAsOf", () => {
  it("escreve o mês por extenso", () => {
    expect(formatPricesAsOf("2026-10")).toBe("outubro de 2026");
    expect(formatPricesAsOf("2027-01")).toBe("janeiro de 2027");
  });
});
