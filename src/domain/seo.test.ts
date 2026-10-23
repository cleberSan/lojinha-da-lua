import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  centsToSchemaPrice,
  organizationJsonLd,
  productJsonLd,
  renderRobots,
  renderSitemap,
  serializeJsonLd,
  webSiteJsonLd,
} from "./seo";

const site = new URL("https://lojinha.exemplo");

describe("serializeJsonLd", () => {
  it("gera JSON válido que não fecha a tag script", () => {
    const data = { name: "</script><script>alert(1)</script> & <b>", note: "a\u2028b\u2029c" };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(serialized)).toEqual(data);
  });

  it("aceita uma lista de objetos", () => {
    expect(JSON.parse(serializeJsonLd([{ a: 1 }, { b: 2 }]))).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe("centsToSchemaPrice", () => {
  it.each([
    [7000, "70.00"],
    [4550, "45.50"],
    [5, "0.05"],
    [0, "0.00"],
  ])("%d centavos viram %s", (cents, expected) => {
    expect(centsToSchemaPrice(cents)).toBe(expected);
  });

  it.each([-1, 1.5, Number.NaN])("recusa %d", (cents) => {
    expect(() => centsToSchemaPrice(cents)).toThrow(RangeError);
  });
});

describe("organizationJsonLd e webSiteJsonLd", () => {
  it("descreve a loja com contato no formato internacional", () => {
    const data = organizationJsonLd({
      name: "Lojinha Da Lua",
      url: site.href,
      logoUrl: `${site.href}logo.png`,
      description: "Produtos personalizados.",
      sameAs: ["https://www.instagram.com/lojinhadalua___"],
      phone: "5511958877762",
    });
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Lojinha Da Lua",
      sameAs: ["https://www.instagram.com/lojinhadalua___"],
      contactPoint: { "@type": "ContactPoint", telephone: "+5511958877762" },
    });
  });

  it("descreve o site em português", () => {
    expect(webSiteJsonLd("Lojinha Da Lua", site.href)).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Lojinha Da Lua",
      url: "https://lojinha.exemplo/",
      inLanguage: "pt-BR",
    });
  });
});

describe("productJsonLd", () => {
  const base = {
    name: "Camiseta em DTF",
    description: "Camiseta com estampa em DTF.",
    url: "https://lojinha.exemplo/produtos/camiseta-dtf",
    category: "Camisetas",
    sellerName: "Lojinha Da Lua",
  };

  it("usa AggregateOffer quando as variações têm preços diferentes", () => {
    const data = productJsonLd({ ...base, pricesCents: [7000, 6000] });
    expect(data["offers"]).toEqual({
      "@type": "AggregateOffer",
      lowPrice: "60.00",
      highPrice: "70.00",
      offerCount: 2,
      priceCurrency: "BRL",
      url: base.url,
      seller: { "@type": "Organization", name: "Lojinha Da Lua" },
    });
    expect(data).not.toHaveProperty("image");
  });

  it("usa Offer simples com preço único e inclui a foto quando houver", () => {
    const data = productJsonLd({
      ...base,
      pricesCents: [7000],
      imageUrl: "https://lojinha.exemplo/_astro/polo.jpg",
    });
    expect(data["offers"]).toMatchObject({
      "@type": "Offer",
      price: "70.00",
      priceCurrency: "BRL",
    });
    expect(data["image"]).toEqual(["https://lojinha.exemplo/_astro/polo.jpg"]);
  });

  it("recusa produto sem preço", () => {
    expect(() => productJsonLd({ ...base, pricesCents: [] })).toThrow(RangeError);
  });
});

describe("breadcrumbJsonLd", () => {
  it("numera os itens a partir de 1", () => {
    const data = breadcrumbJsonLd([
      { name: "Início", url: "https://lojinha.exemplo/" },
      { name: "Canecas", url: "https://lojinha.exemplo/produtos#canecas" },
    ]);
    expect(data["itemListElement"]).toEqual([
      { "@type": "ListItem", position: 1, name: "Início", item: "https://lojinha.exemplo/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Canecas",
        item: "https://lojinha.exemplo/produtos#canecas",
      },
    ]);
  });
});

describe("renderSitemap e renderRobots", () => {
  it("lista URLs absolutas, sem repetição e em ordem", () => {
    expect(renderSitemap(site, ["/produtos", "/", "/produtos"])).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url><loc>https://lojinha.exemplo/</loc></url>",
        "  <url><loc>https://lojinha.exemplo/produtos</loc></url>",
        "</urlset>",
        "",
      ].join("\n"),
    );
  });

  it("escapa caracteres especiais de XML", () => {
    expect(renderSitemap(site, ["/a&b'c\"<>"])).toContain(
      "<loc>https://lojinha.exemplo/a&amp;b&apos;c%22%3C%3E</loc>",
    );
  });

  it("aponta o sitemap no robots.txt só quando o endereço é conhecido", () => {
    expect(renderRobots(site)).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://lojinha.exemplo/sitemap.xml\n",
    );
    expect(renderRobots(undefined)).toBe("User-agent: *\nAllow: /\n");
  });
});
