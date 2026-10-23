import { z } from "astro/zod";
import { isBrazilianMobile } from "../domain/phone";

/**
 * Dados públicos da loja, copiados dos flyers e do bio.site que a própria loja publica.
 * Nada aqui é inventado: mudanças vêm da loja e passam por PR.
 */
const storeSchema = z
  .object({
    name: z.string().min(1),
    tagline: z.string().min(1),
    description: z.string().min(1),
    instagram: z.object({
      handle: z.string().regex(/^[a-z0-9._]+$/),
      url: z.url({ protocol: /^https$/, hostname: /^www\.instagram\.com$/ }),
    }),
    whatsapp: z
      .array(
        z.object({
          phone: z.string().refine(isBrazilianMobile, "Use o formato 55DD9XXXXXXXX"),
          label: z.string().min(1),
          receivesOrders: z.boolean(),
        }),
      )
      .min(1),
    /** Mês dos preços de referência dos flyers, exibido junto aos valores. */
    pricesAsOf: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  })
  .refine((store) => store.whatsapp.filter((contact) => contact.receivesOrders).length === 1, {
    message: "Exatamente um WhatsApp recebe os pedidos do site.",
  });

export type Store = z.infer<typeof storeSchema>;

export function parseStore(input: unknown): Store {
  return storeSchema.parse(input);
}

export const store = parseStore({
  name: "Lojinha Da Lua",
  tagline: "Seu estilo único em produtos personalizados!",
  description:
    "Produtos personalizados para eternizar momentos: camisetas, canecas e muito mais, feitos com carinho, qualidade e criatividade para você ou para presentear.",
  instagram: { handle: "lojinhadalua___", url: "https://www.instagram.com/lojinhadalua___" },
  whatsapp: [
    { phone: "5511958877762", label: "Atendimento", receivesOrders: true },
    { phone: "5511998241075", label: "Luiz", receivesOrders: false },
  ],
  pricesAsOf: "2026-10",
});

export const orderContact = store.whatsapp.find((contact) => contact.receivesOrders)!;

const monthYear = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10" → "outubro de 2026" */
export function formatMonthYear(value: string): string {
  return monthYear.format(new Date(`${value}-01T00:00:00Z`));
}
