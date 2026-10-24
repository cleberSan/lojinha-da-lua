import { z } from "astro/zod";

export const categories = {
  camisetas: { name: "Camisetas", order: 1 },
  canecas: { name: "Canecas", order: 2 },
} as const;

export type CategoryId = keyof typeof categories;

const categoryIds = Object.keys(categories) as [CategoryId, ...CategoryId[]];

/**
 * Schema de um produto do catálogo. Recebe o schema da imagem porque, no Astro, ele vem do
 * helper `image()` da coleção; nos testes, um caminho em texto basta.
 *
 * Um preço, slug ou variação fora do formato quebra o build, nunca o site no ar.
 */
export function createProductSchema<TImage extends z.ZodType>(imageSchema: TImage) {
  return z
    .object({
      name: z.string().min(3).max(60),
      category: z.enum(categoryIds),
      technique: z.enum(["Sublimação", "DTF"]).optional(),
      summary: z.string().min(10).max(160),
      image: z.object({
        src: imageSchema,
        alt: z.string().min(10).max(160),
        /** "foto" é imagem da loja; "ilustracao" é desenho provisório, a volta caso uma estampa saia do ar (ADR-0009). */
        kind: z.enum(["foto", "ilustracao"]),
      }),
      variants: z
        .array(
          z.object({
            label: z.string().min(1).max(40),
            priceCents: z.number().int().positive().max(1_000_000),
          }),
        )
        .min(1),
      notes: z.array(z.string().min(5).max(200)).default([]),
      order: z.number().int().nonnegative(),
    })
    .refine(
      (product) =>
        new Set(product.variants.map((variant) => variant.label)).size === product.variants.length,
      { message: "Variações repetidas no mesmo produto.", path: ["variants"] },
    );
}

export interface CatalogProduct {
  id: string;
  data: {
    name: string;
    category: CategoryId;
    order: number;
    variants: readonly { label: string; priceCents: number }[];
  };
}

/** Menor preço entre as variações: base do "a partir de". */
export function startingPriceCents(product: CatalogProduct): number {
  return Math.min(...product.data.variants.map((variant) => variant.priceCents));
}

export function hasSinglePrice(product: CatalogProduct): boolean {
  return new Set(product.data.variants.map((variant) => variant.priceCents)).size === 1;
}

/** Ordem de exibição: categoria, depois o campo `order`, depois o nome. */
export function sortProducts<T extends CatalogProduct>(products: readonly T[]): T[] {
  return [...products].sort(
    (a, b) =>
      categories[a.data.category].order - categories[b.data.category].order ||
      a.data.order - b.data.order ||
      a.data.name.localeCompare(b.data.name, "pt-BR"),
  );
}

export interface CategoryGroup<T> {
  id: CategoryId;
  name: string;
  products: T[];
}

/** Agrupa por categoria na ordem de exibição, sem categorias vazias. */
export function groupByCategory<T extends CatalogProduct>(
  products: readonly T[],
): CategoryGroup<T>[] {
  const sorted = sortProducts(products);
  return (Object.keys(categories) as CategoryId[])
    .sort((a, b) => categories[a].order - categories[b].order)
    .map((id) => ({
      id,
      name: categories[id].name,
      products: sorted.filter((product) => product.data.category === id),
    }))
    .filter((group) => group.products.length > 0);
}

/** Outros produtos da mesma categoria, para a página de produto. */
export function relatedProducts<T extends CatalogProduct>(
  products: readonly T[],
  current: T,
  limit = 3,
): T[] {
  return sortProducts(products)
    .filter(
      (product) => product.data.category === current.data.category && product.id !== current.id,
    )
    .slice(0, limit);
}
