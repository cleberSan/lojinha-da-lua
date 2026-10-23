# ADR-0003: Imagens só da loja, sem personagens ou pessoas de terceiros

- Status: aceito
- Data: 2026-10-23

## Contexto

O material enviado pela loja são oito capturas de tela de flyers de preço (720 px de largura) e o logo recortado de uma foto de perfil. Sete dos oito flyers mostram personagens e pessoas de terceiros: Mickey e Minnie, personagens de anime, Tupac, Eminem e uma foto de banco de imagens. Os cantos do logo mostram partes do rosto de pessoas.

Num site de venda, essas imagens viram anúncio comercial de marca e de imagem alheias. Num repositório público, também podem gerar pedido de remoção (DMCA) que afeta o repositório inteiro.

## Decisão

- **Logo:** recortado em círculo, sem os cantos com rostos (`src/assets/marca/logo.png`).
- **Fotos:** só os trechos sem terceiros: a camiseta "Sua arte aqui" e a polo com o logo da loja, colocadas no mesmo painel azul e ciano dos flyers.
- **Ilustrações:** os outros seis produtos usam desenhos neutros em SVG (camiseta, oversized e as quatro canecas com uma lua crescente), marcados com o selo "Ilustração" e a legenda "não é foto do produto". O schema exige `kind: "ilustracao"` em toda imagem que não é foto, e um teste confere.
- **Troca:** quando a loja enviar fotos próprias sem terceiros, cada produto troca a imagem no seu JSON, com `kind: "foto"`.

## Alternativas

- **Usar os prints como estão:** mais fiel ao Instagram, mas com o risco descrito acima.
- **Esperar fotos novas:** risco baixo, mas atrasa o lançamento sem prazo.

## Consequências

- O catálogo fica menos vistoso até chegarem as fotos da loja.
- Os scripts que geraram os recortes e as ilustrações não ficam no repositório: os arquivos em `src/assets` são a fonte. Logo e fotos são da Lojinha Da Lua e não são cobertos pela licença MIT do código.
