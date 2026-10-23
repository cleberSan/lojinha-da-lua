import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getBrowserStorage,
  ORDER_STORAGE_KEY,
  type OrderStorage,
  readStoredOrder,
  saveOrder,
} from "./order-storage";

function memoryStorage(): OrderStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const failing: OrderStorage = {
  getItem: () => {
    throw new DOMException("bloqueado", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("cheio", "QuotaExceededError");
  },
  removeItem: () => {
    throw new DOMException("bloqueado", "SecurityError");
  },
};

const item = { slug: "caneca-magica", variant: "Unidade", quantity: 2 };

describe("saveOrder e readStoredOrder", () => {
  it("grava o pedido na chave do site e lê de volta", () => {
    const storage = memoryStorage();
    expect(saveOrder(storage, [item])).toBe(true);
    expect(JSON.parse(storage.data.get(ORDER_STORAGE_KEY)!)).toEqual({ version: 1, items: [item] });
    expect(readStoredOrder(storage)).toBe(storage.data.get(ORDER_STORAGE_KEY));
  });

  it("apaga a chave quando o pedido fica vazio", () => {
    const storage = memoryStorage();
    saveOrder(storage, [item]);
    expect(saveOrder(storage, [])).toBe(true);
    expect(storage.data.has(ORDER_STORAGE_KEY)).toBe(false);
    expect(readStoredOrder(storage)).toBeNull();
  });

  it("avisa quando o navegador não deixa usar o armazenamento", () => {
    expect(saveOrder(undefined, [item])).toBe(false);
    expect(saveOrder(failing, [item])).toBe(false);
    expect(saveOrder(failing, [])).toBe(false);
    expect(readStoredOrder(undefined)).toBeUndefined();
    expect(readStoredOrder(failing)).toBeUndefined();
  });
});

describe("getBrowserStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve o localStorage do navegador", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    expect(getBrowserStorage()).toBe(storage);
  });

  it("devolve undefined quando não há localStorage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(getBrowserStorage()).toBeUndefined();
  });

  it("devolve undefined quando só acessar o localStorage já lança erro", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("bloqueado", "SecurityError");
      },
    });
    try {
      expect(getBrowserStorage()).toBeUndefined();
    } finally {
      if (original) {
        Object.defineProperty(globalThis, "localStorage", original);
      } else {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    }
  });
});
