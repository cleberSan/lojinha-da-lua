import { useMemo, useSyncExternalStore } from "react";
import {
  type OrderCatalog,
  type OrderItem,
  parseStoredOrder,
  type StoredOrder,
} from "../domain/order";
import {
  getBrowserStorage,
  ORDER_STORAGE_KEY,
  readStoredOrder,
  saveOrder,
} from "../domain/order-storage";

/**
 * O pedido salvo no aparelho como estado das ilhas (ADR-0006). O localStorage é a única fonte:
 * as ilhas leem dele com `useSyncExternalStore` e recebem as mudanças desta aba (evento
 * próprio) e das outras abas (evento "storage" do navegador).
 */
const CHANGE_EVENT = "lojinha-da-lua:pedido-alterado";

const LOADING = Symbol("carregando");
const UNAVAILABLE = Symbol("indisponível");
type Snapshot = string | null | typeof LOADING | typeof UNAVAILABLE;

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ORDER_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** O texto salvo é um valor primitivo: o React compara com Object.is sem renderizar à toa. */
function getSnapshot(): Snapshot {
  const raw = readStoredOrder(getBrowserStorage());
  return raw === undefined ? UNAVAILABLE : raw;
}

/** No build e na hidratação ainda não há aparelho: a tela mostra "carregando". */
function getServerSnapshot(): Snapshot {
  return LOADING;
}

export type StoredOrderState =
  { status: "loading" } | { status: "unavailable" } | ({ status: "ready" } & StoredOrder);

export function useStoredOrder(catalog: OrderCatalog): StoredOrderState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    if (snapshot === LOADING) return { status: "loading" };
    if (snapshot === UNAVAILABLE) return { status: "unavailable" };
    return { status: "ready", ...parseStoredOrder(snapshot, catalog) };
  }, [snapshot, catalog]);
}

/** Grava o pedido e avisa as ilhas desta aba. Devolve false se o navegador não deixar. */
export function storeOrder(items: readonly OrderItem[]): boolean {
  const saved = saveOrder(getBrowserStorage(), items);
  if (saved) window.dispatchEvent(new Event(CHANGE_EVENT));
  return saved;
}
