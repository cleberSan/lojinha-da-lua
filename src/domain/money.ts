const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Formata centavos em reais ("R$ 70,00"). Preços ficam em centavos inteiros para evitar
 * erro de arredondamento de ponto flutuante.
 *
 * O Intl separa "R$" do valor com um espaço não separável (U+00A0), que impede a quebra de
 * linha entre o símbolo e o número.
 */
export function formatBRL(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError(`Valor em centavos inválido: ${cents}`);
  }
  return brl.format(cents / 100);
}
