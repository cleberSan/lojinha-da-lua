# ADR-0009: Fotos dos flyers com as estampas originais

- Status: aceito
- Data: 2026-10-24
- Substitui: [ADR-0003](0003-imagens-sem-terceiros.md)

## Contexto

O ADR-0003 deixou seis dos oito produtos com ilustrações neutras, porque as únicas imagens da loja são capturas de tela dos flyers de preço (720 px de largura), e sete delas mostram personagens e pessoas de terceiros: Mickey e Minnie, personagens de anime, Tupac, Eminem e uma foto de banco de imagens.

Cleber, responsável pelo site, pediu as imagens reais dos produtos, com qualidade melhor e sem sair do padrão dos flyers. Em 2026-10-24, ele escolheu usar as estampas originais e aceitou o risco de direitos de imagem e de marca, incluindo um pedido de remoção (DMCA) contra o repositório público.

## Decisão

- **Fonte:** o painel de produto de cada flyer, sem título, preço e contatos, que o site já mostra em texto.
- **Ampliação:** Real-ESRGAN `realesr-general-x4v3` (licença BSD-3), quatro vezes, rodando localmente. Nenhuma imagem passa por serviço de terceiros e nada é gerado do zero: a rede só reconstrói detalhe do que está no flyer.
- **Texto pequeno da loja:** a rede inventa dígitos em texto pequeno. Nas costas da polo, onde estão o WhatsApp e o Instagram da loja, a ampliação é Lanczos, mais suave porém fiel. Todas as imagens foram conferidas a olho contra os flyers.
- **Padrão:** cartão quadrado de 1200 px com o painel azul e ciano dos flyers. O fundo é estendido com o mesmo gradiente para fechar o quadrado, e os cantos arredondados ficam no CSS, como nos outros cartões. JPEG opaco, para a mesma imagem servir de prévia de link (ADR-0007). O build gera AVIF e WebP de 300 a 1200 px.
- **Logo:** ampliado da mesma forma, de 314 para 704 px, para ficar nítido no destaque da página inicial em telas de alta densidade.
- **Ilustração continua possível:** o schema mantém `kind: "ilustracao"`, com selo e legenda, e o JSON-LD continua sem imagem para ilustração.

## Se chegar um pedido de remoção

1. Trocar só o produto citado: voltar a ilustração dele, que está no histórico do Git antes deste ADR (`git show 0e18b04:src/assets/produtos/<produto>.svg`), com `kind: "ilustracao"` no JSON. O resto do catálogo fica como está.
2. Se o pedido for sobre o repositório inteiro, reverter o PR deste ADR. O site volta ao estado do ADR-0003 e o histórico do Git precisa de limpeza à parte.
3. Quando a loja enviar fotos próprias, sem terceiros, elas substituem as dos flyers.

## Alternativas

- **Manter as ilustrações (ADR-0003):** sem risco, mas o catálogo não mostra o que a loja vende.
- **Recortar só trechos sem terceiros:** sobram dois produtos; nenhuma caneca tem um trecho que mostre o produto sem estampa de terceiros.
- **Refazer as imagens com IA generativa:** o produto deixaria de ser o que a loja entrega, e o pedido foi não sair do padrão das imagens originais.
- **Esperar fotos novas da loja:** continua sendo o melhor caminho, mas sem prazo.

## Consequências

- O catálogo mostra os produtos como estão no Instagram da loja, com resolução para telas de alta densidade.
- O risco de direitos de terceiros está no site e no repositório, aceito pelo responsável. As estampas são de seus donos, e as imagens não são cobertas pela licença MIT do código.
- A ampliação pode inventar detalhe em rostos pequenos; nas estampas isso fica aceito, e no texto da loja foi evitado.
- Os scripts e o modelo não ficam no repositório, porque precisariam dos flyers com estampas de terceiros como entrada: os arquivos em `src/assets` são a fonte.
