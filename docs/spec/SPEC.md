# Consumed — Especificação

**Status:** approved — aprovado pelo usuário em 2026-11-10
**Última atualização:** 2026-11-10

## 1. Problema

Quem consome muitos filmes e livros não tem um lugar único para registrar o que já consumiu. O histórico fica espalhado entre planilhas, memória e aplicativos separados por tipo de mídia. A consequência é perder o histórico, repetir títulos e não conseguir responder perguntas simples como "o que eu consumi neste mês?".

## 2. Usuários e casos de uso

- **Usuário principal:** o autor do projeto, sozinho, no PC, pelo navegador.
- **Uso futuro previsto:** o mesmo usuário, por um app (adiado, fora do MVP).

Casos de uso do MVP:
1. Registrar um filme ou livro que acabei de consumir.
2. Consultar o histórico do que já consumi.
3. Encontrar um item por título, autor, editora ou direção.
4. Ver estatísticas do que consumi por período.

## 3. Objetivos

- **G1:** em até 5 minutos de uso, registrar um item e responder "o que eu consumi neste mês?" sem planilha.
- **G2:** ter uma base de dados única que sirva à web agora e ao app no futuro, sem migração destrutiva.
- **G3:** subir a aplicação no PC com um único comando, via Docker.

## 4. Não-goals (fora de escopo)

- App mobile nativo no MVP — apenas o app desktop.
- Multiusuário, compartilhamento ou recursos sociais.
- **Sincronização entre dispositivos.** Como o cofre é compartilhado é responsabilidade do usuário; o app apenas lê e escreve uma pasta local.
- Integrações externas (importar de Goodreads/Letterboxd, scrapers, APIs de terceiros).
- Monetização, cobrança ou planos.
- IA, recomendações automáticas ou enriquecimento automático de metadados.

## 5. Escopo

### MVP

- Registro de **filmes** e **livros** consumidos, com nota e comentário.
- Metadados por tipo — livro: autor, editora, páginas, idioma, ISBN; filme: direção, duração, roteiro, produção, distribuição, idioma.
- **Home:** últimos 5 filmes assistidos e últimos 5 livros lidos.
- **Films** e **Books:** grade de capas com busca.
- **Detalhe:** telas de filme selecionado e livro selecionado, com todos os metadados.
- **Statistics:** itens por mês, páginas por mês, nota média, editora mais lida e um gráfico.
- Persistência local em SQLite, numa pasta escolhida pelo usuário.

### Depois (não no MVP)

- App mobile.
- Outros tipos de mídia (séries, jogos, quadrinhos).
- Importação de dados externos.
- Metas de leitura e comparações entre anos.
- Sincronização entre dispositivos (responsabilidade do usuário).

### Modelo de dados (v1)

Uma única tabela `item`, com colunas específicas de cada tipo anuláveis — permite listar e agregar os dois tipos numa consulta só.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | TEXT | UUID, chave primária |
| `type` | TEXT | `filme` \| `livro` |
| `title` | TEXT | obrigatório, não vazio |
| `year` | INTEGER | opcional |
| `rating` | INTEGER | 0–10, opcional |
| `consumed_on` | TEXT | data ISO (`YYYY-MM-DD`), NOT NULL; opcional na entrada de livro, derivada de `finished_on` → `started_on` → hoje |
| `notes` | TEXT | opcional |
| `language` | TEXT | opcional |
| `image_path` | TEXT | relativo à pasta do cofre |
| `author` | TEXT (JSON) | livro, opcional; lista de nomes (`string[]`) |
| `publisher` | TEXT | livro, opcional |
| `pages` | INTEGER | livro, opcional |
| `isbn` | TEXT | livro, opcional |
| `reading_status` | TEXT | livro: `nao_lido` \| `lendo` \| `lido`, default `lido` |
| `director` | TEXT | filme, opcional |
| `runtime_min` | INTEGER | filme, opcional |
| `screenplay_by` | TEXT (JSON) | filme, opcional; lista de nomes (`string[]`) |
| `produced_by` | TEXT (JSON) | filme, opcional; lista de nomes (`string[]`) |
| `distributed_by` | TEXT (JSON) | filme, opcional; lista de nomes (`string[]`) |
| `started_on` | TEXT | opcional (leitura) |
| `finished_on` | TEXT | opcional (leitura) |
| `created_at` / `updated_at` | TEXT | ISO timestamp, gerados pelo app |

Imagens ficam em `<cofre>/imagens/`. O banco fica em `<cofre>/consumed.db`.

## 6. Requisitos funcionais

