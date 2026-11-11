# AI INSTRUCTIONS

This directory contains the instructions that AI agents must follow in this repository.

## DOCUMENTS

- [Commits and branches](./INSTRUCTIONS_FOR_COMMITS_AND_BRANCHES.md) — commit format, branch naming, merge strategy, step-by-step workflow, and pull requests.
- [Written tests](./INSTRUCTIONS_FOR_WRITTEN_TESTS.md) — test selection, triple coverage, design conventions, mocking, coverage, execution, and definition of done.

## PRECEDENCE

When instructions conflict, follow this order:

1. Explicit instructions from the user for the current task.
2. The documents in this directory.
3. Conventions already present in the repository.
4. General best practices.

If a repository convention conflicts with these instructions, follow these instructions and point out the conflict to the user.

## DISCOVERY

Agents must load these files before starting work. When the tool requires a single entry point, reference them from:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursorrules`

Example in `AGENTS.md`:

```
Follow the instructions in .ia-instructions/README.md and the documents it links to.
```
