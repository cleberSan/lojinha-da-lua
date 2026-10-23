import AxeBuilder from "@axe-core/playwright";
import { expect, loadAllImages, test } from "./fixtures";
import { routes } from "./routes";

for (const route of routes) {
  test.describe(`página ${route}`, () => {
    test("abre com título, h1 e imagens carregadas", async ({ page, consoleErrors }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(/Lojinha Da Lua/);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{20,}/);
      await loadAllImages(page);
      expect(consoleErrors).toEqual([]);
    });

    test("não tem violações de acessibilidade (axe, WCAG 2.1 AA)", async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test("abre links externos em outra aba, só em https e sem vazar a origem", async ({ page }) => {
      await page.goto(route);
      const external = page.locator('a[href^="http"]');
      expect(await external.count()).toBeGreaterThan(0);
      for (const link of await external.all()) {
        await expect(link).toHaveAttribute("href", /^https:\/\//);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    });
  });
}

test("o link de pular navegação leva ao conteúdo", async ({ page, isMobile }) => {
  test.skip(isMobile, "Navegação por teclado só no desktop.");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
