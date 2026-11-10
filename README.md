# Consumed

Aplicativo desktop pessoal para registrar filmes e livros já consumidos, com nota de 0 a 10,
metadados por tipo, capa/pôster local e estatísticas por período.

Electron 45 + Angular 22 + SQLite. Um usuário, pt-BR, sem servidor e sem telemetria.

## Requisitos

- Node 24 LTS (fixado em `.tool-versions`; use `asdf install`)
- Linux (alvo de distribuição do MVP)
- `python3`, `make` e `g++` para compilar o `better-sqlite3`

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Sobe o servidor do Angular em `http://localhost:4200`, espera ele responder e abre o Electron.

Na primeira execução o app pede a pasta do **cofre**. É nela que ficam o banco (`consumed.db`) e
a pasta `imagens/`. Para abrir um cofre específico sem passar pelo diálogo, defina
`CONSUMED_VAULT_DIR=/caminho/do/cofre`.

## Scripts

| Comando                | O que faz                                          |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Angular + Electron em modo desenvolvimento         |
| `npm run build`        | Compila contrato, renderer e processo main         |
| `npm test`             | Testes dos três workspaces (Vitest), com cobertura |
| `npm run lint`         | ESLint (TypeScript + templates Angular)            |
| `npm run format`       | Prettier em todo o repositório                     |
| `npm run format:check` | Verifica a formatação sem alterar                  |
| `npm run e2e`          | Build completo + Playwright contra o Electron      |
| `npm run package`      | Gera o AppImage em `release/`                      |
| `npm run make`         | Alias de `npm run package`                         |

## Estrutura

```text
apps/web        renderer Angular (hash routing, sem acesso a Node)
apps/desktop    processo main do Electron, IPC, SQLite e cofre
packages/contract  tipos compartilhados e validação de entrada
e2e             testes Playwright que sobem o Electron
docs/spec       SPEC aprovado e log de decisões
docs/design     referência visual extraída do Figma
```

O renderer nunca fala com o Node diretamente: `contextIsolation`, `sandbox` e uma API tipada
exposta pelo preload via `contextBridge`. O processo main é o dono do banco e do sistema de
arquivos. Capas são servidas pelo protocolo `media://vault/<arquivo>`, nunca por `file://`.

## Dados

- Banco: `<cofre>/consumed.db` (SQLite, WAL)
- Imagens: `<cofre>/imagens/`
- Backup: copiar a pasta do cofre
- O app nunca grava fora da pasta escolhida

## Testes

```bash
npm test          # unitários e de componente
npm run e2e       # ponta a ponta com Electron
```

Cobertura mínima de 80% em statements, branches, functions e lines nos três workspaces.
