# ADR-0008: Conferência agendada do site no ar e endereço de produção no código

- Status: aceito
- Data: 2026-10-23

## Contexto

O site está no ar em `https://lojinha-da-lua.clebersan.workers.dev`, publicado pela Cloudflare a cada merge no `main` (ADR-0002). O CI testa o build servido pelo `wrangler dev`, mas não vê o que de fato chegou ao público: o endereço usado no canonical e na prévia de links, os cabeçalhos servidos pela Cloudflare, uma configuração mudada no painel ou um recurso da Cloudflare que injete script na página e quebre a CSP. Sem servidor, não há log de aplicação para acompanhar, e a loja só saberia de um problema quando um cliente reclamasse.

## Decisão

- **A mesma suíte, outro endereço:** com `E2E_BASE_URL`, o `playwright.config.ts` aponta os testes E2E para o site publicado e não sobe o servidor local. Nenhum teste novo foi escrito para produção; tudo que o CI garante no build é conferido no ar: status e cabeçalhos de cada página, CSP por hash, nenhuma requisição para outra origem, pedido completo, axe em desktop e celular, canonical, Open Graph, JSON-LD e sitemap com o endereço real.
- **GitHub Actions agendado** (`.github/workflows/producao.yml`): todo dia às 09:23 UTC, também disparável à mão em **Actions → Site no ar → Run workflow**, e em PR que mude o próprio workflow. Repositório público, então os minutos são gratuitos.
- **Aviso por issue:** se a execução agendada falhar, um job separado, o único com permissão de escrita em issues, abre a issue "Site no ar falhou na conferência agendada" ou comenta na que já está aberta, com o link da execução. O relatório do Playwright fica nos artefatos por 14 dias.
- **Endereço de produção no código:** `productionSiteUrl` (`src/config/site.ts`) é o endereço de todo build, inclusive das prévias da Cloudflare, que apontam o canonical para a produção. A `SITE_URL` só troca o endereço nos testes E2E com `wrangler dev`. No build da Cloudflare (`WORKERS_CI=1`), uma `SITE_URL` diferente desse endereço quebra o build, e o site anterior continua no ar. Um teste unitário confere que o `E2E_BASE_URL` do workflow é o mesmo endereço. Era a alternativa prevista no ADR-0007 para quando o endereço existisse.
- **Endereço público fixado no `wrangler.jsonc`:** `workers_dev` e `preview_urls` ficam ligados na configuração, para nenhum deploy ou ajuste no painel desligar o endereço sem passar por PR.

## Alternativas

- **Monitor de disponibilidade externo (UptimeRobot, Better Stack):** avisa em minutos, mas só confere se a página responde 200; não vê CSP, cabeçalhos nem preço errado, e é mais uma conta com acesso ao projeto.
- **Health Checks da Cloudflare:** recurso de planos pagos.
- **Suíte separada só para produção:** duplicaria testes e deixaria as duas suítes divergirem com o tempo.
- **Endereço só na variável de build da Cloudflare (primeira versão deste ADR):** a Cloudflare separa as variáveis de produção e de prévia, então o endereço ficava em três lugares (duas abas do painel e o workflow), fora da revisão em PR. A primeira conferência mostrou a produção publicada sem a variável, e as prévias dos PRs falharam pelo mesmo motivo.
- **Rodar a cada merge, logo após o deploy:** o build da Cloudflare termina alguns minutos depois do merge, e o workflow precisaria esperar por ele (pelo check que a Cloudflare publica no commit, por exemplo). Fica como melhoria se a frequência diária não bastar.

## Consequências

- Um problema em produção aparece em até 24 horas, ou na hora com o disparo manual depois de um deploy.
- Cada execução faz alguns milhares de requisições a arquivos estáticos, que são gratuitas e não contam no limite da Cloudflare.
- Os testes leem o catálogo do `main`. Entre um merge e o fim do deploy, a execução pode comparar com a versão anterior; o horário fixo de madrugada torna isso improvável.
- O GitHub desativa agendamentos de repositório público sem atividade por 60 dias e avisa por e-mail. Basta reativar em **Actions → Site no ar**.
- Mudar o endereço (um domínio próprio, por exemplo) é um PR que troca `productionSiteUrl` e `E2E_BASE_URL` juntos; o teste unitário não deixa um mudar sem o outro, e o painel da Cloudflare não precisa de variável.
