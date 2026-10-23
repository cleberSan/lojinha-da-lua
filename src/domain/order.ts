import type { CatalogProduct } from "./catalog";
import { MAX_QUANTITY, type OrderLine } from "./whatsapp";

/**
 * Pedido montado no site (ADR-0006). O aparelho guarda só o que o cliente escolheu: produto,
 * variação e quantidade. Nome e preço vêm sempre do catálogo do build, então um valor
 * alterado no navegador nunca chega à mensagem do WhatsApp.
 */
export interface OrderItem {
  slug: string;
  variant: string;
  quantity: number;
}

export type OrderItemKey = Pick<OrderItem, "slug" | "variant">;

/** Produto como as ilhas recebem: só os dados públicos que o pedido usa. */
export interface OrderCatalogEntry {
  slug: string;
  name: string;
  variants: readonly { label: string; priceCents: number }[];
}

/** Map, e não objeto, para que um slug como "__proto__" vindo do aparelho não ache nada. */
export type OrderCatalog = ReadonlyMap<string, OrderCatalogEntry>;

/** Linhas diferentes num pedido; cada uma vai até MAX_QUANTITY unidades. */
export const MAX_ORDER_ITEMS = 20;

export function toOrderCatalogEntry(product: CatalogProduct): OrderCatalogEntry {
  return {
    slug: product.id,
    name: product.data.name,
    variants: product.data.variants.map(({ label, priceCents }) => ({ label, priceCents })),
  };
}

export function createOrderCatalog(entries: readonly OrderCatalogEntry[]): OrderCatalog {
  return new Map(entries.map((entry) => [entry.slug, entry]));
}

/**
 * Linha da mensagem do WhatsApp. A variação só aparece quando o produto tem mais de uma,
 * igual ao botão "Pedir" da página do produto.
 */
export function toOrderLine(
  product: OrderCatalogEntry,
  variant: OrderCatalogEntry["variants"][number],
  quantity: number,
): OrderLine {
  return {
    productName: product.name,
    variantLabel: product.variants.length > 1 ? variant.label : undefined,
    unitPriceCents: variant.priceCents,
    quantity,
  };
}

function findVariant(catalog: OrderCatalog, key: OrderItemKey) {
  const product = catalog.get(key.slug);
  const variant = product?.variants.find((candidate) => candidate.label === key.variant);
  return product && variant ? { product, variant } : undefined;
}

function isValidQuantity(quantity: unknown): quantity is number {
  return (
    Number.isInteger(quantity) && (quantity as number) >= 1 && (quantity as number) <= MAX_QUANTITY
  );
}

function isSameLine(a: OrderItemKey, b: OrderItemKey): boolean {
  return a.slug === b.slug && a.variant === b.variant;
}

export type AddItemResult =
  | { status: "added" | "capped"; items: OrderItem[]; quantity: number }
  | { status: "full" }
  | { status: "invalid" };

/**
 * Acrescenta um item. A mesma variação soma na linha existente, limitada a MAX_QUANTITY
 * ("capped"); uma variação nova só entra se o pedido tiver menos de MAX_ORDER_ITEMS linhas.
 */
export function addItem(
  items: readonly OrderItem[],
  item: OrderItem,
  catalog: OrderCatalog,
): AddItemResult {
  if (!findVariant(catalog, item) || !isValidQuantity(item.quantity)) {
    return { status: "invalid" };
  }

  const index = items.findIndex((current) => isSameLine(current, item));
  if (index === -1) {
    if (items.length >= MAX_ORDER_ITEMS) return { status: "full" };
    const added = { slug: item.slug, variant: item.variant, quantity: item.quantity };
    return { status: "added", items: [...items, added], quantity: item.quantity };
  }

  const wanted = items[index]!.quantity + item.quantity;
  const quantity = Math.min(wanted, MAX_QUANTITY);
  return {
    status: wanted > MAX_QUANTITY ? "capped" : "added",
    items: items.map((current, position) =>
      position === index ? { ...current, quantity } : current,
    ),
    quantity,
  };
}

