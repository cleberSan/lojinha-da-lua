# ADR-0011: Especificar antes de implementar (Spec-Driven Development)

- Status: proposto
- Data: 2026-11-04

## Contexto

O site é o catálogo de uma loja real e muda de dois jeitos: conteúdo que vem da loja (preço, texto, foto) e funcionalidade (pedido pelo WhatsApp, "Montar pedido", SEO, segurança). As decisões de arquitetura estão nos ADRs, mas o comportamento esperado de cada funcionalidade aparecia só nos testes e na descrição do PR, e a revisão acontecia com o código pronto.

Em 2026-11-04 Cleber decidiu adotar Spec-Driven Development em todos os repositórios do ecossistema. O processo comum e as ferramentas avaliadas (GitHub Spec Kit, OpenSpec, Kiro) estão no [ADR-0002 da base claude-works](https://github.com/cleberSan/claude-works/blob/main/docs/adr/0002-spec-driven-development.md).

## Decisão

- **Specs em `docs/specs/NNNN-titulo/`**, ao lado dos ADRs: `spec.md` (o quê e por quê), `plano.md` (como) e `tarefas.md` (em que ordem), conforme [docs/specs/README.md](../specs/README.md).
- **Nível completo, com a spec aprovada por Cleber antes do código,** quando a mudança mexe no fluxo de pedido ou no formato guardado no navegador (ADR-0005, ADR-0006), no schema do catálogo, em coleta de dado de cliente, em CSP, cabeçalhos, SEO ou URL pública, ou traz hospedagem, dependência, serviço, custo ou licença novos.
- **Nível leve** (só `spec.md`) para página, seção ou comportamento novo sem esses gatilhos; **direto** (só o PR) para preço, texto, produto ou foto vindos da loja, atualização de dependência (ADR-0010), documentação, refatoração e bug com causa clara.
- **Critérios de aceite `CA-NN`** em EARS; o teste Vitest ou Playwright que prova cada um leva o comentário `// spec NNNN CA-NN`.
- **Spec por mudança:** depois de `implementada`, só o status muda; comportamento novo ganha spec nova.
- **Template de PR** com a linha "Spec" e os itens de critério coberto.
- Nenhuma ferramenta nem dependência nova: os modelos vêm da base claude-works.

## Alternativas

- **Continuar só com ADR e descrição do PR:** o comportamento só é revisado depois do código e o requisito não fica no repositório.
- **GitHub Spec Kit no repositório:** licença MIT, mas traz um CLI em Python e arquivos próprios para manter (ADR-0002 da base).
- **Spec também para conteúdo da loja:** preço e texto já têm regra e teste próprios (CONTRIBUTING); a spec seria maior que a mudança.

## Consequências

- Funcionalidade nova chega ao PR com o comportamento já combinado; a revisão confere critério sem teste e código fora da spec.
- Conteúdo da loja continua com o mesmo fluxo de hoje.
- Specs são públicas: preço e texto só da loja, nenhum contato ou dado de cliente.
- Este ADR reabre junto com o ADR-0002 da base.
