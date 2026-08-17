# Contribuindo com o Laço

Obrigado pelo interesse no projeto. O Laço lida com domínios sensíveis; clareza, privacidade e testes são mais importantes que velocidade.

## Antes de começar

1. Leia o [README](README.md), a [arquitetura](docs/ARCHITECTURE.md) e o [roadmap](docs/ROADMAP.md).
2. Pesquise issues existentes para evitar trabalho duplicado.
3. Para mudanças relevantes, abra uma issue descrevendo problema, impacto e proposta.
4. Nunca inclua dados reais de saúde, endereços, fotos ou credenciais.

## Ambiente local

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm export:check
```

Use `.env.local` somente para suas credenciais públicas do Supabase. Esse arquivo não deve entrar no Git.

## Branches e commits

Prefira branches curtas e descritivas:

- `feat/convites-revogaveis`
- `fix/notificacao-apos-permissao`
- `docs/arquitetura`
- `test/rls-familias`

Commits devem explicar uma mudança por vez, por exemplo:

- `feat: permite revogar convite familiar`
- `fix: reagenda evento após liberar notificações`
- `test: cobre limite de doses do tratamento`
- `docs: explica limitações do Expo Go`

## Pull requests

- Explique o problema antes da solução.
- Liste riscos, decisões e alternativas consideradas.
- Inclua screenshots somente com dados fictícios.
- Informe como a mudança foi testada.
- Marque alterações de schema, RLS, Storage ou notificações.
- Atualize documentação e roadmap quando necessário.

## Banco e segurança

Mudanças no banco devem ser versionadas e testadas com pelo menos duas famílias distintas. Confirme que uma pessoa da família A não consegue ler, inserir, atualizar ou excluir dados da família B.

Não reduza políticas RLS para contornar erros do cliente. Corrija o fluxo ou a política mantendo o princípio de menor privilégio.

Vulnerabilidades devem seguir [SECURITY.md](SECURITY.md), não uma issue pública.
