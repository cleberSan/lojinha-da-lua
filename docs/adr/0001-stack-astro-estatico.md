# ADR-0001: Astro estático, com JavaScript só onde há interação

- Status: aceito
- Data: 2026-10-23

## Contexto

O site é um catálogo: oito produtos, preços, fotos e um botão que abre o WhatsApp com o pedido escrito. Não há login, pagamento, banco de dados nem conteúdo de usuário. O público chega principalmente pelo celular, vindo do Instagram, muitas vezes em rede móvel.

Requisitos: carregar rápido no celular, ser bem indexado, ter CSP estrita sem `'unsafe-inline'` e custar zero para hospedar.

## Decisão

- **Framework:** Astro 7 com TypeScript no modo mais estrito (`astro/tsconfigs/strictest`) e saída estática. O build gera HTML, CSS e imagens; nenhuma página carrega JavaScript por padrão.
- **Interação:** a única parte interativa prevista, o "Montar pedido" com vários itens, entra como ilha React carregada só onde for usada.
- **Catálogo:** coleção de conteúdo do Astro, um JSON por produto em `src/content/produtos`, validado por schema zod (`src/domain/catalog.ts`). Preço em centavos inteiros, slug, variações e imagem fora do formato quebram o build, nunca o site no ar.
- **Regras puras em `src/domain`:** formatação em reais, telefone e mensagem do WhatsApp, ordenação do catálogo. São testadas sem Astro.
- **Imagens:** otimizadas no build (AVIF com fallback WebP, várias larguras) pelo `astro:assets`.
- **Fontes:** Alegreya Sans SC e Nunito (licença OFL) servidas pelo próprio site via pacotes `@fontsource`, sem Google Fonts em tempo de execução.
- **Qualidade:** Prettier, ESLint com regras de acessibilidade para `.astro` (`jsx-a11y-strict`), `astro check`, Vitest com cobertura mínima de 80% no CI e Playwright com axe em desktop e celular.

## Alternativas

- **Next.js 16, como no portfolio-web:** mesma stack, mas em export estático o runtime do React vai em toda página, o `next/image` perde a otimização e os scripts inline do RSC exigiriam hashes calculados à mão ou `'unsafe-inline'` (ver o ADR-0003 do portfolio-web).
- **HTML e CSS puros:** zero dependências, mas sem componentes, sem validação do catálogo e sem otimização de imagens.

## Consequências

- As páginas e componentes `.astro` são cobertos pelos testes E2E, que rodam sobre o build; a cobertura de 80% mede o TypeScript de `src/`.
- Vulnerabilidade em ferramenta de desenvolvimento não bloqueia o merge: a revisão de dependências barra só o escopo de produção, e o Dependabot avisa quando houver correção.
- Node 24 (LTS) no CI e na hospedagem, fixado em `.nvmrc` e `engines`, porque o Astro 7 exige Node 22.23 ou mais novo.
