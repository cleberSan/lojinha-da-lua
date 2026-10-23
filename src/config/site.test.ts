import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  isIndexable,
  noindexPaths,
  parseSiteUrl,
  productionSiteUrl,
  publicPath,
  siteUrlFromEnv,
} from "./site";

describe("parseSiteUrl", () => {
  it("aceita a origem em https", () => {
    expect(parseSiteUrl("https://lojinha-da-lua.exemplo.workers.dev")?.origin).toBe(
      "https://lojinha-da-lua.exemplo.workers.dev",
    );
    expect(parseSiteUrl("https://lojinhadalua.com.br/")?.href).toBe("https://lojinhadalua.com.br/");
  });

  it("aceita http só no próprio computador, para os testes E2E", () => {
    expect(parseSiteUrl("http://127.0.0.1:8787")?.port).toBe("8787");
    expect(parseSiteUrl("http://localhost:4321")?.hostname).toBe("localhost");
  });

  it.each([undefined, "", "  "])("sem valor (%j) não define endereço", (value) => {
    expect(parseSiteUrl(value)).toBeUndefined();
  });

  it.each([
    ["texto que não é URL", "lojinha"],
    ["http fora do computador local", "http://lojinhadalua.com.br"],
    ["outro protocolo", "ftp://lojinhadalua.com.br"],
    ["javascript:", "javascript:alert(1)"],
    ["caminho", "https://lojinhadalua.com.br/loja"],
    ["query", "https://lojinhadalua.com.br/?utm=1"],
    ["fragmento", "https://lojinhadalua.com.br/#topo"],
    ["credenciais", "https://user:senha@lojinhadalua.com.br"],
  ])("recusa %s", (_case, value) => {
    expect(() => parseSiteUrl(value)).toThrow(/SITE_URL/);
  });
});

describe("productionSiteUrl", () => {
  it("é uma origem válida em https", () => {
    expect(parseSiteUrl(productionSiteUrl)?.origin).toBe(productionSiteUrl);
    expect(productionSiteUrl).toMatch(/^https:\/\//);
  });

  it("é o mesmo endereço que o workflow Site no ar confere", async () => {
    const workflow = await readFile(
      new URL("../../.github/workflows/producao.yml", import.meta.url),
      "utf8",
    );
    const configured = /^\s*E2E_BASE_URL:\s*(\S+)\s*$/m.exec(workflow)?.[1];
    expect(configured, "E2E_BASE_URL em .github/workflows/producao.yml").toBe(productionSiteUrl);
  });
});

describe("siteUrlFromEnv", () => {
  const local = "http://127.0.0.1:8787";

  it.each([{}, { SITE_URL: "" }, { SITE_URL: "  " }, { WORKERS_CI: "1" }])(
    "sem SITE_URL (%j) usa o endereço de produção, inclusive no build da Cloudflare",
    (env) => {
      expect(siteUrlFromEnv(env).origin).toBe(productionSiteUrl);
    },
  );

  it("fora da Cloudflare, a SITE_URL troca o endereço para os testes E2E", () => {
    expect(siteUrlFromEnv({ SITE_URL: local }).origin).toBe(local);
    expect(siteUrlFromEnv({ SITE_URL: local, WORKERS_CI: "0" }).origin).toBe(local);
  });

  it("no build da Cloudflare, aceita a SITE_URL igual ao endereço de produção", () => {
    expect(siteUrlFromEnv({ SITE_URL: `${productionSiteUrl}/`, WORKERS_CI: "1" }).origin).toBe(
      productionSiteUrl,
    );
  });

  it("no build da Cloudflare, SITE_URL diferente do código quebra o build", () => {
    expect(() =>
      siteUrlFromEnv({ SITE_URL: "https://outro.exemplo.workers.dev", WORKERS_CI: "1" }),
    ).toThrow(/difere do endereço em src\/config\/site.ts/);
  });

  it("valor inválido quebra o build em qualquer ambiente", () => {
    expect(() => siteUrlFromEnv({ SITE_URL: "http://lojinha.com.br" })).toThrow(/https/);
    expect(() => siteUrlFromEnv({ SITE_URL: "http://lojinha.com.br", WORKERS_CI: "1" })).toThrow(
      /https/,
    );
  });

  it("devolve uma URL nova a cada chamada", () => {
    const first = siteUrlFromEnv({});
    first.hostname = "alterado.exemplo";
    expect(siteUrlFromEnv({}).origin).toBe(productionSiteUrl);
  });
});

describe("publicPath", () => {
  it.each([
    ["", "/"],
    ["/", "/"],
    ["index.html", "/"],
    ["/index", "/"],
    ["produtos", "/produtos"],
    ["/produtos.html", "/produtos"],
    ["/produtos/", "/produtos"],
    ["produtos/camiseta-dtf", "/produtos/camiseta-dtf"],
    ["produtos/index", "/produtos"],
    ["404", "/404"],
    ["/404.html", "/404"],
    ["//produtos", "/produtos"],
    ["/minhaindex", "/minhaindex"],
  ])("%j vira %j", (input, expected) => {
    expect(publicPath(input)).toBe(expected);
  });
});

describe("isIndexable", () => {
  it("tira do índice o pedido e o 404, em qualquer grafia", () => {
    expect(noindexPaths).toEqual(["/404", "/pedido"]);
    expect(isIndexable("/pedido")).toBe(false);
    expect(isIndexable("pedido.html")).toBe(false);
    expect(isIndexable("/404.html")).toBe(false);
  });

  it("mantém as demais páginas", () => {
    expect(isIndexable("/")).toBe(true);
    expect(isIndexable("/produtos/caneca-magica")).toBe(true);
    expect(isIndexable("/privacidade")).toBe(true);
  });
});
