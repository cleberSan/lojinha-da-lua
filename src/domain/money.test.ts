import { describe, expect, it } from "vitest";
import { formatBRL } from "./money";

// O Intl separa "R$" do número com espaço não separável.
const nbsp = " ";

describe("formatBRL", () => {
  it.each([
    [7000, `R$${nbsp}70,00`],
    [4550, `R$${nbsp}45,50`],
    [1, `R$${nbsp}0,01`],
    [0, `R$${nbsp}0,00`],
    [123456789, `R$${nbsp}1.234.567,89`],
  ])("formata %i centavos como %s", (cents, expected) => {
    expect(formatBRL(cents)).toBe(expected);
  });

  it.each([-1, 10.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "recusa %s centavos",
    (cents) => {
      expect(() => formatBRL(cents)).toThrow(RangeError);
    },
  );
});
