import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatBRL } from "../domain/money";
import {
  countUnits,
  createOrderCatalog,
  formatUnits,
  type OrderCatalogEntry,
  type OrderItem,
  type OrderItemKey,
  parseQuantityInput,
  removeItem,
  resolveOrder,
  setItemQuantity,
} from "../domain/order";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  lineName,
  MAX_QUANTITY,
  type OrderLine,
  orderTotalCents,
} from "../domain/whatsapp";
import { storeOrder, useStoredOrder } from "./useStoredOrder";
import { WhatsAppIcon } from "./WhatsAppIcon";
import "./order.css";

interface Props {
  catalog: OrderCatalogEntry[];
  storeName: string;
  /** WhatsApp que recebe os pedidos, no formato 55DD9XXXXXXXX. */
  phone: string;
}

/** Mensagem pronta, ou undefined quando o pedido passa do limite de uma mensagem. */
function tryBuildMessage(storeName: string, lines: readonly OrderLine[]): string | undefined {
  try {
    return buildOrderMessage(storeName, lines);
  } catch {
    return undefined;
  }
}

/** Página "Meu pedido" (ADR-0006): revisa os itens e envia tudo numa mensagem do WhatsApp. */
export default function OrderBuilder({ catalog: entries, storeName, phone }: Props) {
  const catalog = useMemo(() => createOrderCatalog(entries), [entries]);
  const order = useStoredOrder(catalog);
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);

  // Depois de remover ou esvaziar, o botão clicado some: o foco vai para o título da lista.
  useEffect(() => {
    if (focusRequest > 0) headingRef.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (confirmingClear) cancelClearRef.current?.focus();
  }, [confirmingClear]);

  function commit(items: readonly OrderItem[], message: string): boolean {
    const saved = storeOrder(items);
    setSaveFailed(!saved);
    setAnnouncement(saved ? message : "");
    return saved;
  }

  // Antes da hidratação não há o que mostrar: sem JavaScript, vale o aviso do <noscript>.
  if (order.status === "loading") {
    return <div className="order-builder order-loading" aria-busy="true" />;
  }

  if (order.status === "unavailable") {
    return (
      <div className="order-builder">
        <p className="order-notice">
          Este navegador não deixa guardar o pedido no aparelho, então não dá para juntar itens
          aqui. Você ainda pode pedir cada produto pelo botão do WhatsApp na página dele.
        </p>
        <a className="button button-primary" href="/produtos">
          Ver produtos
        </a>
      </div>
    );
  }

  const resolved = resolveOrder(order.items, catalog);
  const lines = resolved.map(({ line }) => line);
  const units = countUnits(order.items);
  const message = lines.length > 0 ? tryBuildMessage(storeName, lines) : undefined;

  function changeQuantity(key: OrderItemKey, name: string, quantity: number, announce: boolean) {
    if (order.status !== "ready") return;
    commit(
      setItemQuantity(order.items, key, quantity),
      announce ? `Quantidade de ${name}: ${quantity}.` : "",
    );
  }

  function remove(key: OrderItemKey, name: string) {
    if (order.status !== "ready") return;
    if (commit(removeItem(order.items, key), `${name} saiu do pedido.`)) {
      setFocusRequest((value) => value + 1);
    }
  }

  function clear() {
    setConfirmingClear(false);
    if (commit([], "Pedido esvaziado.")) setFocusRequest((value) => value + 1);
  }

  return (
    <div className="order-builder">
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
      {order.dropped > 0 && (
        <p className="order-notice">
          {order.dropped === 1
            ? "Um item do seu pedido saiu do catálogo ou mudou e foi retirado."
            : `${order.dropped} itens do seu pedido saíram do catálogo ou mudaram e foram retirados.`}
        </p>
      )}
      {saveFailed && (
        <p className="order-notice" role="alert">
          Não foi possível atualizar o pedido neste navegador.
        </p>
      )}

      {resolved.length === 0 ? (
        <div className="order-empty">
          <h2 ref={headingRef} tabIndex={-1}>
            Seu pedido está vazio
          </h2>
          <p>Escolha os produtos no catálogo e toque em “Adicionar ao pedido” em cada um.</p>
          <a className="button button-primary" href="/produtos">
            Ver produtos
          </a>
        </div>
      ) : (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="order-heading">
            Itens do pedido <span className="order-count">({formatUnits(units)})</span>
          </h2>
          <ul className="order-lines">
            {resolved.map(({ item, line }) => {
              const name = lineName(line);
              return (
                <li key={JSON.stringify([item.slug, item.variant])} className="order-line">
                  <div className="order-line-info">
                    <a href={`/produtos/${item.slug}`} className="order-line-name">
                      {line.productName}
                    </a>
                    {line.variantLabel && (
                      <span className="order-line-variant">{line.variantLabel}</span>
                    )}
                    <span className="order-line-unit">{formatBRL(line.unitPriceCents)} cada</span>
                  </div>
                  <QuantityStepper
                    label={name}
                    value={item.quantity}
                    onChange={(quantity, announce) =>
                      changeQuantity(item, name, quantity, announce)
                    }
                  />
                  <p className="order-line-subtotal">
                    <span className="visually-hidden">Subtotal: </span>
                    <span className="price">{formatBRL(line.unitPriceCents * line.quantity)}</span>
                  </p>
                  <button
                    type="button"
                    className="order-remove"
                    aria-label={`Remover ${name}`}
                    onClick={() => remove(item, name)}
                  >
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="order-summary">
            <p className="order-total">
              <span>Total de referência</span>
              <span className="price">{formatBRL(orderTotalCents(lines))}</span>
            </p>
            <p className="order-hint">
              O valor final, o prazo e a entrega são combinados na conversa.
            </p>
            {message ? (
              <>
                <a
                  className="button button-whatsapp order-send"
                  href={buildWhatsAppUrl(phone, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon />
                  Enviar pedido pelo WhatsApp
                  <span className="visually-hidden"> (abre em outra aba)</span>
                </a>
                <details className="order-preview">
                  <summary>Ver a mensagem que vai para o WhatsApp</summary>
                  <pre>{message}</pre>
                </details>
              </>
            ) : (
              <p className="order-notice" role="alert">
                O pedido ficou grande demais para uma mensagem. Retire alguns itens e envie o resto
                em outro pedido.
              </p>
            )}

            <div className="order-actions">
              <a className="button button-ghost button-small" href="/produtos">
                Continuar escolhendo
              </a>
              {confirmingClear ? (
                <div className="order-confirm" role="group" aria-labelledby={`${id}-confirmar`}>
                  <span id={`${id}-confirmar`}>Tirar todos os itens do pedido?</span>
                  <button
                    type="button"
                    className="button button-ghost button-small"
                    onClick={clear}
                  >
                    Sim, esvaziar
                  </button>
                  <button
                    ref={cancelClearRef}
                    type="button"
                    className="button button-ghost button-small"
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="order-clear"
                  onClick={() => setConfirmingClear(true)}
                >
                  Esvaziar pedido
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface QuantityStepperProps {
  label: string;
  value: number;
  /** `announce` é true nos botões − e +; ao digitar, o próprio campo já mostra o valor. */
  onChange: (quantity: number, announce: boolean) => void;
}

function QuantityStepper({ label, value, onChange }: QuantityStepperProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [shownValue, setShownValue] = useState(value);

  // Quantidade mudou por fora (botões, outra aba): o campo acompanha. Padrão do React para
  // ajustar estado a partir de props sem efeito.
  if (value !== shownValue) {
    setShownValue(value);
    setDraft(String(value));
  }

  return (
    <div className="order-stepper">
      <button
        type="button"
        aria-label={`Diminuir quantidade de ${label}`}
        aria-disabled={value <= 1}
        onClick={() => value > 1 && onChange(value - 1, true)}
      >
        −
      </button>
      <label htmlFor={id} className="visually-hidden">
        Quantidade de {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QUANTITY}
        step={1}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const quantity = parseQuantityInput(event.target.value);
          if (quantity !== undefined && quantity !== value) onChange(quantity, false);
        }}
        onBlur={() => setDraft(String(value))}
      />
      <button
        type="button"
        aria-label={`Aumentar quantidade de ${label}`}
        aria-disabled={value >= MAX_QUANTITY}
        onClick={() => value < MAX_QUANTITY && onChange(value + 1, true)}
      >
        +
      </button>
    </div>
  );
}
