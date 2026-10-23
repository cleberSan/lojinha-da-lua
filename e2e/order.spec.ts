import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { orderPhone } from "./routes";

const nbsp = "\u00a0";
const storageKey = "lojinha-da-lua:pedido";
const greeting = "Olá, Lojinha Da Lua! Vim pelo site e quero fazer um pedido:";

function whatsappMessage(href: string | null): string {
  expect(href).not.toBeNull();
  const url = new URL(href!);
  expect(url.origin).toBe("https://wa.me");
  expect(url.pathname).toBe(`/${orderPhone}`);
  return url.searchParams.get("text") ?? "";
}

async function seedOrder(page: Page, value: unknown): Promise<void> {
  await page.goto("/pedido");
  await page.evaluate(
    ([key, raw]) => localStorage.setItem(key!, raw!),
    [storageKey, typeof value === "string" ? value : JSON.stringify(value)],
  );
  await page.reload();
}

/** O painel hidrata quando aparece na tela (client:visible), como acontece com quem rola. */
async function orderPanel(page: Page) {
  const panel = page.getByRole("region", { name: "Montar pedido" });
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.getByRole("button", { name: "Adicionar ao pedido" })).toBeEnabled();
  return panel;
}

const orderLines = (page: Page) =>
  page.getByRole("listitem").filter({ has: page.getByRole("button", { name: /^Remover/ }) });

const sendLink = (page: Page) => page.getByRole("link", { name: /Enviar pedido pelo WhatsApp/ });

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test("monta um pedido com vários produtos e envia tudo numa mensagem", async ({
  page,
  consoleErrors,
}) => {
  await page.goto("/produtos/camiseta-dtf");
  const panel = await orderPanel(page);
  await panel.getByRole("radio", { name: /Estampa A3/ }).check();
  await panel.getByLabel("Quantidade", { exact: true }).fill("2");
  await panel.getByRole("button", { name: "Adicionar ao pedido" }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Adicionado ao pedido: 2x Camiseta em DTF (Estampa A3).",
  );
  await expectNoAxeViolations(page);

  await page.goto("/produtos/caneca-magica");
  const mugPanel = await orderPanel(page);
  await expect(mugPanel.getByRole("radio")).toHaveCount(0);
  await mugPanel.getByRole("button", { name: "Adicionar ao pedido" }).click();
  await expect(mugPanel.getByRole("status")).toHaveText("Adicionado ao pedido: 1x Caneca mágica.");
  await mugPanel.getByRole("link", { name: "Ver meu pedido (3 itens)" }).click();

  await expect(page).toHaveURL(/\/pedido$/);
  await expect(page.getByRole("heading", { name: /Itens do pedido/ })).toHaveText(
    "Itens do pedido (3 itens)",
  );
  await expect(orderLines(page)).toHaveCount(2);
  await expect(page.getByText(`R$${nbsp}190,00`, { exact: true })).toBeVisible();
  await expect(sendLink(page)).toHaveAttribute("target", "_blank");
  await expect(sendLink(page)).toHaveAttribute("rel", "noopener noreferrer");
  expect(whatsappMessage(await sendLink(page).getAttribute("href"))).toBe(
    [
      greeting,
      `- 2x Camiseta em DTF (Estampa A3): R$${nbsp}70,00 cada`,
      `- 1x Caneca mágica: R$${nbsp}50,00 cada`,
      `Total de referência: R$${nbsp}190,00`,
    ].join("\n"),
  );
  await expectNoAxeViolations(page);
  expect(consoleErrors).toEqual([]);
});

test("a mesma variação soma na linha existente", async ({ page }) => {
  await page.goto("/produtos/caneca-comum");
  const panel = await orderPanel(page);
  const add = panel.getByRole("button", { name: "Adicionar ao pedido" });
  await add.click();
  await expect(panel.getByRole("status")).toHaveText("Adicionado ao pedido: 1x Caneca comum.");
  await panel.getByLabel("Quantidade", { exact: true }).fill("3");
  await add.click();
  await expect(panel.getByRole("link", { name: "Ver meu pedido (4 itens)" })).toBeVisible();

  await page.goto("/pedido");
  await expect(orderLines(page)).toHaveCount(1);
  await expect(page.getByLabel("Quantidade de Caneca comum", { exact: true })).toHaveValue("4");
});

test("quantidade inválida no produto mostra o erro e não mexe no pedido", async ({ page }) => {
  await page.goto("/produtos/camiseta-sublimacao");
  const panel = await orderPanel(page);
  const quantity = panel.getByLabel("Quantidade", { exact: true });
  for (const value of ["0", "100", "1.5"]) {
    await quantity.fill(value);
    await panel.getByRole("button", { name: "Adicionar ao pedido" }).click();
    await expect(panel.getByText("Informe uma quantidade de 1 a 99.")).toBeVisible();
    await expect(quantity).toHaveAttribute("aria-invalid", "true");
    await expect(quantity).toBeFocused();
  }
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
});

