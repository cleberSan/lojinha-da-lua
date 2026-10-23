import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 8787);
const baseURL = `http://127.0.0.1:${port}`;
const isCI = Boolean(process.env.CI);

// Permite usar um Chromium já instalado na máquina (por exemplo, em containers sem acesso
// ao download do Playwright). No CI o navegador vem de `npx playwright install`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "pt-BR",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Serve o build (dist/) com o mesmo runtime da Cloudflare (workerd), aplicando o _headers
  // e o tratamento de 404 e de barra final de produção (ADR-0002).
  webServer: {
    command: `npx wrangler dev --ip 127.0.0.1 --port ${port} --log-level warn`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { WRANGLER_SEND_METRICS: "false" },
  },
});
