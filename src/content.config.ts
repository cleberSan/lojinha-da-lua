import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { createProductSchema } from "./domain/catalog";

const products = defineCollection({
  // O nome do arquivo vira o slug da página: src/content/produtos/caneca-magica.json → /produtos/caneca-magica
  loader: glob({ pattern: "*.json", base: "./src/content/produtos" }),
  schema: ({ image }) => createProductSchema(image()),
});

export const collections = { products };
