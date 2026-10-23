# ADR-0005: Pedido pelo WhatsApp, sem backend e sem dado pessoal no site

- Status: aceito
- Data: 2026-10-23

## Contexto

A loja já atende e fecha pedidos pelo WhatsApp. Pagamento online, carrinho com estoque ou cadastro exigiriam backend, gateway de pagamento, tratamento de dados pessoais (LGPD) e custo, sem pedido da loja para isso.

## Decisão

- Cada variação de produto tem um link `https://wa.me/55DD9XXXXXXXX?text=...` com a mensagem pronta: produto, variação, quantidade, preço de referência e total (`src/domain/whatsapp.ts`).
- O texto é codificado com `encodeURIComponent` (espaço vira `%20`, como o WhatsApp documenta) e não consegue injetar outros parâmetros na URL.
- O número que recebe os pedidos e os demais contatos ficam em `src/config/store.ts`, validados no build: celular brasileiro completo, com o 55, e exatamente um número recebendo pedidos.
- O site não coleta nome, telefone, endereço nem arte do cliente. Isso tudo é combinado na conversa.
- Os preços aparecem como valores de referência, com o mês em que foram conferidos, e o valor final é confirmado no WhatsApp.

## Alternativas

- **Loja virtual com pagamento (Shopify, Nuvemshop, gateway próprio):** custo mensal ou por venda e dados pessoais a proteger, sem demanda da loja.
- **Formulário de pedido:** exigiria backend ou serviço de terceiros para receber os dados, e a loja continuaria respondendo pelo WhatsApp.

## Consequências

- O "Montar pedido" com vários itens guarda no navegador do cliente só produto, variação e quantidade, sem dado pessoal (PR seguinte).
- O atendimento e os dados trocados no WhatsApp são responsabilidade da loja, não do site.
- Um link de WhatsApp sem o 55 do Brasil, como o que hoje está no bio.site da loja, não passa na validação.
