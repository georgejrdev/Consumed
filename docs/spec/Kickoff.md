# Kickoff — Consumed

**Iniciado:** 2026-11-10
**Status:** completo

## Contexto do repositório (verificado antes da primeira pergunta)

- Repositório praticamente vazio: apenas `.git/` e `.ia-instructions/`.
- Sem `README.md`, `AGENTS.md`, manifests de build, código ou `docs/spec/` prévio.
- `.ia-instructions/` estabelece regras que passam a valer como **restrições do projeto**:
  - Commits em inglês, formato `<type>(<scope>): <descrição imperativa>`, tipos fechados (`feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `chore`), `wip:` apenas em branch.
  - Branches por tipo (`feature/`, `bugfix/`, `hotfix/`, `refactor/`, `chore/`, `docs/`, `test/`, `ci/`), merge `--no-ff` preservando commits, nunca squash da branch inteira, `--force-with-lease`.
  - Testes: cobertura tripla obrigatória (feliz / borda / falha), ≥80% de linha e branch em código novo, testes determinísticos e isolados, mocking só em fronteiras de sistema, execução local obrigatória da suíte, proibido alterar teste legado para "fazer passar".

---

## Rodada 0 — Enquadramento

**Data:** 2026-11-10

**Perguntas**

1. Q: O que é o "Consumed"? (a) registro de mídia consumida, (b) controle de consumo recorrente, (c) metering/billing, (d) outro.
   A: **(a) Registro de mídia consumida**, inicialmente **filmes e livros**.
2. Q: Tipo de projeto e profundidade da spec (script, ferramenta interna, MVP, produção, biblioteca).
   A: **MVP** (3–4 rodadas de entrevista).
3. Q: Quem usa e em que situação.
   A: **O próprio autor, no PC, inicialmente.** Contexto adicional dado pelo usuário: no futuro existirão **duas versões** — uma em **Docker no PC que sobe uma página web**, e futuramente **um app**. O repositório é, desde já, um **monorepo**. A parte do app fica explicitamente adiada.
4. Q: O que significa "deu certo" no primeiro marco.
   A: **Aceitou a recomendação**: em uma sessão de 5 minutos registrar o que consumiu e conseguir responder "o que eu consumi neste mês?" sem planilha.
5. Q: Não-objetivos a declarar desde já.
   A: **Aceitou a recomendação completa**: (a) sem app mobile nativo no MVP — só web responsiva; (b) sem multiusuário/social; (c) sem integrações externas; (d) sem monetização/cobrança/planos; (e) sem IA/recomendações automáticas.

**Decisões**

- **D1 — O produto é um registro de mídia consumida.** Escopo de mídia inicial: **filmes e livros**. Rationale: leitura mais direta do nome, MVP pequeno, valor imediato para um único usuário.
- **D2 — Profundidade: MVP (3–4 rodadas).** Rationale: repositório vazio, custo de errar escopo alto agora; cobre as portas sem volta sem exigir compliance/observabilidade prematuras.
- **D3 — Usuário único, uso pessoal, no PC via navegador.** Rationale: elimina multi-tenancy e auth complexa do MVP, mantendo o caminho aberto.
- **D4 — O repositório é um monorepo, com dois alvos previstos: web (agora, em Docker no PC) e app (futuro, adiado).** Rationale: decisão explícita do usuário. Consequência arquitetural: o backend não pode ser acoplado ao renderizador web; precisa de um contrato consumível por outro cliente.
- **D5 — Não-objetivos do MVP:** app nativo, multiusuário/social, integrações externas, monetização, IA/recomendações. Rationale: cada um adiciona uma porta sem volta (auth multiusuário, billing, ingestão de terceiros) sem bloquear o marco de sucesso.

**Adiado**

- App mobile: fora do MVP por decisão do usuário ("deixe pra depois"). Precisa apenas que o monorepo e o contrato de API não o impeçam.

**Assunções**

- O MVP pode ser entregue por uma pessoa, sem prazo externo rígido. Validar na Rodada 1.
- "Consumido" significa "já terminei/assisti", não "estou consumindo". Validar na Rodada 3 (modelo de dados).

---

## Pesquisa — fatos de stack (novembro/2026)

Levantamento feito em paralelo às Rodadas 0–1, para a Rodada 2 chegar com versões reais. **Não é decisão**; decisões só entram na Rodada 2.

| Camada | Versão estável | Confiança |
| --- | --- | --- |
| Node.js LTS | 26.13.0 (Active LTS desde 2026-10-28; EOL 2029-04-30) | Confirmed (nodejs.org, schedule.json) |
| TypeScript | 7.0.2 | Confirmed (registry npm, blog MS) |
| pnpm | 12.18.0 | Confirmed (registry npm) |
| Turborepo / Nx | 2.11.10 / 24.0.5 | Confirmed (registry npm) |
| Next.js | 16.4.6 | Confirmed (registry npm, blog Next 16) |
| Vite / React / plugin-react | 8.3.7 / 19.3.1 / 6 | Confirmed (registry npm, blogs) |
| Hono / Fastify / NestJS | 4.13.17 / 5.12.8 / 12.4.2 | Confirmed (registry npm) |
| Elysia | 2.0.0-rc no dist-tag `latest` | Confirmed (registry npm) — **latest é RC** |
| Drizzle ORM | 0.45.4 (1.0 em RC) | Confirmed (registry npm) |
| Prisma | client 7.10.1; CLI `latest` = 8.0.0-rc.33 | Confirmed (registry npm) — **latest é RC** |
| better-sqlite3 | 13.0.3 | Confirmed (registry npm) |
| Zod / Valibot | 4.6.7 / 1.5.0 | Confirmed (registry npm) |
| Vitest / Playwright | 5.1.0 / 1.65.0 | Confirmed (registry npm) |
| Expo | 58.0.23 (SDK 58) | Confirmed (registry npm) |
| Litestream | 0.5.18 (binário Go, ativo em 2026-11-03) | Confirmed (release GitHub) |

Achados que afetam decisões futuras:

- **TypeScript 7.0 não expõe API de compilador.** Ferramentas que importam `typescript` (typescript-eslint) exigem alias para TS 6. Alternativa: adotar **Biome** em vez de ESLint. Decidir na Rodada 4.
- **Drizzle está em 0.x** com 1.0 em RC: fixar versão exata, sem `^`.
- **`latest` de Prisma e Elysia apontam para RC** — instalar sem pin pega release instável.
- **Pacote npm `litestream` (0.0.5, 2022) não é o Litestream real** — usar o binário Go 0.5.18.

Pendências da pesquisa (Undetermined, sem fonte primária): boas práticas de SQLite em Docker (WAL/backup), estabilidade de `node:sqlite` no Node 26, sintaxe de coverage no Vitest 5 em monorepo, versão 1.x do Elysia, workspaces do Bun/npm, React Native dentro do SDK 58, self-hosting do Next (`output: 'standalone'`). Nenhuma delas bloqueia a Rodada 2; a comparação Next vs Vite+Hono será refeita com fonte primária antes da decisão.

---

## Rodada 1 — Restrições

**Data:** 2026-11-10

**Perguntas**

1. Q: Prazo, equipe e custo. (a) solo/sem prazo/custo zero, (b) solo com hospedagem barata, (c) data de entrega fixa.
   A: **(a) solo, sem prazo fixo, custo zero** — só o PC, sem nuvem.
2. Q: Offline-first ou online-only? (a) online-only, (b) offline-capable desde o MVP, (c) online-only com desenho que não impede sync depois.
   A: **Adiado pelo usuário**: "precisamos discutir melhor isso, a partir da infraestrutura que vamos trabalhar."
3. Q: Exposição de rede e autenticação. (a) só `localhost`, (b) LAN com senha, (c) internet com auth real.
   A: **(a) só `localhost`, sem autenticação no MVP**, com gatilho de auth ao sair de localhost.
4. Q: Privacidade, telemetria e LGPD. (a) sem telemetria/terceiros, (b) analytics anônimo, (c) logs detalhados com conteúdo.
   A: **(a) sem telemetria, sem analytics, sem terceiros**; dados só no volume local.
5. Q: Backup e durabilidade. (a) exportar/importar pela interface, (b) backup automatizado no host, (c) nada no MVP.
   A: **(a) exportar e importar pela interface no MVP.**
6. Q: Idioma da interface e semântica de datas. (a) UI pt-BR + código/commits em inglês + `dd/mm/aaaa`, (b) UI em inglês, (c) i18n.
   A: **(a) UI em pt-BR, código e commits em inglês, datas `dd/mm/aaaa`.**

**Decisões**

- **D6 — Operação de custo zero, solo, sem prazo externo.** Rationale: MVP pessoal não justifica custo recorrente nem ops; também elimina a opção de Postgres gerenciado e de qualquer serviço de terceiro.
- **D7 — A aplicação escuta apenas em `localhost`, sem autenticação no MVP.** Rationale: um único usuário na própria máquina; login sem usuários distintos só adiciona fricção. **Gatilho explícito:** no instante em que a aplicação for exposta fora de `localhost` — LAN ou app — a autenticação passa a ser pré-requisito do primeiro acesso externo, não uma melhoria futura.
- **D8 — Sem telemetria, sem analytics, sem serviços de terceiros; logs não registram conteúdo dos itens** (título, nota, comentário). Rationale: nenhum dado sai da máquina; LGPD resolvida por ausência de tratamento por terceiros, não por política escrita.
- **D9 — Exportar e importar o histórico em JSON pela própria interface, no MVP.** Rationale: é a única perda irreversível do projeto; exportação manual é mais barata que automação, é testável e serve de migração quando o app chegar. Backup automatizado (Litestream) fica para depois.
- **D10 — Idioma: UI em pt-BR, identificadores e commits em inglês, datas exibidas em `dd/mm/aaaa`.** Rationale: i18n no MVP é custo sem usuário; separar idioma de produto de idioma de código mantém consistência com `.ia-instructions`.

**Adiado**

- **Offline vs online-only (Q2)** — depende da infraestrutura escolhida na Rodada 2. Retorna na Rodada 3, junto do modelo de dados, para não decidir sincronização antes de saber onde os dados vivem.
- Backup automatizado contínuo (Litestream) — depois do MVP; a exportação manual cobre o risco enquanto isso.
- Autenticação — adiada com gatilho (D7), não esquecida.

---

## Rodada 2 — Stack e arquitetura (aberta, depois reaberta)

**Data:** 2026-11-10

**Primeira formulação (recomendações do agente, NÃO adotadas):** Vite+React / Hono / Drizzle / SQLite / pnpm com `packages/contract` em Zod / container único.

**Respostas do usuário (substituem as recomendações):**

1. Q: Formato web + backend.
   A: **Angular + Java Spring.** Substitui integralmente a opção TypeScript.
2. Q: Banco.
   A: **(c) SQLite agora, com caminho de migração ensaiado.**
3. Q: Acesso a dados.
   A: **"ORM do Spring"** — ou seja, Spring Data JPA / Hibernate (a confirmar se JPA ou JDBC; ver conflito abaixo).
4. Q: Formato do monorepo.
   A: **(a)** — mas a opção original era pnpm/Turbo, inválida neste stack. Precisa ser reinterpretada.
5. Q: Onde vive o contrato da API.
   A: **(a)** — mas a opção original era Zod em `packages/contract`, inválida entre Java e TypeScript. Precisa ser reinterpretada.
6. Q: Empacotamento Docker.
   A: **(a) um container**, mesma origem. Traduz-se para Spring Boot servindo o build estático do Angular.

**Consequências aceitas**

- **D11 — Linguagem e runtime: Java + Spring no backend, Angular no frontend.** Decisão do usuário; substitui a recomendação de TypeScript. Não será reaberta, apenas detalhada (versões, build tool).
- **D12 — Persistência via "ORM do Spring".** Detalhe (JPA vs JDBC) ainda em aberto por causa do conflito com SQLite.
- **D13 — Monorepo passa a ter dois ecossistemas de build** (Maven ou Gradle + npm). Isso invalida o uso de pnpm workspaces como orquestrador único.

**Conflito identificado (factual, a resolver)**

- SQLite não é um dialeto de primeira classe no Hibernate; o suporte tende a ser via `hibernate-community-dialects`, com limitações de DDL, `ALTER TABLE`, `IDENTITY` e locking. Ou seja: **Q2=c (SQLite) + Q3 (JPA) é a combinação de maior atrito deste stack.** Postgres em container continua compatível com D6 (custo zero), porque é local e não gerenciado.
- Consequência: a decisão "banco × persistência" precisa ser tomada em conjunto, não separadamente.

---

## Rodada 2 — decisões finais

**Data:** 2026-11-10

**Perguntas**

1. Q: Banco × persistência: (a) SQLite+JPA, (b) SQLite+JdbcClient, (c) Postgres+JPA.
   A: **(c) Postgres 17 em container + Spring Data JPA + Flyway.**
2. Q: Contrato Java ↔ Angular: (a) OpenAPI gerado + tipos TS gerados, (b) DTOs duplicados, (c) spec só como documentação.
   A: **(a) OpenAPI gerado pelo `springdoc` + geração de tipos para o Angular.**
3. Q: Build do backend: Maven ou Gradle.
   A: **Maven.**
4. Q: Layout do monorepo: (a) apps/api + apps/web + Makefile, (b) Maven multi-módulo com `frontend-maven-plugin`, (c) Nx.
   A: **(a)** — builds nativos separados, Makefile na raiz.
5. Q: Empacotamento Docker: (a) um container, (b) dois containers com proxy.
   A: **(b) dois containers** — nginx servindo o Angular + Spring atrás do proxy `/api`.

**Decisões**

- **D14 — Postgres em container + Spring Data JPA + Flyway.** *Supersede a resposta SQLite (Q2=c) da formulação anterior.* Rationale: JPA só é de primeira classe sobre Postgres; SQLite exigiria dialeto comunitário do Hibernate com limitações de DDL/`ALTER TABLE`/`IDENTITY`. D6 (custo zero) preservado: é container local, não serviço gerenciado.
- **D15 — Contrato único via OpenAPI gerado pelo `springdoc`, com tipos TypeScript gerados para o Angular.** Rationale: preserva a intenção de "fonte única de contrato" da resposta original (Zod), adaptada à fronteira Java/TypeScript. Divergência vira erro de build, não bug silencioso.
- **D16 — Maven** como build do backend (`mvnw` versionado). Rationale: convenção universal em Spring, menos cerimônia que Gradle para 2 tabelas e poucas rotas.
- **D17 — Layout: `apps/api` (Maven), `apps/web` (Angular/npm), `contracts/openapi.yaml`, `Makefile` e `docker-compose.yml` na raiz.** Rationale: cada ecossistema com build nativo; um único ponto de entrada documentado; sem orquestrador (Turbo/Nx) para 2 apps.
- **D18 — Dois containers: nginx (estáticos do Angular + proxy `/api`) e Spring.** *Supersede a resposta "um container" da formulação anterior (Q6=a).* Rationale: decisão explícita do usuário na revisão. Consequência aceita: mais configuração (proxy), mas o navegador continua falando com uma única origem — **CORS não é necessário** desde que `/api` seja proxiado pelo nginx; isso passa a ser critério de aceite.

**Reversões registradas**

| Item | Antes | Agora | Motivo |
| --- | --- | --- | --- |
| Banco | SQLite (Q2=c, 1ª formulação) | Postgres em container (D14) | Atrito de dialeto com JPA |
| Empacotamento | Um container (Q6=a) | Dois containers (D18) | Escolha do usuário na revisão |

---

## Pesquisa — stack Java/Spring/Angular (novembro/2026)

Substitui, **para fins de decisão**, a pesquisa TypeScript anterior (mantida acima como histórico). Fontes: `repo1.maven.org` maven-metadata, registry npm, docs oficiais e endoflife.date. A busca do `search.maven.org` está com índice defasado e foi descartada como fonte.

| Camada | Versão | Confiança |
| --- | --- | --- |
| JVM | Temurin **25** LTS (25.0.5+8), EOL 2031-09 | Confirmed |
| Framework | **Spring Boot 4.1.2** (Spring Framework 7.0.10+), aceita Java 17–27 | Confirmed |
| Build | Maven 3.6.3+ (wrapper) | Confirmed |
| ORM | Hibernate 7.4.x (via BOM do Boot) | Confirmed artefato; versão exata do BOM pendente |
| Migração | Flyway (via BOM) | idem |
| Docs/contrato | `springdoc-openapi-starter-webmvc-ui` **3.2.0** | Confirmed artefato; compatibilidade com 4.1.2 **não verificada** |
| Codegen web | `orval` **8.47.0** (client Angular `HttpClient`) | Confirmed |
| Web | Angular **22.2.5** (CLI 22.2.6), builder `application` | Confirmed |
| Teste web | **Vitest** — default do Angular; `zone.js` não é mais necessário (zoneless default desde v21) | Confirmed |
| E2E | Playwright **1.65.0** | Confirmed |
| Teste API | JUnit 6.1.3, Testcontainers 2.0.5 | Confirmed artefato; BOM do Boot pode gerenciar versões anteriores |
| Cobertura | JaCoCo **0.8.16** | Confirmed |

**Achados que mudam decisões**

- **Spring Boot 3.5 saiu do OSS support em 2026-06-30 e 4.0 termina em 2026-12-31.** Para projeto novo, 4.1.2 é a única linha racional (OSS até 2027-07-31). Não é preferência: as outras linhas estão mortas ou morrendo.
- **D14 (Postgres) fica validada.** SQLite com JPA exigiria **dois** artefatos de comunidade — `hibernate-community-dialects` (dialeto `org.hibernate.community.dialect.SQLiteDialect`, "best-effort") e `flyway-database-nc-sqlite` (o `flyway-database-sqlite` não existe). Exatamente a dívida que D14 evitou.
- **D18 (dois containers) fica validada por outro motivo:** o Spring não tem SPA fallback nativo, e um fallback em Java precisaria excluir `/api`, `/actuator` e `/v3/api-docs` para não engolir a API. Com nginx, o problema não existe.
- **Risco novo em D15:** `springdoc` 3.2.0 é a linha para Boot 4, mas a compatibilidade com 4.1.2 não foi confirmada em fonte primária. Mitigação: smoke test de `/v3/api-docs` no primeiro commit da API; se falhar, a spec passa a ser escrita à mão em `contracts/openapi.yaml` e vira a fonte da verdade, com teste de contrato contra a API.

**Lacunas que bloqueiam apenas o pin final (não a decisão)**

- Versão de **Node** e peer de **TypeScript** exigidos pelo Angular 22 (`typescript@7` provavelmente está fora do peer; `ng update` deve exigir TS 6.x).
- Versões exatas de **Hibernate / Flyway / JUnit** geridas pelo BOM do Boot 4.1.2.
- Tag atual da imagem **postgres** e existência de distroless para Java 25.
- Se o `springdoc` 3.2.0 emite **OpenAPI 3.1** por default.

---

## Perguntas abertas (consolidado)

| Pergunta | Por que importa | Dona | Necessária até |
| --- | --- | --- | --- |
| Modelo de dados, contrato REST, export/import, UI (Rodada 3) | Define o que será construído e testado | Usuário | Antes do código |
| Offline vs online-only (adiada na Rodada 1) | Decide IDs e se há sincronização | Usuário | Rodada 3 |
| Lint/format Java e Angular (Rodada 4) | Critério de CI | Usuário | Antes do código |
| Node/TS do Angular 22, BOM do Boot 4.1.2, tag do Postgres, OpenAPI 3.1 | Pins exatos | Agente (pesquisa) | Antes do primeiro commit |

## Assunções

- "Consumido" significa já finalizado — validar na Rodada 3.
- O `springdoc` 3.2.0 funciona com Boot 4.1.2 — validar com smoke test; fallback já definido.
- O usuário não pretende expor a aplicação fora de `localhost` no MVP — D7 tem gatilho escrito caso mude.

---

## Rodada 3 — interrompida por requisito novo (sincronização)

**Data:** 2026-11-10

**Resposta recebida**

1. Q: Offline vs online-only.
   A: **(a)**, acompanhada de um requisito que não estava no option set: *"quando o app chegar, será como funciona o Obsidian free: precisará de um app como o Syncthing para sincronizar um cofre, que conterá todas as informações do usuário. Essa pasta deve ser exposta pra fora do Docker para permitir isso."*

**Contradição identificada (fato, não preferência)**

- Syncthing sincroniza **arquivos**. Um diretório de dados do **Postgres** (D14) não é sincronizável por arquivo, e um arquivo SQLite copiado ao vivo corre risco de corrupção. Portanto **D14 + "cofre sincronizado por Syncthing" não podem coexistir**.
- "Online-only com servidor como fonte da verdade" (Q1=a) também não sobrevive: num cofre sincronizado por arquivo não existe servidor — o arquivo local é a fonte da verdade.
- As decisões D13 (monorepo de dois ecossistemas), D16 (Maven), D17 (layout) e D18 (containers) ficam **em suspenso** até a definição da arquitetura alvo.

**Perguntas 2–6 da Rodada 3**

Não foram respondidas e **não serão repetidas neste frame**: "tabela única `consumption`" pressupõe banco relacional. Se o armazenamento virar arquivos, o modelo de dados muda de natureza e será perguntado de novo na Rodada 5.

**Pergunta do usuário ao agente**

> "Pensando melhor, o que acha de jogar toda a stack atual fora e pensar em um app nativo, como o Obsidian, para PC?"

**Deferido**

- Rodada 3 (dados, contrato, UI), Rodada 4 (qualidade/ops) e Rodada 5 (confirmação) — suspensas até a decisão de arquitetura.

---

## Pesquisa — app nativo local-first (novembro/2026)

Fontes: crates.io, npm, GitHub Releases, docs oficiais do Tauri/Electron/Syncthing.

| Item | Versão | Confiança |
| --- | --- | --- |
| Tauri (crate) | **2.12.5** (3.0 em alpha) | Confirmed |
| `@tauri-apps/api` / `cli` | 2.12.4 | Confirmed |
| `tauri-plugin-fs` | 2.7.1 | Confirmed |
| `tauri-driver` / `@wdio/tauri-service` | 2.1.0 / existe (versão exata pendente) | Confirmed |
| Electron | **45.2.3** (Chromium 156, Node 24) | Confirmed |
| Playwright | 1.65.0 (suporte a Electron é **experimental**) | Confirmed |
| Avalonia / Flutter / Compose MP / egui / iced | 12.1.6 / 3.47.9 / 1.12.2 / 0.37.0 / 0.14.0 | Confirmed |
| Syncthing | **2.1.7** | Confirmed |
| Angular | 22.2.5 | Confirmed |
| Capacitor / Ionic Angular | 8.6.0 / 9.0.10 | Confirmed |
| `gray-matter` / `js-yaml` / `remark-frontmatter` | 4.0.3 / 5.5.0 / 5.0.0 | Confirmed |
| Rust YAML | `yaml-rust2` 0.13.0 — **`serde_yaml` está deprecated** | Confirmed |
| `cr-sqlite` | 0.16.3, **sem release desde jan/2024** | Confirmed → não usar |

**Achados que mudam decisões**

- **Angular é template oficial do `create-tauri-app`.** O pivot **não** descarta a escolha de Angular (D11 parcialmente sobrevive): morrem Spring/Postgres/Maven/Flyway/Docker/nginx, não o frontend. Isso reduz muito o custo do pivot.
- **Syncthing resolve conflito por arquivo inteiro.** O perdedor vira `<arquivo>.sync-conflict-<data>-<hora>-<device>.<ext>` e **o arquivo de conflito passa a ser sincronizado como arquivo normal** para todos os dispositivos. Vence a mtime mais antiga. Consequência direta: **um arquivo por item é requisito, não preferência** — um arquivo único grande perde tudo num conflito e re-hasheia o arquivo inteiro a cada save.
- **Mobile por Syncthing tem atrito real.** O app oficial Android do Syncthing está com repositório **arquivado** (último push 2024-12); o caminho ativo é o **Syncthing-Fork**. No iOS não há app oficial gratuito: **Möbius Sync é pago** e existe o `SushiTrain` (open source). Isso não invalida o modelo, mas precisa entrar no SPEC como restrição do futuro app, não como detalhe.
- **E2E de app Tauri é viável** (atende `.ia-instructions`): `@wdio/tauri-service` com WebDriver embutido em Windows/Linux/macOS, mais "browser mode" para testes de componente rápidos. `tauri-driver` puro não cobre macOS.
- **Distribuição Windows tem custo real:** o Smart App Control do Win11 bloqueia app não assinado mesmo sem download, e certificado EV não dá mais reputação instantânea no SmartScreen. Alternativa barata citada: Azure Artifact Signing.
- **Electron como alternativa:** 45.2.3, E2E maduro via Playwright (experimental, mas suportado), porém Chromium embutido (tamanho/RAM) e a recomendação de não usar `file://`.

**Pendências da pesquisa (Undetermined)**

- MSRV do Tauri 2.12; maturidade real do Tauri Mobile; tamanho/RAM Tauri vs Electron com fonte; se o formato de vault do Obsidian é documentado para escrita por terceiros; risco de SQLite dentro de pasta Syncthing (hoje só *Inferred*); Angular dentro do protocolo `tauri://` (roteamento/CSP/`fetch`).

---

## Rodada 4 — Arquitetura alvo (decidida) + dúvida sobre Obsidian

**Data:** 2026-11-10

**Perguntas**

1. Q: Arquitetura alvo: (a) app nativo + cofre, (b) servidor atual, (c) híbrido, (d) não construir.
   A: **(a) app nativo + cofre de arquivos.**
2. Q: Por que construir o app, em vez de usar Obsidian.
   A: **Não respondida.** O usuário devolveu a pergunta: *"Meu maior problema seria com a manipulação dos dados, por exemplo ter estatísticas mais avançadas, tipo quantas páginas leu num x tempo, qual a editora mais lida. Será que o Obsidian já não resolve isso?"*

**Decisões**

- **D19 — Arquitetura: app desktop nativo + cofre de arquivos sincronizado por Syncthing.** Rationale: é o único modelo em que o requisito do usuário ("cofre como o Obsidian free, sincronizado por Syncthing") é coerente por construção. Descartadas por incompatibilidade: D12 (JPA), D13 (dois ecossistemas), D14 (Postgres), D15 (OpenAPI), D16 (Maven), D17 (layout), D18 (containers). D11 sobrevive parcialmente: Angular continua como frontend.

**Descoberta relevante para a Rodada 5**

Os exemplos dados pelo usuário ("quantas páginas leu num período", "editora mais lida") **não são cobertos pelo modelo de dados atual**: exigem progresso de leitura (início/fim ou páginas) e metadados específicos de livro (editora, páginas). Isso reabre a decisão "só consumido / sem status" da Rodada 3 (Q3) e amplia o modelo.

**Adiado**

- Q2 vira a pergunta central da Rodada 5, porque decide se o app se justifica.

---

## Rodada 5 — Estatísticas e modelo de dados

**Data:** 2026-11-10

**Clarificação do usuário (muda o escopo)**

> "O Syncthing foi só um exemplo; como o usuário compartilha esse cofre é problema dele."

Consequência: **sincronização sai do escopo do produto**. O app lê e escreve uma pasta local; distribuir/compartilhar essa pasta é responsabilidade do usuário. Isso remove a necessidade de UI de resolução de `.sync-conflict-*`, de lógica de merge e de qualquer desenho de sync entre dispositivos.

**Perguntas**

1. Q: Estatística é central ou acessória?
   A: **Central.** *"Ignore o Obsidian, vamos construir o Consumed."*
2. Q: Como medir "páginas lidas num período" — (a) só `finished_on`, (b) `started_on`+`finished_on` com rateio, (c) sessões de leitura.
   A: **Deferida** — "decisão para depois".
3. Q: Metadados por tipo de mídia — (a) campos opcionais no mesmo arquivo, (b) saco livre, (c) arquivo por tipo.
   A: **(a) campos opcionais por tipo no mesmo arquivo.**
4. Q: Reconsumo — (a) um arquivo por evento, (b) um arquivo por obra, (c) proibir duplicado.
   A: **Deferida** — "ainda vamos discutir esse tipo de coisa depois".

**Decisões**

- **D20 — Estatísticas são requisito central, não acessório.** O app se justifica pela UX e pelas estatísticas; a alternativa "usar Obsidian" está descartada por decisão do usuário. Rationale: sem isso, a arquitetura de cofre de arquivos não pagaria o custo de construir.
- **D21 — Metadados específicos por tipo, opcionais, no mesmo arquivo.** Livro: `pages`, `publisher`, `author`, `started_on`, `finished_on`. Filme: `director`, `runtime`, `year`, `watched_on`. Só os campos relevantes existem no arquivo. Rationale: validação forte onde a estatística depende (número e data), sem travar mídias futuras.
- **D22 — Sincronização está FORA do escopo.** O app não sincroniza, não resolve conflito e não conhece a nuvem; ele recebe um caminho de pasta e opera ali. Rationale: decisão explícita do usuário.

**Deferido com mitigação de custo**

- **Medição de páginas (Q2):** o schema já inclui `started_on` e `finished_on` como opcionais. Assim, decidir depois entre "só data de término" ou "rateio pelo intervalo" vira **regra de consulta**, não migração de dados.
- **Reconsumo (Q4):** o padrão do formato é permitir duplicados (um arquivo por evento). Decidir depois só restringe ou agrupa; não exige mudar o armazenamento.

**Assunções novas**

- O cofre é uma pasta comum do sistema de arquivos, aberta pelo app por um caminho configurado. Nenhum serviço, porta ou processo em background.

---

## Rodada 6 — Armazenamento, shell e telas

**Data:** 2026-11-10

**Perguntas**

1. Q: Formato de cada item — (a) Markdown+frontmatter, (b) JSON por item, (c) arquivo único.
   A: **Nenhuma.** O usuário corrigiu a premissa: *"Você tá levando a parte do Obsidian a sério demais, a única comparação era com o formato do cofre. Podemos usar um banco de dados normalmente para os registros."*
2. Q: Shell nativo — Tauri, Electron, PWA.
   A: **(b) Electron.** O usuário perguntou o que é E2E (respondido na conversa).
3. Q: Layout e nomes de arquivo no cofre.
   A: **Respondido em Q1** — sem arquivos por item, não há convenção de nome a definir. Resta apenas onde fica o arquivo do banco.
4. Q: Telas do MVP.
   A: **Definidas no Figma**: `https://www.figma.com/design/9DQhGphfeBrbPN3KTEPP71/Consumed`

**Decisões**

- **D23 — Armazenamento em banco de dados local (SQLite), não em arquivos por item.** *Supersede a premissa "um arquivo por item" de D19.* Rationale: a comparação com o Obsidian era sobre o *formato do cofre* (uma pasta que o usuário pode mover/compartilhar), não sobre arquivos Markdown. Com sync fora de escopo (D22), o argumento de segurança de sincronização desaparece e um banco local é mais simples, tipado e consultável.
- **D24 — Shell: Electron 45.2.3 + Angular 22.** Rationale: uma linguagem só (TypeScript), I/O de arquivo via Node sem camada nova, E2E com Playwright e webview Chromium consistente entre sistemas.

**Consequências do D23**

- Saem do stack: Markdown, frontmatter, `gray-matter`, `js-yaml`, e a discussão de ambiguidade de tipos do YAML.
- D21 (campos opcionais por tipo) **sobrevive**, agora como colunas anuláveis na mesma tabela — melhor ainda para estatística (SQL direto).
- O "cofre" passa a ser uma pasta contendo o arquivo do banco (`consumed.db`), que o usuário pode mover, copiar e versionar por conta própria.

**Inventário do Figma (6 telas)**

| Tela | Conteúdo |
| --- | --- |
| **Home** | Header com perfil/avatar, navbar (HOME · FILMS · BOOKS · STATISTICS), "LAST 5 MOVIES WATCHED" (5 cards), "LAST 5 BOOKS READ" (5 cards), um painel lateral de 264×571 (conteúdo não identificado) |
| **Films** | Grid de 9 pôsteres (5 colunas) + barra de busca |
| **Books** | Grid de 10 capas + barra de busca |
| **Filme Selected** | Pôster, título com ano, nota numérica ("10"), "Watched on", nota livre, e metadados: Directed by, Running time, Screenplay by, Produced by, Distributed by, Language |
| **Book Selected** | Capa, título com ano, nota ("10"), "Read on", nota livre, e metadados: Author, Publisher, Pages, Language, ISBN |
| **Statistics** | **Vazia** — só header, navbar e rodapé |

**Lacunas que o Figma cria**

- **Escala de nota:** o design mostra `10`, não `1–5`. Precisa ser confirmado.
- **Imagens:** todas as telas dependem de pôster/capa, e o Figma não define a origem (URL, arquivo local ou nenhuma).
- **Statistics está vazia** justamente na tela que corresponde ao requisito central (D20).
- **Campo de busca** aparece em Films e Books, mas não há comportamento definido (título? autor? instantâneo?).

---

## Rodada 7 — Modelo, métricas e busca

**Data:** 2026-11-10

**Perguntas**

1. Q: Escala de nota — 0–10, 1–5 estrelas, 0–10 com meio ponto.
   A: **(a) inteiro de 0 a 10.**
2. Q: Origem das imagens — arquivo local, URL, nenhuma.
   A: **(a) arquivo local copiado para o cofre.**
3. Q: Conteúdo da tela Statistics.
   A: **(a) quatro números + um gráfico:** itens por mês, páginas por mês, nota média, editora mais lida.
4. Q: Onde fica o arquivo do banco.
   A: **(a) pasta escolhida pelo usuário na primeira execução.**
5. Q: Comportamento da busca.
   A: **(b) título + autor/editora/direção**, insensível a acento e caixa.
6. Q: O painel lateral da Home (264×571).
   A: **Não decidido pelo usuário** — "não decidi ainda, por isso está em branco".

**Decisões**

- **D25 — Nota inteira de 0 a 10.** Rationale: é a escala que o Figma desenha; inteiro mantém média simples.
- **D26 — Imagens copiadas para dentro do cofre.** Rationale: o cofre continua autossuficiente e não depende de URLs que apodrecem.
- **D27 — Métricas de estatística: itens por mês, páginas por mês, nota média, editora mais lida, com gráfico.** Rationale: todas derivam de campos já modelados.
- **D28 — Banco em pasta escolhida pelo usuário (`consumed.db`).** Rationale: preserva o conceito de cofre e torna backup e migração triviais.
- **D29 — Busca por título, autor, editora ou direção, sem acento e sem caixa, instantânea.** Rationale: cobre a maioria dos casos sem indexação extra.

**Fatos verificados (registry npm)**

- Angular 22.2.5 exige Node `^22.22.3 || ^24.15.0 || >=26` → usar **Node 24 LTS**.
- Angular 22 (`@angular/build` 22.2.6) exige TypeScript `>=6.0 <6.1` → **TypeScript 7.0.2 é incompatível**. Pinar TS 6.0.x.
- Vitest compatível: `^4.0.8 || ^5.0.0`.

**Adiado**

- **Painel lateral da Home:** sem decisão; o MVP não deve reservar espaço nem inventar conteúdo.

---

## Rodada 8 — Cadastro, qualidade e distribuição

**Data:** 2026-11-10

**Perguntas**

1. Q: Como cadastrar/editar, já que o Figma não tem essa tela — modal, rota dedicada, painel fixo.
   A: **(a) diálogo modal** aberto por botão "+".
2. Q: Estratégia de testes — Vitest+Playwright com gate, só unitário, sem gate.
   A: **(a) Vitest + Playwright (Electron) + gate de 80%.**
3. Q: Lint/format — ESLint Angular + Prettier, Biome, nenhum.
   A: **(a) ESLint (Angular) + Prettier.**
4. Q: Empacotamento — electron-builder, electron-forge, nenhum.
   A: **(a) electron-builder.**
5. Q: CI — GitHub Actions, GitLab, nenhum.
   A: **(a) GitHub Actions.** O usuário criou o repositório no GitHub e vinculou.
6. Q: Alvo de distribuição — Linux, Linux+Windows, os três.
   A: **(a) Linux (AppImage + deb).**

**Decisões**

- **D30 — Cadastro e edição em diálogo modal.**
- **D31 — Vitest + Playwright (Electron) + gate de 80% de linha e branch.**
- **D32 — ESLint (Angular) + Prettier.**
- **D33 — `electron-builder` para instaladores.**
- **D34 — CI no GitHub Actions**; remote verificado em `.git/config`: `git@github.com:georgejrdev/Consumed.git`.
- **D35 — Distribuição Linux apenas** (AppImage + `.deb`) no MVP.

**Fatos verificados**

- `remote.origin.url = git@github.com:georgejrdev/Consumed.git` (leitura de `.git/config`).

**Encerramento da fronteira**

Com D30–D35, não resta decisão de produto em aberto. Permanecem como perguntas abertas apenas itens explicitamente adiados pelo usuário (painel lateral da Home, medição de páginas, reconsumo, app mobile) e uma escolha técnica que não altera comportamento (driver SQLite).

---

## Rodada 9 — Confirmação

**Data:** 2026-11-10

**Pergunta**

1. Q: O SPEC está aprovado como está?
   A: **(a) Sim, aprovado.**

**Decisão**

- **Aprovação do SPEC.** `docs/spec/SPEC.md` marcado como `Status: approved`. É a fonte da verdade para escopo e aceite; este log explica o porquê de cada decisão.

**Ressalvas registradas na aprovação**

- O E2E com Playwright + Electron é suportado, mas a própria Playwright marca o suporte como experimental. Fallback declarado: testar o renderer no browser com IPC mockado e cobrir o banco por teste de integração, caso o E2E de Electron se mostre instável.
- Quatro itens ficaram fora do MVP por decisão consciente: painel lateral da Home, medição de páginas por rateio, política de reconsumo e app mobile.

**Encerramento**

- Fronteira de decisões: vazia, exceto pelos itens adiados acima.
- Nada fora de `docs/spec/` foi criado ou modificado.

---










## Rodada 10 — correções observadas no uso (2026-11-10)

**Contexto**

Cinco problemas foram observados após a primeira versão funcional: redundância entre "Lido em" e início/fim da leitura; nomes que se repetem sem sugestões; capa de livro que não carregava; observações fora do bloco previsto no design; e ausência de estado de leitura com feedback visual na capa.

**Decisões**

- **D36 — Data de consumo do livro é derivada.** `ItemInput.consumed_on` passa a ser opcional para livro; o processo main usa `finished_on`, senão `started_on`, senão a data atual. Na edição, a data já gravada é preservada quando o formulário não envia outra. A coluna continua NOT NULL. O detalhe de livro mostra apenas início e fim; o de filme mostra "Assistido em". Elimina a redundância sem perder a data usada em ordenação e estatísticas.
- **D37 — Nomes repetíveis viram listas com sugestões.** `author`, `screenplay_by`, `produced_by` e `distributed_by` são `string[]` (JSON em TEXT, com leitura legada de texto puro/`;`). `publisher`, `director` e `language` continuam únicos. A UI sugere valores já usados, filtrados por tipo, e aceita valor novo. Listas só onde a repetição é real.
- **D38 — Estado do livro e regra de consumo.** `reading_status` (`nao_lido`, `lendo`, `lido`) com default `lido`; bancos antigos recebem a coluna e backfill `lido`. A capa reflete o estado (grayscale, saturação reduzida, colorida) no card e no detalhe. Apenas `lido` conta como consumido: Home e Estatísticas usam `onlyConsumed`. "Lendo" e "não lido" continuam visíveis na grade de Books.
- **D39 — Observações em bloco próprio.** Capa e informações seguem lado a lado num wrapper `.main`; `notes` ocupa um bloco de largura total abaixo dessa linha, com `--surface` e borda 2px, como no design.
- **D40 — Capa via host fixo.** `media:///arquivo` era normalizado pelo Chromium para host = nome do arquivo, retornando 404. A URL passa a ser `media://vault/<arquivo>`; o handler exige `hostname === 'vault'`, confina o caminho a `<cofre>/imagens/` e revalida com `realpath` para não seguir symlinks para fora. O esquema é registrado com `standard`, `secure`, `supportFetchAPI` e `stream`; não foi necessário `corsEnabled`, pois o renderer usa `<img>` e não `fetch`.

**Ajustes decorrentes**

- `.deb` saiu do escopo de empacotamento (o alvo é AppImage); `npm run make` passa a ser alias de `npm run package`.
- O boot passa a propagar erro de cofre somente leitura via `vault:current` (AC-4).
- CSP adicionada em `apps/web/src/index.html`.
