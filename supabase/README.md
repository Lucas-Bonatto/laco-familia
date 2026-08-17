# Supabase

## Instalação nova

Execute somente `schema.sql` em um projeto vazio. O arquivo cria tabelas, funções, políticas RLS, bucket privado, políticas de Storage e configuração de Realtime necessárias ao MVP.

## Patch histórico

`fix_invite_generator.sql` é uma correção histórica usada em uma instalação anterior. A versão corrigida já está incorporada ao `schema.sql`; portanto, o patch não deve ser executado em instalações novas.

## Regras de contribuição

- Não altere RLS sem testar duas famílias distintas.
- Não use a `service_role` no aplicativo móvel.
- Prefira migrations incrementais para mudanças posteriores à instalação inicial.
- Documente estratégia de rollback e impacto sobre dados existentes.
- Nunca inclua dumps com dados pessoais no repositório.

O próximo passo de infraestrutura é transformar o schema inicial e todas as alterações futuras em migrations versionadas pelo Supabase CLI.
