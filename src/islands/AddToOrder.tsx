import { type SubmitEvent, useId, useMemo, useRef, useState } from "react";
import { formatBRL } from "../domain/money";
import {
  addItem,
  countUnits,
  createOrderCatalog,
  formatUnits,
  MAX_ORDER_ITEMS,
  type OrderCatalogEntry,
  parseQuantityInput,
  toOrderLine,
} from "../domain/order";
import { lineName, MAX_QUANTITY } from "../domain/whatsapp";
import { storeOrder, useStoredOrder } from "./useStoredOrder";
import "./order.css";

interface Props {
  /** Catálogo inteiro: o pedido salvo pode ter itens de outros produtos. */
  catalog: OrderCatalogEntry[];
  slug: string;
}

type Feedback = { tone: "success" | "warning"; text: string };

/**
 * "Montar pedido" da página do produto (ADR-0006): escolhe a variação e a quantidade e junta
 * ao pedido salvo no aparelho. Sem JavaScript, os botões "Pedir" da página continuam valendo.
 */
export default function AddToOrder({ catalog: entries, slug }: Props) {
  const catalog = useMemo(() => createOrderCatalog(entries), [entries]);
  const product = catalog.get(slug);
  const order = useStoredOrder(catalog);
  const id = useId();
  const quantityRef = useRef<HTMLInputElement>(null);
  const [variantLabel, setVariantLabel] = useState(product?.variants[0]?.label ?? "");
  const [quantity, setQuantity] = useState("1");
  const [quantityError, setQuantityError] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();

  // O slug vem do mesmo catálogo no build: se não estiver lá, o build quebra aqui.
  if (!product) throw new Error(`Produto fora do catálogo do pedido: ${slug}`);

  const ready = order.status === "ready";
  const units = ready ? countUnits(order.items) : 0;
  const errorId = `${id}-erro`;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (order.status !== "ready" || !product) return;

    const parsed = parseQuantityInput(quantity);
    if (parsed === undefined) {
      setQuantityError(true);
      setFeedback(undefined);
      quantityRef.current?.focus();
      return;
    }
    setQuantityError(false);

    const variant = product.variants.find((option) => option.label === variantLabel)!;
    const name = lineName(toOrderLine(product, variant, parsed));
    const result = addItem(order.items, { slug, variant: variantLabel, quantity: parsed }, catalog);

    if (result.status === "invalid") {
      setFeedback({ tone: "warning", text: "Não foi possível adicionar este item." });
    } else if (result.status === "full") {
      setFeedback({
        tone: "warning",
        text: `Seu pedido já tem ${MAX_ORDER_ITEMS} itens diferentes. Envie esse pedido e comece outro.`,
      });
    } else if (!storeOrder(result.items)) {
      setFeedback({
        tone: "warning",
        text: "Este navegador não deixou guardar o pedido. Use os botões Pedir acima.",
      });
    } else if (result.status === "capped") {
      setFeedback({
        tone: "warning",
        text: `${name} chegou ao limite de ${MAX_QUANTITY} unidades no pedido.`,
      });
    } else {
      setFeedback({ tone: "success", text: `Adicionado ao pedido: ${parsed}x ${name}.` });
    }
  }

  return (
    <section className="order-panel" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="order-panel-title">
        Montar pedido
      </h2>
      <p className="order-panel-intro">
        Junte este e outros produtos e envie tudo numa mensagem só pelo WhatsApp.
      </p>

      {order.status === "unavailable" ? (
        <p className="order-notice">
          Este navegador não deixa guardar o pedido no aparelho. Use os botões Pedir acima.
        </p>
      ) : (
        <form className="order-form" onSubmit={handleSubmit} noValidate>
          {product.variants.length > 1 && (
            <fieldset className="order-variants" disabled={!ready}>
              <legend>Opção</legend>
              {product.variants.map((option) => (
                <label key={option.label} className="order-variant">
                  <input
                    type="radio"
                    name={`${id}-variacao`}
                    value={option.label}
                    checked={variantLabel === option.label}
                    onChange={() => setVariantLabel(option.label)}
                  />
                  <span>{option.label}</span>
                  <span className="price">{formatBRL(option.priceCents)}</span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="order-quantity">
            <label htmlFor={`${id}-quantidade`}>Quantidade</label>
            <input
              ref={quantityRef}
              id={`${id}-quantidade`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_QUANTITY}
              step={1}
              value={quantity}
              disabled={!ready}
              aria-invalid={quantityError || undefined}
              aria-describedby={quantityError ? errorId : undefined}
              onChange={(event) => setQuantity(event.target.value)}
            />
            {quantityError && (
              <p id={errorId} className="order-error">
                Informe uma quantidade de 1 a {MAX_QUANTITY}.
              </p>
            )}
          </div>

          <button type="submit" className="button button-primary" disabled={!ready}>
            Adicionar ao pedido
          </button>
        </form>
      )}

      <p role="status" className={`order-feedback order-feedback-${feedback?.tone ?? "none"}`}>
        {feedback?.text}
      </p>
      {units > 0 && (
        <a className="order-panel-link" href="/pedido">
          Ver meu pedido ({formatUnits(units)})
        </a>
      )}
    </section>
  );
}