| ID | Requisito | Prioridade |
| --- | --- | --- |
| R1 | Cadastrar filme ou livro consumido: título, tipo, data de consumo (livro: derivada de início/fim) e nota de 0 a 10 | must |
| R2 | Registrar metadados opcionais por tipo — livro: autores (lista), editora, páginas, idioma, ISBN e estado de leitura; filme: direção, duração, roteiro/produção/distribuição (listas) e idioma. Campos de nomes sugerem valores já usados | must |
| R3 | Anexar pôster/capa, com o arquivo copiado para dentro do cofre | must |
| R4 | Home com os últimos 5 filmes e os últimos 5 livros lidos (estado `lido`) | must |
| R5 | Grades de filmes e de livros, mais recentes primeiro | must |
| R6 | Busca por título, autor, editora ou direção, insensível a acento e caixa, com resultado instantâneo | must |
| R7 | Tela de detalhe para filme e para livro | must |
| R8 | Editar e excluir um item | must |
| R9 | Estatísticas: itens por mês, páginas por mês, nota média e editora mais lida, com gráfico, contando apenas consumidos (todos os filmes e livros `lido`) | must |
| R10 | Escolher a pasta do cofre na primeira execução e lembrar da escolha | must |
| R11 | Registrar início e fim de leitura (opcionais), para permitir páginas por período | should |

*Métricas exatas de R9 foram fechadas na Rodada 7 (D27). R11 existe para não bloquear a decisão adiada sobre rateio de páginas.*

## 7. Requisitos não-funcionais

- **Execução local:** o produto é um executável desktop. Não há servidor nem container.
- **Rede:** nenhum serviço escuta em porta; nenhum acesso remoto. Sincronização entre dispositivos está fora do escopo.
- **Armazenamento:** banco SQLite numa pasta do usuário ("cofre"), com as imagens anexadas dentro dessa mesma pasta.
- **Durabilidade:** o cofre é copiável — backup é copiar a pasta. O app nunca grava fora da pasta escolhida.
- **Autenticação:** não se aplica; não há servidor.
- **Privacidade:** nenhuma telemetria, analytics ou chamada a serviço de terceiro. Logs não registram conteúdo dos itens.
- **Idioma:** interface em pt-BR; datas em `dd/mm/aaaa`; identificadores e commits em inglês.
- **Acessibilidade:** navegação por teclado e rótulos em formulários (exigido por `.ia-instructions` para UI nova).
- **Testes:** Vitest para unidade/componente e Playwright (Electron) para E2E; cobertura de linha e branch ≥80% em código novo.
- **Qualidade:** ESLint (Angular) + Prettier sem erros; build reprodutível.
- **CI:** GitHub Actions verde em PR (`georgejrdev/Consumed`).
- **Distribuição:** AppImage no Linux.
- **Desempenho:** Home e listas abrem em menos de 1 s com 5.000 itens no banco.

## 8. Critérios de aceite

Cada critério é verificável por um teste automatizado, um comando ou uma observação concreta.

**Primeira execução e cofre**
- [ ] **AC-1:** Em instalação limpa, o app abre na seleção de pasta; escolher uma pasta cria `consumed.db` nela.
- [ ] **AC-2:** A pasta escolhida persiste entre reinícios — reabrir o app não pede a pasta de novo.
- [ ] **AC-3:** O app nunca grava fora da pasta do cofre (verificável por teste de integração que observa o caminho resolvido).
- [ ] **AC-4:** Se a pasta estiver somente leitura, o app mostra erro claro e não apaga nem trunca dados.

**Cadastro e edição**
- [ ] **AC-5:** Cadastrar um livro com título, data e nota grava exatamente 1 registro e o item aparece na Home.
- [ ] **AC-6:** Nota fora de 0–10 (11, −1, 4.5) é rejeitada com mensagem e nada é gravado.
- [ ] **AC-7:** Título vazio ou só com espaços é rejeitado com mensagem e nada é gravado.
- [ ] **AC-8:** Anexar imagem copia o arquivo para dentro do cofre; apagar o arquivo original não impede a exibição no app.
- [ ] **AC-9:** Editar o título reflete na Home, na grade e no detalhe.
- [ ] **AC-10:** Excluir um item pede confirmação, remove do banco e desaparece de todas as telas.
- [ ] **AC-11:** O detalhe exibe os metadados preenchidos e omite os vazios (sem "null", sem rótulo órfão).

