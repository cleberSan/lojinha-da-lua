# Como contribuir

1. Crie uma branch a partir de `main` (`feat/...`, `fix/...`, `chore/...`, `docs/...`).
2. Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/).
3. Abra um PR com o template; o CI precisa estar verde.
4. Decisões arquiteturais entram como ADR em `docs/adr/`.

## Rodando localmente

Pré-requisito: Node.js 24 (ver `.nvmrc`).

```bash
npm ci
npm run dev            # http://localhost:4321 (sem CSP: o Astro só aplica a CSP no build)
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
SITE_URL=http://127.0.0.1:8787 npm run build
npm run preview        # serve dist/ como a Cloudflare, em http://127.0.0.1:8787
npm run test:e2e       # sobe o preview e roda Playwright + axe (rode o build antes)
```

Os testes E2E esperam o build feito com `SITE_URL=http://127.0.0.1:8787`, o endereço do preview: canonical, Open Graph, JSON-LD e sitemap apontam para ele ([ADR-0007](docs/adr/0007-seo-e-previa-de-links.md)). Sem a variável, o build funciona, mas sem esses metadados.

Antes do primeiro `test:e2e`, instale o navegador com `npx playwright install chromium`. Se a máquina já tiver um Chromium compatível, aponte para ele com `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Para conferir o site publicado com a mesma suíte, sem build nem servidor local ([ADR-0008](docs/adr/0008-conferencia-do-site-no-ar.md)):

```bash
E2E_BASE_URL=https://lojinha-da-lua.clebersan.workers.dev npm run test:e2e
```

## Mudar preço, texto ou produto

Tudo que a loja publica vem dela: não invente preço, prazo, forma de pagamento nem descrição.

- **Preço:** altere `priceCents` (em centavos: R$ 70,00 é `7000`) no JSON do produto em `src/content/produtos/` e a tabela `flyerPrices` em `src/content/catalog.test.ts` no mesmo PR. Atualize também `pricesAsOf` em `src/config/store.ts` com o mês da conferência.
- **Produto novo:** crie `src/content/produtos/<slug>.json` seguindo os existentes. O nome do arquivo vira a URL. O schema em `src/domain/catalog.ts` diz o que é obrigatório.
- **Imagem:** coloque em `src/assets/produtos/`. Foto da loja usa `"kind": "foto"`; desenho provisório usa `"kind": "ilustracao"`. Não use imagem com personagem, marca ou pessoa de terceiros sem autorização ([ADR-0003](docs/adr/0003-imagens-sem-terceiros.md)).
- **Contatos:** WhatsApp e Instagram ficam em `src/config/store.ts`. Celular no formato `55DD9XXXXXXXX` e exatamente um número com `receivesOrders: true`.

## Publicação

O site é publicado na Cloudflare como arquivos estáticos de um Worker, pela integração da própria Cloudflare com o GitHub ([ADR-0002](docs/adr/0002-hospedagem-na-cloudflare.md)):

- Endereço: <https://lojinha-da-lua.clebersan.workers.dev>.
- Merge no `main` publica em produção. PRs de outras branches ganham um link de prévia no check da Cloudflare.
- Para voltar uma versão, use **Deployments** no painel do Worker.
- Os cabeçalhos HTTP vêm de `dist/_headers`, gerado no build a partir de `src/config/security.ts`.
- Todo dia o workflow **Site no ar** roda os testes E2E contra a produção e abre uma issue se falhar. Depois de um deploy importante, dispare à mão em **Actions → Site no ar → Run workflow** ([ADR-0008](docs/adr/0008-conferencia-do-site-no-ar.md)).

Configuração inicial, feita uma vez pelo dono do repositório (já feita em 2026-10-23):

1. Em **Settings → Branches** do GitHub, proteja o `main` exigindo PR, sem aprovação obrigatória (o autor não aprova o próprio PR), e os checks `Lint, tipos, testes e build`, `Revisão de dependências` e `CodeQL`, sem permitir bypass. A Cloudflare publica tudo que chega ao `main`, então é essa regra que garante que só código testado vai ao ar.
2. Crie uma conta gratuita em [dash.cloudflare.com](https://dash.cloudflare.com/sign-up), sem cartão, com verificação em duas etapas (entrando pelo GitHub, vale a do GitHub).
3. Na página inicial da conta, **Create app** → importar repositório do GitHub. Ao instalar o app da Cloudflare, escolha **Only select repositories** e marque só `lojinha-da-lua`.
4. Use o nome `lojinha-da-lua` (o mesmo de `wrangler.jsonc`), build command `npm run build` e os comandos de deploy e prévia padrão. Deixe **Protect with Cloudflare Access** desligado: o site é público.
5. Se o subdomínio `workers.dev` da conta vier derivado do e-mail, troque por um nome público em **Compute → Workers & Pages → Subdomain → Change**: ele aparece em todo link do site.
6. Crie a variável de build `SITE_URL` com o endereço `https://lojinha-da-lua.<subdomínio>.workers.dev` em **Settings → Build → Build variables and secrets** do Worker, como texto (não é sigilosa). Não confunda com **Settings → Variables & Secrets**, que vale só em tempo de execução. Sem ela, o build da Cloudflare falha de propósito. Refaça o build depois de criar.
7. Se o endereço mudar (domínio próprio, por exemplo), troque a `SITE_URL` e o `E2E_BASE_URL` de `.github/workflows/producao.yml` juntos.

Nenhum token da Cloudflare deve ser guardado no repositório nem nos secrets do GitHub.
