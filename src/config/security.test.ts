import { describe, expect, it } from "vitest";
import { headerCsp, metaCspDirectives, renderHeadersFile, securityHeaders } from "./security";

describe("CSP", () => {
  it("não libera script nem estilo inline por 'unsafe-inline' ou 'unsafe-eval'", () => {
    const all = [...metaCspDirectives, headerCsp].join("; ");
    expect(all).not.toMatch(/unsafe-(inline|eval)/);
  });

  it("restringe tudo à própria origem por padrão", () => {
    expect(metaCspDirectives).toContain("default-src 'self'");
    expect(metaCspDirectives).toContain("object-src 'none'");
    expect(metaCspDirectives).toContain("form-action 'none'");
  });

  it("leva ao cabeçalho as diretivas que o <meta> ignora", () => {
    expect(headerCsp).toContain("frame-ancestors 'none'");
    // Sem script-src/default-src no cabeçalho: os hashes do <meta> decidem os scripts.
    expect(headerCsp).not.toMatch(/script-src|style-src|default-src/);
  });
});

describe("renderHeadersFile", () => {
  const file = renderHeadersFile();

  it("aplica os cabeçalhos de segurança a todas as rotas", () => {
    const [allRoutes] = file.split("\n\n");
    expect(allRoutes?.startsWith("/*\n")).toBe(true);
    for (const [name, value] of Object.entries(securityHeaders)) {
      expect(allRoutes).toContain(`  ${name}: ${value}`);
    }
  });

  it("deixa os arquivos com hash em cache por um ano", () => {
    expect(file).toContain("/_astro/*\n  Cache-Control: public, max-age=31536000, immutable");
  });

  it("termina com quebra de linha", () => {
    expect(file.endsWith("\n")).toBe(true);
  });
});
