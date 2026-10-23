import { describe, expect, it } from "vitest";
import { isIndexable, noindexPaths, parseSiteUrl, publicPath } from "./site";

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
