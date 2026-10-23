# ADR-0002: Hospedagem gratuita na Cloudflare, como arquivos estáticos

- Status: aceito
- Data: 2026-10-23

## Contexto

O site anuncia produtos com preço, então é uso comercial. Os planos gratuitos considerados em outubro de 2026:

- **Vercel Hobby:** [proíbe uso comercial](https://vercel.com/docs/limits/fair-use-guidelines) e cita "anunciar a venda de um produto ou serviço". A conta Vercel do autor hospeda o portfolio-web, que ficaria em risco.
- **GitHub Pages:** [não permite](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) e-commerce nem site de negócio online.
- **Netlify Free:** permite uso comercial, mas são 300 créditos por mês, 15 por deploy de produção, e passar do limite pausa todos os projetos da conta.
- **Cloudflare Workers com arquivos estáticos:** permite uso comercial, não pede cartão, e requisições a arquivos estáticos não contam no limite gratuito.

## Decisão

Publicar `dist/` como arquivos estáticos de um Worker da Cloudflare (`wrangler.jsonc`), sem código de servidor.

- **Deploy pelo próprio painel da Cloudflare (Workers Builds):** a Cloudflare lê o repositório pelo app dela no GitHub. Nenhum token da Cloudflare fica em secrets do GitHub.
- **Mesmo comportamento no CI:** os testes E2E sobem o build com `wrangler dev`, que usa o mesmo runtime (workerd), o mesmo `_headers`, a mesma página 404 e o mesmo tratamento de barra final de produção.
- **URLs sem barra final:** o Astro gera `produtos.html` (`build.format: "file"`) e a Cloudflare serve `/produtos`; `/produtos/` redireciona para `/produtos`.
- **Portão de qualidade:** a Cloudflare publica o que chega ao `main`, então o `main` fica protegido exigindo PR e os checks de CI, revisão de dependências e CodeQL.
- **Rollback:** voltar para a versão anterior em Deployments, no painel do Worker.
- **Endereço:** `https://lojinha-da-lua.clebersan.workers.dev`, com `workers_dev` e `preview_urls` ligados no `wrangler.jsonc`. O subdomínio da conta foi trocado do padrão, derivado do e-mail, para o usuário público do GitHub, porque ele aparece em todo link compartilhado.
- **Prévia por PR:** os builds de outras branches rodam `wrangler preview` e geram um link de prévia por branch, para revisar no celular antes do merge. Esses links são públicos, como o código do repositório; no `workers.dev` a Cloudflare manda `X-Robots-Tag: noindex`, e o canonical deles aponta para a produção.

## Alternativas

- **Cloudflare Pages:** continua funcionando, mas a Cloudflare recomenda Workers com arquivos estáticos para projetos novos.
- **Deploy por GitHub Actions com `wrangler deploy`:** daria deploy só depois do CI verde, ao custo de guardar um token da conta no GitHub. A proteção do `main` dá a mesma garantia sem segredo.
- **Vercel Pro (US$ 20 por mês):** resolve o uso comercial, mas tem custo fixo para um site estático.

## Consequências

- Sem servidor, não há logs de aplicação para monitorar; a verificação do site no ar é um teste agendado ([ADR-0008](0008-conferencia-do-site-no-ar.md)).
- Se o site precisar de código no servidor, as requisições a esse código passam a contar no limite gratuito (100 mil por dia), e este ADR deve ser revisto.
- O ideal é a conta da Cloudflare e o domínio próprio ficarem em nome da loja, com o autor como membro.
