import { describe, expect, it } from "vitest";
import { formatBrazilianMobile, isBrazilianMobile } from "./phone";

describe("isBrazilianMobile", () => {
  it.each(["5511958877762", "5511998241075", "5521912345678"])("aceita %s", (phone) => {
    expect(isBrazilianMobile(phone)).toBe(true);
  });

  it.each([
    ["sem o 55 do Brasil (o erro do link atual da bio)", "11958877762"],
    ["com +", "+5511958877762"],
    ["com máscara", "55 (11) 95887-7762"],
    ["fixo, sem o 9", "551133334444"],
    ["DDD com zero", "5501958877762"],
    ["dígito a mais", "55119588777620"],
    ["vazio", ""],
  ])("recusa número %s", (_, phone) => {
    expect(isBrazilianMobile(phone)).toBe(false);
  });
});

describe("formatBrazilianMobile", () => {
  it("formata como nos flyers da loja", () => {
    expect(formatBrazilianMobile("5511958877762")).toBe("(11) 95887-7762");
    expect(formatBrazilianMobile("5511998241075")).toBe("(11) 99824-1075");
  });

  it("recusa número fora do formato", () => {
    expect(() => formatBrazilianMobile("11958877762")).toThrow(RangeError);
  });
});