**Listas e busca**
- [ ] **AC-12:** A Home mostra no máximo 5 filmes e 5 livros, ordenados por data decrescente.
- [ ] **AC-13:** Films lista todos os filmes e Books todos os livros, mais recentes primeiro, sem misturar tipos.
- [ ] **AC-14:** Buscar "ilha" encontra "A Ilha Misteriosa"; buscar "ILHA" encontra o mesmo item.
- [ ] **AC-15:** Buscar por autor, editora ou direção encontra o item por esses campos.
- [ ] **AC-16:** Busca sem resultado mostra estado vazio explícito, não tela em branco.

**Estatísticas**
- [ ] **AC-17:** "Itens por mês" é igual à contagem de registros agrupados pela data de consumo.
- [ ] **AC-18:** "Páginas por mês" soma `pages` dos livros cuja data de consumo cai no mês.
- [ ] **AC-19:** "Nota média" é a média aritmética das notas não nulas, exibida com 1 casa decimal.
- [ ] **AC-20:** "Editora mais lida" é a editora com maior contagem; empate resolve em ordem alfabética (determinístico).
- [ ] **AC-21:** Sem dados, a tela mostra estado vazio e não lança erro.

**Qualidade e entrega**
- [ ] **AC-22:** `npm test` executa a suíte Vitest e passa 100%.
- [ ] **AC-23:** A cobertura de linha e branch do código novo é ≥80%, e o build falha abaixo disso.
- [ ] **AC-24:** `npm run e2e` executa o Playwright contra o Electron e passa.
- [ ] **AC-25:** `npm run lint` termina sem erros e sem warnings.
- [ ] **AC-26:** `npm run build` gera o app e `npm run make` (alias de `npm run package`) gera o AppImage no Linux.
- [ ] **AC-27:** O workflow do GitHub Actions roda lint, testes, build e E2E e fica verde em PR.
- [ ] **AC-28:** Com 5.000 itens no banco, a Home carrega em menos de 1 s na máquina de referência.

**Livros, nomes e capas (revisão 2026-11-10)**
- [ ] **AC-29:** Um livro cadastrado sem data de consumo recebe `consumed_on` igual a `finished_on`, senão `started_on`, senão a data atual; editá-lo sem datas preserva a data já gravada; o detalhe mostra apenas "Início da leitura" e "Fim da leitura".
- [ ] **AC-30:** `author`, `screenplay_by`, `produced_by` e `distributed_by` aceitam vários nomes, exibidos como chips, e sugerem valores já usados filtrados pelo tipo; `publisher`, `director` e `language` aceitam um valor com sugestões.
- [ ] **AC-31:** O livro tem estado `nao_lido`, `lendo` ou `lido`; a capa fica em grayscale, com saturação reduzida ou colorida, respectivamente, no card e no detalhe; apenas `lido` aparece na Home e nas Estatísticas.
- [ ] **AC-32:** A capa é servida por `media://vault/<arquivo>` e carrega no app empacotado; caminhos fora de `<cofre>/imagens/` retornam 403/404.
- [ ] **AC-33:** As observações aparecem num bloco único de largura total, abaixo da linha com capa e informações do detalhe.

## 9. Restrições

> **Arquitetura decidida na Rodada 4 (D19):** app desktop nativo com cofre de arquivos. As restrições de stack da hipótese "servidor local em Docker" (Spring, Postgres, Maven, Flyway, Docker, nginx, OpenAPI) foram **descartadas**. Angular sobrevive como frontend.

- **Arquitetura (D19):** app desktop nativo. Sem servidor, sem Docker, sem autenticação.
- **Armazenamento (D23):** banco SQLite local (`consumed.db`) numa pasta do usuário — o "cofre", que ele pode mover, copiar ou versionar.
- **Shell (D24):** Electron 45.2.3, com Angular 22 no renderer.
- **Sync:** **fora do escopo.** O app não sincroniza; compartilhar a pasta é responsabilidade do usuário.
- **Distribuição:** instalador desktop; no Windows, assinatura recomendada (Smart App Control bloqueia app não assinado).
- **Monorepo:** mantido — shell nativo + app compartilhado, se houver mais de um alvo.
- **Versões pinadas até aqui (nov/2026):** Node 24 LTS (Angular 22 exige `^22.22.3 || ^24.15.0 || >=26`), TypeScript 6.0.x (Angular 22 exige `>=6.0 <6.1` — **TS 7 é incompatível**), Angular 22.2.5, Electron 45.2.3, Vitest 5.1.0, Playwright 1.65.0, SQLite (`better-sqlite3` 13.0.3 ou `node:sqlite`).
- **Uso pessoal de um único usuário**, sem prazo externo declarado.
- **Custo zero**: nada de nuvem, hospedagem paga ou serviço de terceiro. Tudo roda na máquina do usuário.
- **Sem exposição de rede:** nenhum serviço escuta em porta; não há acesso remoto.
- **Sem autenticação:** não há servidor a proteger; o cofre é protegido pelo sistema de arquivos do usuário.
- **Instruções do repositório** em `.ia-instructions/`, que valem como restrição de processo:
  - Conventional Commits em inglês, um commit por mudança lógica.
  - Branch por tipo a partir de `main`, merge `--no-ff` preservando commits.
  - Cobertura tripla de testes (feliz / borda / falha) e ≥80% de linha e branch em código novo.
  - Suíte executada localmente antes e depois da mudança; proibido alterar teste legado para passar.

