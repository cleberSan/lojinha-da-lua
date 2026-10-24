import { expect, test } from "./fixtures";
import { orderPhone, productSlugs } from "./routes";

const nbsp = " ";

function whatsappMessage(href: string | null): string {
  expect(href).not.toBeNull();
  const url = new URL(href!);
  expect(url.origin).toBe("https://wa.me");
  expect(url.pathname).toBe(`/${orderPhone}`);
  return url.searchParams.get("text") ?? "";
}

test("o catálogo mostra os produtos agrupados em camisetas e canecas", async ({ page }) => {
  await page.goto("/produtos");
  const camisetas = page.getByRole("region", { name: "Camisetas" });
  const canecas = page.getByRole("region", { name: "Canecas" });
  await expect(camisetas.getByRole("article")).toHaveCount(4);
  await expect(canecas.getByRole("article")).toHaveCount(4);
  await expect(page.getByRole("article")).toHaveCount(productSlugs.length);
  await expect(camisetas.getByRole("article").first()).toContainText(`a partir de R$${nbsp}40,00`);
});

test("do início até o pedido de um produto com variações", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Ver produtos" }).click();
  await expect(page).toHaveURL(/\/produtos$/);

  await page.getByRole("link", { name: "Camiseta em DTF", exact: true }).click();
  await expect(page).toHaveURL(/\/produtos\/camiseta-dtf$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Camiseta em DTF");

  const order = page.getByRole("link", { name: /Pedir Estampa A3/ });
  await expect(order).toHaveAttribute("target", "_blank");
  expect(whatsappMessage(await order.getAttribute("href"))).toBe(
    [
      "Olá, Lojinha Da Lua! Vim pelo site e quero fazer um pedido:",
      `- 1x Camiseta em DTF (Estampa A3): R$${nbsp}70,00 cada`,
      `Total de referência: R$${nbsp}70,00`,
    ].join("\n"),
  );
});

test("produto de preço único pede sem variação na mensagem", async ({ page }) => {
  await page.goto("/produtos/caneca-magica");
  await expect(page.getByText(`R$${nbsp}50,00`).first()).toBeVisible();
  const message = whatsappMessage(
    await page.getByRole("link", { name: /^Pedir/ }).getAttribute("href"),
  );
  expect(message).toContain(`- 1x Caneca mágica: R$${nbsp}50,00 cada`);
});

test("ilustrações são identificadas e fotos não", async ({ page }) => {
  await page.goto("/produtos/caneca-coracao");
  await expect(page.getByText("Ilustração do modelo: não é foto do produto.")).toBeVisible();

  await page.goto("/produtos/camiseta-sublimacao");
  await expect(page.getByText("Ilustração do modelo: não é foto do produto.")).toHaveCount(0);
  await expect(
    page.getByText("Sublimação somente em camisetas de poliéster, em qualquer cor, exceto preta."),
  ).toBeVisible();
});

test("o rodapé lista os dois WhatsApp e o Instagram da loja", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: /\(11\) 95887-7762/ })).toHaveAttribute(
    "href",
    "https://wa.me/5511958877762",
  );
  await expect(footer.getByRole("link", { name: /\(11\) 99824-1075/ })).toHaveAttribute(
    "href",
    "https://wa.me/5511998241075",
  );
  await expect(footer.getByRole("link", { name: /@lojinhadalua___/ })).toHaveAttribute(
    "href",
    "https://www.instagram.com/lojinhadalua___",
  );
});

test("a página de contato lista os dois WhatsApp e o Instagram", async ({ page }) => {
  await page.goto("/contato");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /Atendimento no WhatsApp/ })).toHaveAttribute(
    "href",
    "https://wa.me/5511958877762",
  );
  await expect(main.getByRole("link", { name: /Luiz no WhatsApp/ })).toHaveAttribute(
    "href",
    "https://wa.me/5511998241075",
  );
  await expect(main.getByText("Recebe os pedidos enviados pelo site.")).toHaveCount(1);
  await expect(main.getByRole("link", { name: /Abrir o Instagram/ })).toHaveAttribute(
    "href",
    "https://www.instagram.com/lojinhadalua___",
  );
});

test("o crédito do rodapé leva ao portfólio do autor e ao código", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: /^Cleber Costa Santos/ })).toHaveAttribute(
    "href",
    "https://portfolio-web-psi-rust.vercel.app/",
  );
  await expect(footer.getByRole("link", { name: /^Código no GitHub/ })).toHaveAttribute(
    "href",
    "https://github.com/cleberSan/lojinha-da-lua",
  );
});

test("o menu leva a Meu pedido e Contato, e o rodapé à Privacidade", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Principal" });
  await nav.getByRole("link", { name: "Meu pedido" }).click();
  await expect(page).toHaveURL(/\/pedido$/);
  await expect(nav.getByRole("link", { name: "Meu pedido" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await nav.getByRole("link", { name: "Contato" }).click();
  await expect(page).toHaveURL(/\/contato$/);

  await page.getByRole("contentinfo").getByRole("link", { name: "Privacidade" }).click();
  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacidade");
});
