import { test as base, expect, type Page } from "@playwright/test";

/**
 * Falha o teste se o navegador registrar erro no console (violações de CSP aparecem assim)
 * ou se alguma requisição sair da própria origem.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page, baseURL }, use) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && url.origin !== baseURL) {
        errors.push(`Requisição para outra origem: ${url.origin}`);
      }
    });
    await use(errors);
    expect(errors).toEqual([]);
  },
});

export { expect };

/** Rola até o fim para carregar as imagens com loading="lazy". */
export async function loadAllImages(page: Page): Promise<void> {
  const images = page.locator("img");
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
  }
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0)
            .length,
      ),
    )
    .toBe(0);
}
