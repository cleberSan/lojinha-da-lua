import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 8787);
const isCI = Boolean(process.env.CI);

// Conferência do site no ar (ADR-0008): com E2E_BASE_URL, a mesma suíte roda contra o
// endereço publicado, sem subir o servidor local.
const remoteURL = process.env.E2E_BASE_URL ? new URL(process.env.E2E_BASE_URL) : undefined;
if (remoteURL && remoteURL.protocol !== "https:") {
  throw new Error(`E2E_BASE_URL precisa usar https: ${remoteURL.href}`);
}
const baseURL = remoteURL?.origin ?? `http://127.0.0.1:${port}`;

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
  ...(remoteURL
    ? {}
    : {
        webServer: {
          command: `npx wrangler dev --ip 127.0.0.1 --port ${port} --log-level warn`,
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 120_000,
          env: { WRANGLER_SEND_METRICS: "false" },
        },
      }),
});
