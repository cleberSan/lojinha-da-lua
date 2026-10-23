# ADR-0006: "Montar pedido" no navegador, com ilha React e localStorage

- Status: aceito
- Data: 2026-10-23

## Contexto

Até aqui, cada botão "Pedir" mandava um item por mensagem. Quem quer duas camisetas e uma caneca precisava enviar três mensagens ou escrever o pedido à mão. A loja fecha tudo pelo WhatsApp e o site continua sem backend nem dado pessoal (ADR-0005). O ADR-0001 já previa uma ilha React só para essa interação, e o Cleber escolheu React no plano do projeto.

## Decisão

- **Duas ilhas React, só onde há interação:** o painel "Montar pedido" na página de cada produto (`client:visible` com margem de 300px, para hidratar pouco antes de aparecer) e a página `/pedido` (`client:load`). Início, catálogo, contato e privacidade continuam sem JavaScript, e um teste E2E garante isso.
- **O aparelho guarda só a escolha:** `localStorage` na chave `lojinha-da-lua:pedido`, com `{ version: 1, items: [{ slug, variant, quantity }] }`. Nome e preço vêm sempre do catálogo do build, então um preço editado no navegador nunca chega à mensagem.
- **Leitura defensiva:** `parseStoredOrder` (`src/domain/order.ts`) descarta e conta o que não confere (produto ou variação que saiu do catálogo, quantidade fora de 1 a 99, campo de outro tipo, JSON quebrado, conteúdo acima de 10 mil caracteres), soma linhas repetidas e limita o pedido a 20 linhas. A página avisa quando algum item foi retirado. O catálogo vira um `Map`, para que um slug como `__proto__` não encontre nada.
- **Uma fonte de estado:** as ilhas leem o `localStorage` com `useSyncExternalStore` (`src/islands/useStoredOrder.ts`). Mudanças da mesma aba chegam por um evento próprio, e as de outras abas pelo evento `storage` do navegador. Não há estado duplicado para sincronizar nem biblioteca de estado.
- **Regras fora do React:** adicionar, somar, limitar, remover, ler e gravar ficam em `src/domain/order.ts` e `src/domain/order-storage.ts`, com testes unitários. As ilhas são a camada de tela, coberta pelos testes E2E.
- **Uma mensagem:** a página `/pedido` monta a mensagem com o mesmo `buildOrderMessage` do botão "Pedir" e mostra o texto antes do envio. Um teste confere que o maior pedido possível com o catálogo atual cabe no limite de 1.500 caracteres; se passar, a tela pede para dividir o pedido em vez de quebrar.
- **Sem JavaScript ou sem armazenamento** (bloqueio de dados de sites, modo privado antigo): os botões "Pedir" de cada variação continuam funcionando, e as ilhas explicam isso em vez de falhar calado.
- **Acessibilidade:** rótulos com o nome do item em cada controle, avisos em `role="status"`, foco levado ao título da lista depois de remover ou esvaziar, confirmação antes de esvaziar e `aria-disabled` em vez de `disabled` nos botões − e +, para o foco não se perder.

## Alternativas

- **JavaScript sem framework (`<script>` do Astro):** menos de 5 KB, mas o plano escolheu React; a lógica que importa está em `src/domain` e serve para qualquer camada de tela.
- **Preact com `preact/compat`:** cerca de 10 KB em vez dos 70 KB (gzip) do React e mesma API. Fica como otimização possível se o peso da página de produto pesar no celular.
- **Carrinho no servidor ou cookies:** exigiria backend, guardaria dados no servidor e pediria aviso de cookies, sem ganho para quem fecha pelo WhatsApp.
- **`sessionStorage`:** some ao fechar a aba e não aparece em outra aba; o pedido costuma ser montado com calma, em mais de uma visita.
- **Biblioteca de estado (Zustand, Nano Stores):** dependência a mais para um estado que o `localStorage` já guarda.

## Consequências

- A página de produto e a `/pedido` carregam cerca de 75 KB de JavaScript (gzip), quase tudo do React. As demais páginas seguem sem nenhum.
- Os scripts que o Astro coloca no HTML para hidratar as ilhas entram na CSP por hash, calculado no build (ADR-0004).
- O pedido fica só no aparelho: trocar de celular ou limpar os dados do navegador apaga o pedido. A página de privacidade explica isso.
- Mudar o formato salvo exige subir `version` em `serializeOrder`; pedidos antigos passam a ser lidos como vazios.
