# ADR-0010: Dependabot com auto-merge só para atualização de baixo risco

- Status: aceito
- Data: 2026-10-30

## Contexto

O Dependabot abre PRs semanais de atualização de dependências. A `main` exige PR, branch atualizado e os checks obrigatórios, mas não exige aprovação: cada PR do Dependabot ficava parado até alguém clicar em mesclar. Em 30/10 eram três abertos, todos verdes.

O Cleber pediu que o bot não precise dele a cada atualização, com critério para o site da loja não sair do ar. Até aqui a regra era que nenhum PR deste repositório é mesclado sem ele; com este ADR, ele delega ao GitHub o merge das atualizações de baixo risco.

## Decisão

O workflow `dependabot-auto-merge.yml` decide em cada PR do Dependabot e, se a atualização for de baixo risco, liga o auto-merge do GitHub. Quem mescla é o GitHub, e só depois de todos os checks obrigatórios passarem: lint, tipos, testes com cobertura, build, E2E com axe e cabeçalhos no runtime da Cloudflare, `npm audit` de produção, revisão de dependências e CodeQL.

| Atualização                                                     | Destino                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Patch ou minor de pacote npm, inclusive `wrangler`              | auto-merge                                                                                 |
| Patch de Astro, integrações `@astrojs/*` ou React               | auto-merge                                                                                 |
| Minor de Astro, `@astrojs/*` ou React (`FRAMEWORK` no workflow) | revisão manual: muda o HTML gerado e os testes não comparam visual                         |
| Major de qualquer pacote                                        | revisão manual                                                                             |
| Actions oficiais (`actions/*`, `github/*`), qualquer versão     | auto-merge: o próprio PR roda os workflows com a versão nova, e nada disso vai para o site |
| Action de terceiros, ou o próprio `dependabot/fetch-metadata`   | revisão manual                                                                             |
| PR que avisa troca de mantenedores do pacote                    | revisão manual: sinal clássico de conta sequestrada                                        |
| Commit de outra pessoa no branch, ou commit sem assinatura      | revisão manual, e o auto-merge é desligado                                                 |
| Metadados ilegíveis ou tipo de atualização desconhecido         | revisão manual                                                                             |

Correções de segurança seguem a mesma tabela, pelo tipo de versão.

Para o merge automático ser raro e previsível:

- **Cooldown de 7 dias:** versão nova só vira PR depois de uma semana publicada. Pacotes comprometidos no npm costumam sair do ar em horas ou dias. Correção de segurança não espera.
- **Um PR por semana, na segunda às 4h:** minor e patch de tudo vão num grupo só. Com a `main` exigindo branch atualizado, dois PRs automáticos ao mesmo tempo deixariam o segundo parado, porque o Dependabot só faz rebase quando há conflito ou na próxima rodada. O horário põe o deploy antes da conferência diária do site às 6h23 (ADR-0008), que confere a versão nova no mesmo dia e abre issue se algo quebrar. Actions ficam para quarta.
- **Majors que precisam casar versão num PR só:** Astro com as integrações, React com os tipos, Vitest com os plugins dele, ESLint com os plugins.
- **`@types/node` sem major:** trocar o Node do `.nvmrc` é uma decisão à parte.

O workflow não faz checkout nem roda código do PR, tem `permissions: {}` no topo e escrita só no job que decide. O `fetch-metadata` fica fixado por SHA. Cada execução deixa a decisão e o motivo no resumo do job.

## Ajustes que só o dono do repositório faz

1. **Settings → General → Pull Requests → Allow auto-merge:** ligar. Sem isso o passo "Ligar o auto-merge" falha com aviso.
2. **Opcional, recomendado:** incluir `Workers Builds: lojinha-da-lua` nos checks obrigatórios da proteção da `main`. Assim a prévia da Cloudflare, que roda o mesmo `wrangler` do deploy, também precisa passar. Ela importa mais aqui porque `wrangler` entra no auto-merge.

## Como desfazer

- **Site com problema depois de um merge automático:** voltar para a versão anterior em Deployments, no painel do Worker (ADR-0002). Depois, `git revert` do commit (é squash, um commit por atualização) num PR.
- **Pausar a automação:** desligar "Allow auto-merge" ou desativar o workflow em Actions. Os PRs voltam a esperar merge manual.
- **PR parado como desatualizado:** comentar `@dependabot rebase`.

## Alternativas

- **Mesclar tudo que passar no CI:** mais simples, mas major e minor de framework são onde mora a quebra de comportamento que o CI não vê.
- **Manter tudo manual:** zero risco novo, mas atualizações de segurança e correções ficam paradas até alguém olhar, o que também é risco.
- **Renovate:** tem auto-merge nativo e mais opções, mas é mais uma ferramenta e mais um app com acesso ao repositório para o mesmo resultado.
- **Token de um GitHub App em vez do `GITHUB_TOKEN`:** faria o merge disparar os workflows de `push` na `main` (ver Consequências), ao custo de uma chave privada com escrita guardada nos secrets. Não compensa aqui.

## Consequências

- Patch e minor comuns entram sozinhos, com os mesmos portões de qualquer PR. Ficam com o Cleber: majors, minors de framework e qualquer sinal estranho.
- O merge feito com o `GITHUB_TOKEN` não dispara workflows de `push`: CI e CodeQL não rodam de novo na `main` depois de um merge automático. O deploy não muda, porque quem publica é a integração da Cloudflare. Como a `main` exige branch atualizado, o código mesclado é o mesmo que passou nos checks do PR; a conferência diária e o CodeQL semanal cobrem o que está no ar.
- Cada merge automático é um deploy de produção. O agrupamento semanal limita isso a cerca de um por semana.
- Risco que fica: uma versão maliciosa que passe da semana de cooldown e de todos os checks. Os portões reduzem esse risco, mas não zeram.
