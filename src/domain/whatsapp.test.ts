import { describe, expect, it } from "vitest";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  lineName,
  MAX_MESSAGE_LENGTH,
  MAX_QUANTITY,
  type OrderLine,
} from "./whatsapp";

const nbsp = " ";
const dtfA3: OrderLine = {
  productName: "Camiseta em DTF",
  variantLabel: "Estampa A3",
  unitPriceCents: 7000,
  quantity: 1,
};

describe("buildOrderMessage", () => {
  it("monta o pedido de um item com variação e total", () => {
    expect(buildOrderMessage("Lojinha Da Lua", [dtfA3])).toBe(
      [
        "Olá, Lojinha Da Lua! Vim pelo site e quero fazer um pedido:",
        `- 1x Camiseta em DTF (Estampa A3): R$${nbsp}70,00 cada`,
        `Total de referência: R$${nbsp}70,00`,
      ].join("\n"),
    );
  });

  it("omite a variação quando o produto tem uma só", () => {
    const message = buildOrderMessage("Lojinha Da Lua", [
      { productName: "Caneca mágica", variantLabel: undefined, unitPriceCents: 5000, quantity: 1 },
    ]);
    expect(message).toContain(`- 1x Caneca mágica: R$${nbsp}50,00 cada`);
  });

  it("soma quantidades e itens no total", () => {
    const message = buildOrderMessage("Lojinha Da Lua", [
      { ...dtfA3, quantity: 2 },
      { productName: "Caneca comum", unitPriceCents: 3500, quantity: 3 },
    ]);
    expect(message).toContain(`- 2x Camiseta em DTF (Estampa A3): R$${nbsp}70,00 cada`);
    expect(message).toContain(`- 3x Caneca comum: R$${nbsp}35,00 cada`);
    expect(message).toContain(`Total de referência: R$${nbsp}245,00`);
  });

  it("recusa pedido vazio", () => {
    expect(() => buildOrderMessage("Lojinha Da Lua", [])).toThrow(RangeError);
  });

  it.each([0, -1, 1.5, MAX_QUANTITY + 1])("recusa quantidade %s", (quantity) => {
    expect(() => buildOrderMessage("Lojinha Da Lua", [{ ...dtfA3, quantity }])).toThrow(RangeError);
  });

  it("aceita a quantidade máxima", () => {
    expect(buildOrderMessage("Lojinha Da Lua", [{ ...dtfA3, quantity: MAX_QUANTITY }])).toContain(
      `${MAX_QUANTITY}x`,
    );
  });

  it("recusa mensagem acima do limite", () => {
    const lines = Array.from({ length: 40 }, (_, index) => ({
      ...dtfA3,
      productName: `Produto com um nome bem comprido número ${index}`,
    }));
    expect(() => buildOrderMessage("Lojinha Da Lua", lines)).toThrow(
      new RegExp(`acima de ${MAX_MESSAGE_LENGTH}`),
    );
  });

  it("recusa preço inválido", () => {
    expect(() => buildOrderMessage("Lojinha Da Lua", [{ ...dtfA3, unitPriceCents: -100 }])).toThrow(
      RangeError,
    );
  });
});

describe("buildWhatsAppUrl", () => {
  it("gera o link wa.me com o número completo e a mensagem codificada", () => {
    const url = buildWhatsAppUrl("5511958877762", "Olá! Quero 1x Caneca & Cia?");
    expect(url).toBe(
      "https://wa.me/5511958877762?text=Ol%C3%A1!%20Quero%201x%20Caneca%20%26%20Cia%3F",
    );
    expect(new URL(url).searchParams.get("text")).toBe("Olá! Quero 1x Caneca & Cia?");
  });

  it("codifica espaço como %20 e quebra de linha como %0A", () => {
    const url = buildWhatsAppUrl("5511958877762", "linha 1\nlinha 2");
    expect(url).toContain("linha%201%0Alinha%202");
    expect(url).not.toContain("+");
  });

  it("não deixa a mensagem injetar outros parâmetros", () => {
    const url = new URL(buildWhatsAppUrl("5511958877762", "oi&phone=5599999999999#x"));
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.hash).toBe("");
    expect(url.pathname).toBe("/5511958877762");
  });

  it("gera o link sem texto quando a mensagem é vazia", () => {
    expect(buildWhatsAppUrl("5511998241075", "")).toBe("https://wa.me/5511998241075");
  });

  it("recusa o número sem o 55 do Brasil", () => {
    expect(() => buildWhatsAppUrl("11958877762", "oi")).toThrow(RangeError);
  });
});

describe("lineName", () => {
  it("junta produto e variação, ou só o produto", () => {
    expect(lineName(dtfA3)).toBe("Camiseta em DTF (Estampa A3)");
    expect(lineName({ productName: "Caneca mágica", variantLabel: undefined })).toBe(
      "Caneca mágica",
    );
  });
});
