# ADR-0007: SEO e prévia de links sem dependências

- Status: aceito
- Data: 2026-10-23
- Atualização: 2026-10-23, o endereço de produção passou para o código ([ADR-0008](0008-conferencia-do-site-no-ar.md))

## Contexto

O público chega pelo Instagram e por links enviados no WhatsApp. A prévia do link (imagem, título e descrição) é a primeira impressão da loja, e os buscadores precisam de canonical, sitemap e dados estruturados para entender produtos e preços. Tudo isso exige URL absoluta, e o endereço de produção ainda não existe: depende da conta da Cloudflare (ADR-0002) e, um dia, de um domínio próprio.

## Decisão

- **Endereço do site:** `productionSiteUrl` em `src/config/site.ts`. A variável `SITE_URL` troca o endereço no build dos testes, e aceita só a origem em `https`, ou `http` em `127.0.0.1` e `localhost`; caminho, query, fragmento ou credenciais quebram o build. Na primeira versão, antes de o endereço existir, ele vinha só da variável, e sem ela o site saía sem canonical, `og:url`, `og:image`, JSON-LD e sitemap.
- **Prévia de links (Open Graph):** título, descrição, `pt_BR` e imagem em toda página. A imagem padrão é um cartão 1200x630 no visual dos flyers (logo, nome, slogan), convertido para JPEG no build. Produto com foto da loja usa a própria foto; produto com ilustração usa o cartão da marca.
- **JSON-LD do schema.org:** `Organization` e `WebSite` na página inicial; `Product` com `Offer` ou `AggregateOffer` em reais e `BreadcrumbList` em cada produto. Sem `availability`, porque a loja não publica estoque, e sem imagem quando ela é ilustração (ADR-0003). O JSON escapa `<`, `>`, `&` e os separadores U+2028 e U+2029, para nenhum texto fechar a tag `<script>`.
- **robots.txt e sitemap.xml gerados no fim do build** por uma integração no `astro.config.mjs`, com as páginas que o próprio build produziu. `/pedido` (pessoal de cada aparelho) e o 404 recebem `noindex` e ficam fora do sitemap; a lista está em `src/config/site.ts`, usada pelo layout e pelo sitemap.
- **Sem dependência nova:** `@astrojs/sitemap` resolveria só o sitemap; o restante seria código próprio de qualquer jeito, e as funções puras em `src/domain/seo.ts` têm teste unitário.

## Alternativas

- **Endereço fixo no código:** mais simples, mas o endereço de produção ainda não existia. Adotado quando ele passou a existir ([ADR-0008](0008-conferencia-do-site-no-ar.md)).
- **`@astrojs/sitemap`:** dependência oficial, mas não sabe quais páginas têm `noindex` sem configuração repetida.
- **Imagem de prévia gerada por página (Satori ou similar):** bonito, mas dependência e tempo de build a mais para oito produtos.

## Consequências

- Todo build sai com canonical e sitemap, e o build da Cloudflare não precisa de variável no painel ([ADR-0008](0008-conferencia-do-site-no-ar.md)).
- O CI e os testes E2E constroem com `SITE_URL=http://127.0.0.1:8787`, o endereço do `wrangler dev`, e conferem canonical, Open Graph, JSON-LD, preços do JSON-LD contra o catálogo, robots.txt e sitemap.
- Os dados estruturados não prometem resultado enriquecido no Google: ele também pede avaliações, frete ou devolução, que a loja não publica.
