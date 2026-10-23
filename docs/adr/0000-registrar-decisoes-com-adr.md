# ADR-0000: Registrar decisões arquiteturais com ADRs

- Status: aceito
- Data: 2026-10-23

## Contexto

Este é o site da Lojinha Da Lua e também uma peça do portfólio de Cleber Costa Santos. Quem visita o repositório deve entender por que cada escolha foi feita, e quem mantém o site depois deve saber o que não pode mudar sem rever uma decisão.

## Decisão

Decisões com impacto em arquitetura, segurança, desempenho, custo ou operação são registradas em `docs/adr/` como `NNNN-titulo-em-kebab-case.md`, com Contexto, Decisão, Alternativas e Consequências. ADRs aceitos não são editados; mudança de rumo gera um novo ADR.

## Consequências

- Decisões são revisadas no mesmo PR do código.
- O mesmo formato é usado em [portfolio-web](https://github.com/cleberSan/portfolio-web) e [careflow](https://github.com/cleberSan/careflow).
