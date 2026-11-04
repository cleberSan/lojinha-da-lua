# Specs

Especificações das mudanças do site (Spec-Driven Development): o que cada mudança deve fazer e por quê, escrito e revisado antes do código ([ADR-0011](../adr/0011-especificar-antes-de-implementar.md)). Decisões de arquitetura continuam em [docs/adr](../adr); a spec cita as que a restringem.

## Quando

| Nível    | Quando                                                                                                                                                                                                                                            | Artefatos                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Direto   | Preço, texto, produto ou foto vindos da loja ([CONTRIBUTING](../../CONTRIBUTING.md#mudar-preço-texto-ou-produto)), atualização de dependência, documentação, refatoração sem mudança visível, bug com causa clara (o teste de regressão é a spec) | Só o PR                                                                      |
| Leve     | Página, seção ou comportamento novo sem nenhum gatilho do completo                                                                                                                                                                                | `spec.md` com plano e tarefas curtos                                         |
| Completo | Qualquer gatilho abaixo                                                                                                                                                                                                                           | `spec.md`, `plano.md`, `tarefas.md`; código só depois de a spec ser aprovada |

Gatilhos do nível completo neste repositório:

- fluxo de pedido: mensagem do WhatsApp, "Montar pedido" ou o formato guardado no navegador (ADR-0005, ADR-0006);
- schema do catálogo em `src/domain/catalog.ts`;
- qualquer coleta de dado de cliente (hoje nenhuma, ADR-0005);
- CSP, cabeçalhos de segurança, SEO ou URL pública (ADR-0004, ADR-0007, ADR-0008);
- hospedagem, dependência, serviço externo, custo ou licença novos.

## Como

1. Pasta `NNNN-titulo-em-kebab-case/` com o próximo número livre, nunca reaproveitado.
2. `spec.md`: problema, fora de escopo, critérios de aceite `CA-NN` em EARS (`QUANDO ..., ... DEVE ...`), requisitos não funcionais (acessibilidade WCAG 2.2 AA, celular, CSP) e perguntas abertas.
3. `plano.md` e `tarefas.md` no nível completo: páginas e ilhas, dados, segurança, teste por critério (Vitest ou Playwright com axe), riscos e rollback.
4. Cada teste que prova um critério leva o comentário `// spec NNNN CA-NN` logo acima do `it(...)` ou `test(...)`. Conferência: `grep -rn "spec NNNN CA-" src/ e2e/`.
5. O PR linka a spec e mostra a tabela critério → teste. Ao concluir, o status vira `implementada`; depois disso a spec não é reescrita, e comportamento novo ganha spec nova.

Specs são públicas: preço, prazo e texto só da loja, nada inventado, e nenhum contato ou dado de cliente. Modelos e processo completo: [claude-works](https://github.com/cleberSan/claude-works/blob/main/memorias/spec-driven-development.md).