/** Troca a quantidade de uma linha, limitada entre 1 e MAX_QUANTITY. */
export function setItemQuantity(
  items: readonly OrderItem[],
  key: OrderItemKey,
  quantity: number,
): OrderItem[] {
  if (!Number.isFinite(quantity)) return [...items];
  const clamped = Math.min(Math.max(Math.trunc(quantity), 1), MAX_QUANTITY);
  return items.map((item) => (isSameLine(item, key) ? { ...item, quantity: clamped } : item));
}

export function removeItem(items: readonly OrderItem[], key: OrderItemKey): OrderItem[] {
  return items.filter((item) => !isSameLine(item, key));
}

export function countUnits(items: readonly OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** "1 item", "3 itens": contagem de unidades para a tela. */
export function formatUnits(units: number): string {
  return units === 1 ? "1 item" : `${units} itens`;
}

/**
 * Quantidade digitada num campo: só inteiros de 1 a MAX_QUANTITY, sem sinal, vírgula nem
 * expoente (o campo numérico do navegador aceita "1e2").
 */
export function parseQuantityInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return undefined;
  const quantity = Number(trimmed);
  return isValidQuantity(quantity) ? quantity : undefined;
}

export interface ResolvedOrderItem {
  item: OrderItem;
  line: OrderLine;
}

/** Cada item com nome e preço do catálogo; item que não confere fica de fora. */
export function resolveOrder(
  items: readonly OrderItem[],
  catalog: OrderCatalog,
): ResolvedOrderItem[] {
  return items.flatMap((item) => {
    const found = findVariant(catalog, item);
    return found ? [{ item, line: toOrderLine(found.product, found.variant, item.quantity) }] : [];
  });
}

/** Linhas da mensagem do WhatsApp, na ordem do pedido. */
export function toOrderLines(items: readonly OrderItem[], catalog: OrderCatalog): OrderLine[] {
  return resolveOrder(items, catalog).map(({ line }) => line);
}

const STORED_VERSION = 1;

/** Acima disso o conteúdo salvo nem é lido: um pedido real ocupa poucas centenas de bytes. */
export const MAX_STORED_LENGTH = 10_000;

export function serializeOrder(items: readonly OrderItem[]): string {
  return JSON.stringify({
    version: STORED_VERSION,
    items: items.map(({ slug, variant, quantity }) => ({ slug, variant, quantity })),
  });
}

export interface StoredOrder {
  items: OrderItem[];
  /** Itens salvos que não conferem mais com o catálogo e foram descartados. */
  dropped: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOrderItem(value: unknown): OrderItem | undefined {
  if (!isRecord(value)) return undefined;
  const { slug, variant, quantity } = value;
  if (typeof slug !== "string" || typeof variant !== "string" || !isValidQuantity(quantity)) {
    return undefined;
  }
  return { slug, variant, quantity };
}

/**
 * Lê o pedido salvo no aparelho. O conteúdo pode ter sido editado à mão, vir de uma versão
 * antiga do site ou citar um produto que saiu do catálogo: o que não confere é descartado e
 * contado em `dropped`, e linhas repetidas são somadas.
 */
export function parseStoredOrder(raw: string | null, catalog: OrderCatalog): StoredOrder {
  const empty: StoredOrder = { items: [], dropped: 0 };
  if (raw === null || raw.length > MAX_STORED_LENGTH) return empty;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (!isRecord(data) || data["version"] !== STORED_VERSION || !Array.isArray(data["items"])) {
    return empty;
  }

  let items: OrderItem[] = [];
  let dropped = 0;
  for (const entry of data["items"]) {
    const item = toOrderItem(entry);
    const result = item ? addItem(items, item, catalog) : undefined;
    if (result?.status === "added" || result?.status === "capped") {
      items = result.items;
    } else {
      dropped += 1;
    }
  }
  return { items, dropped };
}
