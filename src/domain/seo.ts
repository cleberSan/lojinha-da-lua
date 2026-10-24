/**
 * Metadados para buscadores e para a prévia de links (ADR-0007): JSON-LD, sitemap e
 * robots.txt. Funções puras; quem chama passa URLs absolutas já resolvidas.
 */

type JsonLd = Record<string, unknown>;

const schemaContext = "https://schema.org";

/**
 * JSON pronto para ir dentro de `<script type="application/ld+json">`. Escapa `<`, `>` e `&`
 * para que nenhum texto do catálogo consiga fechar a tag (`</script>`), e os separadores de
 * linha U+2028 e U+2029, que quebram alguns analisadores.
 */
export function serializeJsonLd(data: JsonLd | readonly JsonLd[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Preço em centavos como o schema.org espera: "70.00". */
export function centsToSchemaPrice(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError(`Preço inválido em centavos: ${cents}`);
  }
  return (cents / 100).toFixed(2);
}

export interface OrganizationInput {
  name: string;
  url: string;
  logoUrl: string;
  description: string;
  sameAs: readonly string[];
  /** WhatsApp que recebe os pedidos, no formato 55DD9XXXXXXXX. */
  phone: string;
}

export function organizationJsonLd(input: OrganizationInput): JsonLd {
  return {
    "@context": schemaContext,
    "@type": "Organization",
    name: input.name,
    url: input.url,
    logo: input.logoUrl,
    description: input.description,
    sameAs: [...input.sameAs],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${input.phone}`,
      contactType: "customer service",
      availableLanguage: "pt-BR",
    },
  };
}

export function webSiteJsonLd(name: string, url: string): JsonLd {
  return { "@context": schemaContext, "@type": "WebSite", name, url, inLanguage: "pt-BR" };
}

export interface ProductInput {
  name: string;
  description: string;
  url: string;
  category: string;
  /** Só fotos da loja: ilustração provisória não representa o produto (ADR-0009). */
  imageUrl?: string | undefined;
  sellerName: string;
  pricesCents: readonly number[];
}

/**
 * Produto com oferta em reais. Sem `availability`: a loja não publica estoque, e o
 * schema.org não exige o campo.
 */
export function productJsonLd(input: ProductInput): JsonLd {
  if (input.pricesCents.length === 0) {
    throw new RangeError(`Produto sem preço: ${input.name}`);
  }
  const low = Math.min(...input.pricesCents);
  const high = Math.max(...input.pricesCents);
  const seller = { "@type": "Organization", name: input.sellerName };
  const offers =
    low === high
      ? {
          "@type": "Offer",
          price: centsToSchemaPrice(low),
          priceCurrency: "BRL",
          url: input.url,
          seller,
        }
      : {
          "@type": "AggregateOffer",
          lowPrice: centsToSchemaPrice(low),
          highPrice: centsToSchemaPrice(high),
          offerCount: input.pricesCents.length,
          priceCurrency: "BRL",
          url: input.url,
          seller,
        };

  return {
    "@context": schemaContext,
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.url,
    category: input.category,
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
    offers,
  };
}

export function breadcrumbJsonLd(items: readonly { name: string; url: string }[]): JsonLd {
  return {
    "@context": schemaContext,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** sitemap.xml com os caminhos públicos, em ordem alfabética para um diff estável. */
export function renderSitemap(site: URL, paths: readonly string[]): string {
  const urls = [...new Set(paths)]
    .sort()
    .map((path) => `  <url><loc>${escapeXml(new URL(path, site).href)}</loc></url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/** robots.txt liberando tudo; o sitemap só entra quando o endereço do site é conhecido. */
export function renderRobots(site: URL | undefined): string {
  const lines = ["User-agent: *", "Allow: /"];
  if (site) lines.push("", `Sitemap: ${new URL("/sitemap.xml", site).href}`);
  return `${lines.join("\n")}\n`;
}