## 10. Decisões

| # | Decisão | Racional |
| --- | --- | --- |
| D1 | Produto é registro de mídia consumida; mídias iniciais: filmes e livros | Leitura direta do nome, MVP pequeno, valor imediato |
| D2 | Profundidade de MVP, 3–4 rodadas de spec | Repositório vazio; evita over-engineering e ainda cobre as portas sem volta |
| D3 | Usuário único, PC, navegador | Elimina multi-tenancy e auth complexa do MVP |
| D4 | Monorepo com web agora e app futuro | Decisão explícita do usuário; exige backend desacoplado do renderizador |
| D5 | Não-objetivos: app, multiusuário, integrações, monetização, IA | Cada um é porta sem volta e não bloqueia o marco de sucesso |
| D6 | Custo zero, solo, sem prazo externo | MVP pessoal não justifica ops nem custo recorrente |
| D7 | Só `localhost`, sem autenticação no MVP | Um usuário, uma máquina; gatilho de auth ao expor fora de localhost |
| D8 | Sem telemetria, analytics ou terceiros; logs sem conteúdo | Nenhum dado sai da máquina; LGPD por ausência de terceiro |
| D9 | Exportar/importar JSON pela interface no MVP | É a única perda irreversível; manual é mais barato que automação |
| D10 | UI pt-BR, código e commits em inglês, datas `dd/mm/aaaa` | i18n no MVP é custo sem usuário |
| D11 | Backend em Java + Spring; frontend em Angular | Decisão do usuário |
| D12 | Persistência via Spring Data JPA (Hibernate) | "ORM do Spring", escolhido pelo usuário |
| D13 | Monorepo com dois ecossistemas de build (Maven + npm) | Consequência de D11 |
| D14 | Postgres em container + JPA + Flyway | JPA é de primeira classe sobre Postgres; SQLite exigiria dialeto comunitário |
| D15 | Contrato OpenAPI gerado (`springdoc`) + tipos TS gerados | Fonte única entre Java e TypeScript |
| D16 | Maven como build do backend | Convenção em Spring; pouca cerimônia |
| D17 | `apps/api`, `apps/web`, `contracts/`, Makefile e compose na raiz | Builds nativos, sem orquestrador |
| D18 | Dois containers: nginx + Spring com proxy `/api` | Escolha do usuário; mesma origem, sem CORS |
| D19 | App desktop nativo + cofre de arquivos (modelo Obsidian); sync fora do escopo | Único modelo coerente com "cofre de arquivos"; compartilhar é problema do usuário |
| D20 | Estatísticas são requisito central | Justifica o app; Obsidian descartado pelo usuário |
| D21 | Metadados opcionais por tipo no mesmo arquivo | Validação forte nos campos que alimentam estatística |
| D22 | Sincronização fora do escopo | Decisão explícita do usuário |
| D23 | Banco SQLite local, não arquivos por item | A comparação com Obsidian era sobre o formato do cofre, não sobre Markdown; sync fora de escopo remove a razão para arquivos |
| D24 | Shell Electron com Angular no renderer | Uma linguagem só, I/O via Node, E2E com Playwright, webview consistente |
| D25 | Nota inteira de 0 a 10 | O design do Figma já usa essa escala |
| D26 | Imagens copiadas para dentro do cofre | Mantém o cofre autossuficiente; URL apodrece |
| D27 | Estatísticas: itens/mês, páginas/mês, nota média, editora mais lida + gráfico | Derivam de campos já modelados |
| D28 | Banco em pasta escolhida pelo usuário (`consumed.db`) | Preserva o conceito de cofre; backup trivial |
| D29 | Busca por título, autor, editora ou direção, sem acento/caixa | Cobre a maioria dos casos sem indexação extra |
| D30 | Cadastro e edição em diálogo modal | Mantém o contexto da grade; comporta os campos em duas colunas |
| D31 | Vitest + Playwright (Electron) + gate de 80% | Exigência de `.ia-instructions`; cobre a fronteira IPC/SQLite |
| D32 | ESLint (Angular) + Prettier | Único que analisa templates Angular, onde está a maior parte do código |
| D33 | `electron-builder` | Menos configuração para dois alvos |
| D34 | GitHub Actions (`georgejrdev/Consumed`) | Remote confirmado no repositório |
| D35 | Linux apenas (AppImage + deb) | Sistema do usuário único; Windows quando houver motivo |

