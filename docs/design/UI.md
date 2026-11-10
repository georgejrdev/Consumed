# Consumed — referência visual (extraída do Figma)

Fonte: https://www.figma.com/design/9DQhGphfeBrbPN3KTEPP71/Consumed
Telas: Home, Films, Books, Filme Selected, Book Selected, Statistics (vazia).

Este documento é a referência para implementar a UI. Nenhum asset do Figma é usado em runtime:
capas vêm do cofre, o banner de perfil é decorativo e o ícone de filtro é um SVG simples desenhado no projeto.

## Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#14181c` | fundo da aplicação |
| `--surface` | `#121416` | barra de busca, painel lateral |
| `--chrome` | `#0f1011` | top bar, navbar, footer |
| `--border` | `#aeaeae` | borda de 2px em navbar, capas, busca |
| `--accent` | `#ffe681` | item de navegação ativo |
| `--text` | `#ffffff` | texto principal |
| `--text-muted` | `#c7c7c7` | valores de metadados |
| `--text-dim` | `#d9d9d9` | placeholder de busca |
| `--rating` | `#18831c` | bloco da nota |
| `--danger` | `#b3261e` | ações destrutivas |

Fonte: `Roboto, system-ui, sans-serif`. Títulos de seção e navegação em maiúsculas.
Rebordo das capas: `2px solid var(--border)`, sem arredondamento.

## Grade de layout

- Largura de referência 1440px; conteúdo centralizado em 1140px (margens de 150px).
- Top bar: 72px de altura, fundo `--chrome`.
- Banner de perfil: 1140×250 abaixo da top bar (decorativo; forma cinza `#8b8b8b` com círculo claro sobreposto à esquerda). Não contém dados do usuário.
- Navbar: 1140×64, fundo `--chrome`, borda 2px, sobrepondo a base do banner. Itens HOME / FILMS / BOOKS / STATISTICS, 24px, `--accent` quando ativo.
- Footer: 32px de altura, fundo `--chrome`.
- Conteúdo começa em ~450px do topo.

Em telas menores que 1140px o conteúdo usa `width: min(1140px, calc(100% - 48px))`; a UI nunca deve criar rolagem horizontal.

## Home

- Título de seção: 24px, branco, `LAST 5 MOVIES WATCHED` / `LAST 5 BOOKS READ`.
  Em pt-BR: **ÚLTIMOS 5 FILMES ASSISTIDOS** / **ÚLTIMOS 5 LIVROS LIDOS**.
- Capas 156×231, borda 2px, espaçamento de 16px, alinhadas à esquerda.
- Título 44px acima da primeira capa.
- Painel lateral direito (264×571) foi deixado em branco pelo usuário: **não implementar**.

## Films / Books

- Barra de busca: 1140×40, fundo `--surface`, borda 2px, placeholder 20px centralizado.
  Ícone de filtro/busca à direita dentro da barra.
- Grade de capas 200×296, borda 2px, 5 colunas, gap 35px.
- Estado vazio explícito (texto centralizado em `--text-muted`), nunca tela em branco.

## Detalhe (Filme / Livro)

- Capa 350×518 à esquerda, borda 2px.
- Título 48px: `Título (ano)`, ano em `--text-muted`.
- Metadados em 24px, rótulo branco, valor `--text-muted`, uma linha por campo, 36px de altura.
  Campos vazios são omitidos (nem rótulo, nem valor).
- Bloco da nota: 150×72, fundo `--rating`, número 48px `Roboto Black`, branco.
- Ao lado da nota: filme mostra `Assistido em:`; livro mostra `Início da leitura:` e `Fim da leitura:` (sem "Lido em"), com datas `dd/mm/aaaa`.
- Capa e informações ficam lado a lado num wrapper `.main`. Observações (`notes`) ocupam um bloco único de largura total, fundo `--surface` e borda 2px, ABAIXO dessa linha.
- Estado do livro na capa: `nao_lido` → `filter: grayscale(1)`; `lendo` → `filter: saturate(0.45)`; `lido` → sem filtro. O mesmo vale para o card.
- Ações Editar e Excluir no detalhe; Excluir pede confirmação.

## Statistics (o Figma está vazio — definido pelo SPEC, D27)

Quatro cartões + um gráfico, no mesmo estilo (fundo `--surface`, borda 2px, rótulo em `--text-muted`):

1. **Itens por mês**
2. **Páginas por mês**
3. **Nota média** (1 casa decimal)
4. **Editora mais lida**
5. **Gráfico** de barras de itens por mês (SVG puro, sem dependência nova).

Filtro de período (mês/ano) no topo. Sem dados: estado vazio explícito (AC-21).

## Formulário (modal — D30)

Não existe no Figma. Mesmo estilo: fundo `--bg`, borda 2px, campos com rótulo visível,
duas colunas, foco por teclado, `Esc` fecha, botão primário em `--accent` com texto escuro.
Campos por tipo:

- Comuns: título, tipo, nota (0–10), idioma, ano, observações, capa.
- Data de consumo aparece apenas para filme.
- Livro: estado (não lido / lendo / lido), autores (lista), editora, páginas, ISBN, início e fim de leitura.
- Filme: direção, duração (min), roteiro (lista), produção (lista), distribuição (lista).
- Campos de nomes oferecem sugestões dos valores já usados no tipo; `author`, `screenplay_by`, `produced_by` e `distributed_by` aceitam vários valores como chips.

Textos da interface em pt-BR; datas exibidas em `dd/mm/aaaa`.
