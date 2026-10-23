# Política de segurança

Não abra issue pública para vulnerabilidades. Use o [reporte privado de vulnerabilidades do GitHub](https://github.com/cleberSan/lojinha-da-lua/security/advisories/new). O retorno inicial acontece em até 5 dias úteis.

Práticas adotadas: site estático sem backend nem coleta de dados pessoais ([ADR-0005](docs/adr/0005-pedido-pelo-whatsapp-sem-backend.md)), CSP por hash e cabeçalhos de segurança em todas as rotas ([ADR-0004](docs/adr/0004-csp-por-hash-e-cabecalhos.md)), CodeQL e revisão de dependências em todo PR, Dependabot semanal e nenhum segredo versionado.
