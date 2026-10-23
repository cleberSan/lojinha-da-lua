# Lojinha Da Lua

[![CI](https://github.com/cleberSan/lojinha-da-lua/actions/workflows/ci.yml/badge.svg)](https://github.com/cleberSan/lojinha-da-lua/actions/workflows/ci.yml)
[![CodeQL](https://github.com/cleberSan/lojinha-da-lua/actions/workflows/codeql.yml/badge.svg)](https://github.com/cleberSan/lojinha-da-lua/actions/workflows/codeql.yml)
[![Site no ar](https://github.com/cleberSan/lojinha-da-lua/actions/workflows/producao.yml/badge.svg)](https://github.com/cleberSan/lojinha-da-lua/actions/workflows/producao.yml)

Site da **Lojinha Da Lua**, loja de produtos personalizados (camisetas em sublimação e DTF, canecas), com catálogo, preços e pedido pelo WhatsApp. É também um projeto do portfólio de [Cleber Costa Santos](https://github.com/cleberSan).

Construído com Astro 7 e TypeScript, publicado como site estático na Cloudflare: **<https://lojinha-da-lua.clebersan.workers.dev>**.

## O que tem no site

| Rota               | Conteúdo                                                                         |
| ------------------ | -------------------------------------------------------------------------------- |
| `/`                | Apresentação, categorias, alguns produtos, como funciona e contato               |
| `/produtos`        | Catálogo agrupado em camisetas e canecas, com preço "a partir de"                |
| `/produtos/<slug>` | Variações e preços, observações da loja, botão de pedido e "Montar pedido"       |
| `/pedido`          | Meu pedido: revisa quantidades e envia todos os itens numa mensagem só           |
| `/contato`         | WhatsApp e Instagram da loja                                                     |
| `/privacidade`     | O que o site guarda (só o pedido, no aparelho) e quem trata os dados da conversa |
| qualquer outra     | Página 404 no visual da loja, com status HTTP 404                                |

Cada botão de pedido abre `wa.me` com a mensagem pronta (produto, variação, preço e total de referência). O "Montar pedido" junta vários produtos no navegador do cliente e envia tudo de uma vez. O site não tem backend e não coleta dado pessoal ([ADR-0005](docs/adr/0005-pedido-pelo-whatsapp-sem-backend.md), [ADR-0006](docs/adr/0006-montar-pedido-no-navegador.md)).

## Qualidade

- Páginas estáticas e zero JavaScript por padrão; React só nas ilhas do pedido; imagens em AVIF e WebP geradas no build ([ADR-0001](docs/adr/0001-stack-astro-estatico.md), [ADR-0006](docs/adr/0006-montar-pedido-no-navegador.md)).
- Prévia de link no WhatsApp e no Instagram (Open Graph), canonical, JSON-LD de loja e produtos, sitemap e robots.txt, sem dependência nova ([ADR-0007](docs/adr/0007-seo-e-previa-de-links.md)).
- Catálogo validado por schema: preço, variação ou imagem fora do formato quebram o build. Um teste compara os preços com os flyers da loja.
- CSP por hash sem `'unsafe-inline'`, HSTS e demais cabeçalhos de segurança, de uma fonte só ([ADR-0004](docs/adr/0004-csp-por-hash-e-cabecalhos.md)).
- Testes de unidade com Vitest (mínimo de 80% de cobertura no CI) e E2E com Playwright em desktop e celular, com axe (WCAG 2.1 AA), sobre o build servido pelo mesmo runtime da Cloudflare.
- Os mesmos testes E2E rodam todo dia contra o site publicado e abrem uma issue se algo mudar no ar; o endereço de produção fica no código, sem variável no painel da Cloudflare ([ADR-0008](docs/adr/0008-conferencia-do-site-no-ar.md)).
- CodeQL, revisão de dependências e Dependabot.

## Decisões

As decisões arquiteturais estão em [docs/adr](docs/adr): stack, hospedagem gratuita na Cloudflare (a Vercel Hobby não permite uso comercial), imagens sem personagens de terceiros, CSP, pedido pelo WhatsApp, "Montar pedido" no navegador, SEO e conferência do site no ar.

## Rodando localmente

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

O código está sob a licença [MIT](LICENSE). O nome, o logo, as fotos e os textos da Lojinha Da Lua pertencem à loja, com todos os direitos reservados, e não são cobertos pela licença do código.