test("na página Meu pedido dá para mudar quantidades, remover e esvaziar", async ({
  page,
  consoleErrors,
}) => {
  await seedOrder(page, {
    version: 1,
    items: [
      { slug: "camiseta-dtf", variant: "Estampa A4", quantity: 1 },
      { slug: "caneca-coracao", variant: "Unidade", quantity: 2 },
    ],
  });
  const shirt = "Camiseta em DTF (Estampa A4)";

  await expect(
    page.getByRole("button", { name: `Diminuir quantidade de ${shirt}` }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: `Aumentar quantidade de ${shirt}` }).click();
  await expect(page.getByLabel(`Quantidade de ${shirt}`, { exact: true })).toHaveValue("2");
  await expect(page.getByText(`Quantidade de ${shirt}: 2.`)).toBeAttached();
  await expect(page.getByText(`R$${nbsp}216,00`, { exact: true })).toBeVisible();

  const mugQuantity = page.getByLabel("Quantidade de Caneca coração", { exact: true });
  await mugQuantity.fill("5");
  await mugQuantity.blur();
  await expect(page.getByText(`R$${nbsp}360,00`, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Quantidade de Caneca coração", { exact: true })).toHaveValue("5");

  // Valor inválido digitado volta ao último válido ao sair do campo.
  await page.getByLabel("Quantidade de Caneca coração", { exact: true }).fill("0");
  await page.getByLabel("Quantidade de Caneca coração", { exact: true }).blur();
  await expect(page.getByLabel("Quantidade de Caneca coração", { exact: true })).toHaveValue("5");

  await page.getByRole("button", { name: `Remover ${shirt}` }).click();
  await expect(orderLines(page)).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /Itens do pedido/ })).toBeFocused();
  await expect(page.getByText(`${shirt} saiu do pedido.`)).toBeAttached();

  await page.getByRole("button", { name: "Esvaziar pedido" }).click();
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(orderLines(page)).toHaveCount(1);

  await page.getByRole("button", { name: "Esvaziar pedido" }).click();
  await page.getByRole("button", { name: "Sim, esvaziar" }).click();
  await expect(page.getByRole("heading", { name: "Seu pedido está vazio" })).toBeFocused();
  await expect(sendLink(page)).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
  await expectNoAxeViolations(page);
  expect(consoleErrors).toEqual([]);
});

test("pedido salvo adulterado: preço vem do catálogo e o que não confere sai", async ({ page }) => {
  await seedOrder(page, {
    version: 1,
    items: [
      { slug: "caneca-magica", variant: "Unidade", quantity: 1, priceCents: 1 },
      { slug: "produto-que-saiu", variant: "Unidade", quantity: 1 },
      { slug: "camiseta-dtf", variant: "Estampa A5", quantity: 1 },
      { slug: "caneca-comum", variant: "Unidade", quantity: 1000 },
      { slug: "__proto__", variant: "Unidade", quantity: 1 },
      { slug: "<img src=x onerror=alert(1)>", variant: "Unidade", quantity: 1 },
    ],
  });

  await expect(
    page.getByText("5 itens do seu pedido saíram do catálogo ou mudaram e foram retirados."),
  ).toBeVisible();
  await expect(orderLines(page)).toHaveCount(1);
  expect(whatsappMessage(await sendLink(page).getAttribute("href"))).toBe(
    [
      greeting,
      `- 1x Caneca mágica: R$${nbsp}50,00 cada`,
      `Total de referência: R$${nbsp}50,00`,
    ].join("\n"),
  );
});

test("conteúdo salvo ilegível vira pedido vazio, sem erro na tela", async ({
  page,
  consoleErrors,
}) => {
  await seedOrder(page, "{isso não é JSON");
  await expect(page.getByRole("heading", { name: "Seu pedido está vazio" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("o pedido acompanha mudanças feitas em outra aba", async ({ page, context }) => {
  await page.goto("/pedido");
  await expect(page.getByRole("heading", { name: "Seu pedido está vazio" })).toBeVisible();

  const other = await context.newPage();
  await other.goto("/produtos/caneca-colorida");
  await (await orderPanel(other)).getByRole("button", { name: "Adicionar ao pedido" }).click();
  await expect(other.getByRole("status")).toHaveText("Adicionado ao pedido: 1x Caneca colorida.");

  await expect(orderLines(page)).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Caneca colorida" })).toBeVisible();
});

test.describe("navegador que bloqueia o armazenamento local", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("bloqueado", "SecurityError");
        },
      });
    });
  });

  test("avisa no produto e no pedido, e os botões Pedir continuam funcionando", async ({
    page,
  }) => {
    await page.goto("/produtos/caneca-magica");
    const panel = page.getByRole("region", { name: "Montar pedido" });
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.getByText(/não deixa guardar o pedido/)).toBeVisible();
    await expect(panel.getByRole("button", { name: "Adicionar ao pedido" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Pedir/ })).toBeVisible();

    await page.goto("/pedido");
    await expect(page.getByText(/não deixa guardar o pedido/)).toBeVisible();
  });
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("o produto mantém o pedido direto e Meu pedido explica o que fazer", async ({ page }) => {
    await page.goto("/produtos/camiseta-dtf");
    await expect(page.getByRole("link", { name: /Pedir Estampa A3/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar ao pedido" })).toBeDisabled();
    await expect(page.getByText(/Para juntar vários produtos num pedido só/)).toBeVisible();

    await page.goto("/pedido");
    await expect(page.getByText(/Para montar o pedido aqui, ative o JavaScript/)).toBeVisible();
  });
});