**D12 a D18 foram substituídas por D19** (ver Kickoff, Rodada 4). Elas descrevem a hipótese "servidor local em Docker", incompatível com sincronização por arquivo. D11 (Angular) sobrevive parcialmente: Angular permanece como frontend.

## 11. Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Monorepo cedo demais gera tooling e cerimônia sem código | Médio | Workspace mínimo, sem pacote compartilhado até existir consumidor real |
| Backend acoplado ao framework web bloquear o app futuro | Alto | Contrato HTTP explícito, independente do renderizador |
| Escopo crescer para "todas as mídias" antes do MVP fechar | Médio | Modelo de dados com tipo extensível, UI limitada a filme/livro |
| Uso pessoal virar multiusuário sem decisão | Médio | Gatilho declarado em D7: exposição fora de localhost exige auth antes do acesso |
| Conflito causado por ferramenta externa de compartilhamento | Médio | Fora do escopo do app; o usuário copia/move o arquivo do banco por conta própria |
| App mobile futuro precisa ser um segundo cliente do mesmo formato | Médio | Modelo de dados e contrato explícitos desde a v1; nenhuma lógica de sync no app |
| Estatísticas definidas só depois de a UI existir | Médio | Fechar métricas na Rodada 7, antes do código |
| Driver SQLite nativo exige rebuild por versão do Electron | Baixo | Avaliar `node:sqlite` embutido vs `better-sqlite3` + `electron-rebuild` |
| Smart App Control no Windows 11 bloqueia app não assinado | Médio | Assinar o instalador ou documentar o passo manual de liberação |
| Entrada de dados mais lenta que no Obsidian pronto | Médio | Medir contra o marco de sucesso (5 min para registrar e consultar) |

## 12. Perguntas abertas

- [ ] Formato do arquivo por item: **resolvido** — banco SQLite local (D23)
- [ ] Shell nativo: **resolvido** — Electron 45.2.3 (D24)
- [ ] Painel lateral da Home: deixado em branco pelo usuário, sem decisão — o MVP não reserva espaço nem inventa conteúdo
- [ ] Driver SQLite: `better-sqlite3` + rebuild vs `node:sqlite` — antes do código
- [ ] Medição de "páginas por período": hoje AC-18 usa a data de consumo; rateio por intervalo fica para depois
- [ ] Reconsumo: um registro por evento vs por obra — adiada
- [ ] Caminho para o app mobile futuro — depois do MVP

## 13. Change log

| Data | Mudança | Motivo |
| --- | --- | --- |
| 2026-11-10 | Criação inicial a partir da Rodada 0 | Enquadramento do produto e não-objetivos |
| 2026-11-10 | Rodada 1: custo, rede/auth, privacidade, backup, idioma | Restrições fechadas; offline adiado por dependência de infraestrutura |
| 2026-11-10 | Rodada 2: stack Java/Spring + Angular, Postgres, OpenAPI, Maven, dois containers | Decisão do usuário; substitui a recomendação TypeScript e a resposta SQLite |
| 2026-11-10 | Rodada 4: pivot para app nativo + cofre de arquivos; D12–D18 descartadas | Requisito de sincronização por arquivo (Syncthing) é incompatível com servidor e banco |
| 2026-11-10 | Rodada 5: estatísticas centrais (D20), campos por tipo (D21), sync fora do escopo (D22) | Decisão do usuário; sync deixa de ser responsabilidade do app |
| 2026-11-10 | Rodada 6: banco SQLite local (D23), Electron (D24), telas do Figma | Correção do usuário: Obsidian era referência de cofre, não de formato; UI definida em arquivo Figma |
| 2026-11-10 | Rodada 7: nota 0–10, imagens locais, métricas de estatística, pasta do cofre, busca | Decisões do usuário a partir do Figma |
| 2026-11-10 | Rodada 8: modal de cadastro, testes, lint, empacotamento, CI, alvo Linux; critérios de aceite escritos | Última rodada de decisões; SPEC pronto para aprovação |
| 2026-11-10 | **Aprovado pelo usuário** | Fronteira de decisões vazia; pendências declaradas |
