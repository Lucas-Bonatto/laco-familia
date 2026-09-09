# Supabase

## Instalação nova

As migrations em `migrations/` são a fonte canônica do banco. Para recriar e validar um ambiente local:

```bash
supabase start
supabase db reset
supabase test db
supabase db lint --local --level warning --fail-on error
```

Para um ambiente remoto, vincule explicitamente o projeto, revise o dry-run e só então aplique:

```bash
supabase link --project-ref <project-id>
supabase db push --dry-run
supabase db push
```

`schema.sql` é apenas o baseline histórico anterior às migrations e não deve ser executado em instalações novas.

## Patch histórico

`fix_invite_generator.sql` é uma correção histórica usada em uma instalação anterior. A versão corrigida já está incorporada ao `schema.sql`; portanto, o patch não deve ser executado em instalações novas.

## Regras de contribuição

- Não altere RLS sem testar duas famílias distintas.
- Não use a `service_role` no aplicativo móvel.
- Crie toda mudança com `supabase migration new <nome>`.
- Documente estratégia de rollback e impacto sobre dados existentes.
- Nunca inclua dumps com dados pessoais no repositório.

Os testes em `tests/` devem provar isolamento entre duas famílias e cobrir qualquer RPC privilegiada nova.
