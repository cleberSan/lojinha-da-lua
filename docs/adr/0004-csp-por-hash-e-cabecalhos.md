# ADR-0004: CSP por hash no `<meta>` e cabeçalhos de segurança no `_headers`

- Status: aceito
- Data: 2026-10-23

## Contexto

O site não tem formulário, login nem conteúdo de usuário, mas a vitrine do portfólio deve mostrar a CSP mais estrita que a stack permite. Num site estático não existe nonce por requisição. O Astro calcula, no build, os hashes dos scripts e estilos que ele gera e grava a política num `<meta http-equiv="content-security-policy">`. Um `<meta>`, porém, não aceita `frame-ancestors`, e os demais cabeçalhos de segurança só existem como cabeçalho HTTP.

## Decisão

A política é dividida em duas, que o navegador aplica juntas (vale a interseção):

- **`<meta>` do Astro (`security.csp`):** `default-src 'self'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, mais `script-src` e `style-src` só com `'self'` e hashes. Nenhum `'unsafe-inline'` nem `'unsafe-eval'`.
- **Cabeçalho HTTP:** `frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`. Sem `script-src` ou `default-src` no cabeçalho, quem decide os scripts são os hashes do `<meta>`.
- **Demais cabeçalhos em todas as rotas:** HSTS de dois anos com subdomínios, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` negando câmera, microfone, localização, pagamento, USB e tópicos, e `Cross-Origin-Opener-Policy: same-origin`.
- **Uma fonte só:** tudo vem de `src/config/security.ts`. Uma integração no `astro.config.mjs` grava `dist/_headers` no fim do build; o Astro usa as mesmas diretivas no `<meta>`.
- **Estilos em arquivo:** `build.inlineStylesheets: "never"` e nenhum atributo `style`, para não precisar liberar estilo inline.
- **Links externos** (WhatsApp e Instagram) só em `https`, com `target="_blank"` e `rel="noopener noreferrer"`.

## Alternativas

- **`'unsafe-inline'` restrito à própria origem, como no portfolio-web:** necessário lá por causa do Next.js; aqui o Astro entrega os hashes sem custo.
- **CSP inteira no `_headers` com hashes calculados depois do build:** um bloco por página e um script frágil para manter.
- **HSTS com `preload`:** exige domínio próprio; fica para quando houver um.

## Consequências

- O `<meta>` só vale a partir de onde aparece no `<head>`; antes dele há apenas `charset`, `viewport`, título, descrição e ícones, nenhum recurso que execute código.
- Os testes E2E conferem os cabeçalhos servidos pelo `wrangler dev`, a ausência de `'unsafe-inline'`, de script inline, de atributo `style` e de handler `on*` no HTML, e falham se o navegador registrar erro de console ou requisição para outra origem.
- Qualquer serviço de terceiros (analytics, fontes externas, embeds) exige mudar `src/config/security.ts` e um novo ADR.
