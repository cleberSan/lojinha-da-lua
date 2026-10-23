import { formatBRL } from "./money";
import { isBrazilianMobile } from "./phone";

export interface OrderLine {
  productName: string;
  variantLabel?: string | undefined;
  unitPriceCents: number;
  quantity: number;
}

/** Limite da mensagem montada pelo site: cabe com folga em qualquer URL do wa.me. */
export const MAX_MESSAGE_LENGTH = 1500;
export const MAX_QUANTITY = 99;

function describeLine({ productName, variantLabel, unitPriceCents, quantity }: OrderLine): string {
  const name = variantLabel ? `${productName} (${variantLabel})` : productName;
  return `- ${quantity}x ${name}: ${formatBRL(unitPriceCents)} cada`;
}

/**
 * Monta o texto do pedido que o cliente envia pelo WhatsApp. O total é "de referência":
 * o valor final é sempre confirmado pela loja na conversa.
 */
export function buildOrderMessage(storeName: string, lines: readonly OrderLine[]): string {
  if (lines.length === 0) {
    throw new RangeError("O pedido precisa de pelo menos um item.");
  }
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) {
      throw new RangeError(`Quantidade inválida para ${line.productName}: ${line.quantity}`);
    }
  }

  const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const message = [
    `Olá, ${storeName}! Vim pelo site e quero fazer um pedido:`,
    ...lines.map(describeLine),
    `Total de referência: ${formatBRL(totalCents)}`,
  ].join("\n");

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new RangeError(
      `Mensagem com ${message.length} caracteres, acima de ${MAX_MESSAGE_LENGTH}.`,
    );
  }
  return message;
}

/** Link "clique para conversar" do WhatsApp com a mensagem já preenchida. */
export function buildWhatsAppUrl(phone: string, message: string): string {
  if (!isBrazilianMobile(phone)) {
    throw new RangeError(`Número de WhatsApp inválido: ${phone}`);
  }
  // encodeURIComponent troca espaço por %20, como o WhatsApp documenta; URLSearchParams
  // usaria "+", que pode aparecer literalmente na conversa.
  const base = `https://wa.me/${phone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
