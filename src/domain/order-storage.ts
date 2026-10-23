import { serializeOrder, type OrderItem } from "./order";

/** Chave do pedido no localStorage. Mudou o formato? Suba a versão em `serializeOrder`. */
export const ORDER_STORAGE_KEY = "lojinha-da-lua:pedido";

/** O pedaço do Web Storage que o pedido usa; nos testes, um objeto simples basta. */
export type OrderStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * O localStorage do navegador, ou undefined quando ele não existe (build) ou quando o
 * navegador bloqueia dados de sites: nesse caso, só acessar a propriedade já lança erro.
 */
export function getBrowserStorage(): OrderStorage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/** Texto salvo (null se não houver pedido) ou undefined se o armazenamento não estiver disponível. */
export function readStoredOrder(storage: OrderStorage | undefined): string | null | undefined {
  if (!storage) return undefined;
  try {
    return storage.getItem(ORDER_STORAGE_KEY);
  } catch {
    return undefined;
  }
}

/**
 * Grava o pedido; um pedido vazio apaga a chave. Devolve false quando o navegador não deixa
 * gravar (modo privado antigo, cota cheia, bloqueio), para a tela avisar o cliente.
 */
export function saveOrder(storage: OrderStorage | undefined, items: readonly OrderItem[]): boolean {
  if (!storage) return false;
  try {
    if (items.length === 0) {
      storage.removeItem(ORDER_STORAGE_KEY);
    } else {
      storage.setItem(ORDER_STORAGE_KEY, serializeOrder(items));
    }
    return true;
  } catch {
    return false;
  }
}
