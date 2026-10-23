# ADR-0008: Conferência agendada do site no ar com a mesma suíte E2E

- Status: aceito
- Data: 2026-10-23

## Contexto

O site está no ar em `https://lojinha-da-lua.clebersan.workers.dev`, publicado pela Cloudflare a cada merge no `main` (ADR-0002). O CI testa o build servido pelo `wrangler dev`, mas não vê o que de fato chegou ao público: a variável `SITE_URL` de produção, os cabeçalhos servidos pela Cloudflare, uma configuração mudada no painel ou um recurso da Cloudflare que injete script na página e quebre a CSP. Sem servidor, não há log de aplicação para acompanhar, e a loja só saberia de um problema quando um cliente reclamasse.

## Decisão

- **A mesma suíte, outro endereço:** com `E2E_BASE_URL`, o `playwright.config.ts` aponta os testes E2E para o site publicado e não sobe o servidor local. Nenhum teste novo foi escrito para produção; tudo que o CI garante no build é conferido no ar: status e cabeçalhos de cada página, CSP por hash, nenhuma requisição para outra origem, pedido completo, axe em desktop e celular, canonical, Open Graph, JSON-LD e sitemap com o endereço real.
- **GitHub Actions agendado** (`.github/workflows/producao.yml`): todo dia às 09:23 UTC, também disparável à mão em **Actions → Site no ar → Run workflow**, e em PR que mude o próprio workflow. Repositório público, então os minutos são gratuitos.
- **Aviso por issue:** se a execução agendada falhar, um job separado, o único com permissão de escrita em issues, abre a issue "Site no ar falhou na conferência agendada" ou comenta na que já está aberta, com o link da execução. O relatório do Playwright fica nos artefatos por 14 dias.
- **Build de produção sem `SITE_URL` falha:** a Cloudflare define `WORKERS_CI=1` no build, e com ela `siteUrlFromEnv` (`src/config/site.ts`) exige a variável. O site antigo continua no ar em vez de sair sem canonical e prévia de links.
- **Endereço público fixado no `wrangler.jsonc`:** `workers_dev` e `preview_urls` ficam ligados na configuração, para nenhum deploy ou ajuste no painel desligar o endereço sem passar por PR.

## Alternativas

- **Monitor de disponibilidade externo (UptimeRobot, Better Stack):** avisa em minutos, mas só confere se a página responde 200; não vê CSP, cabeçalhos nem preço errado, e é mais uma conta com acesso ao projeto.
- **Health Checks da Cloudflare:** recurso de planos pagos.
- **Suíte separada só para produção:** duplicaria testes e deixaria as duas suítes divergirem com o tempo.
- **Rodar a cada merge, logo após o deploy:** o build da Cloudflare termina alguns minutos depois do merge, e o workflow precisaria esperar por ele (pelo check que a Cloudflare publica no commit, por exemplo). Fica como melhoria se a frequência diária não bastar.

## Consequências

- Um problema em produção aparece em até 24 horas, ou na hora com o disparo manual depois de um deploy.
- Cada execução faz alguns milhares de requisições a arquivos estáticos, que são gratuitas e não contam no limite da Cloudflare.
- Os testes leem o catálogo do `main`. Entre um merge e o fim do deploy, a execução pode comparar com a versão anterior; o horário fixo de madrugada torna isso improvável.
- O GitHub desativa agendamentos de repositório público sem atividade por 60 dias e avisa por e-mail. Basta reativar em **Actions → Site no ar**.
- Mudar o endereço (um domínio próprio, por exemplo) exige trocar a `SITE_URL` na Cloudflare e `E2E_BASE_URL` no workflow, no mesmo dia.
