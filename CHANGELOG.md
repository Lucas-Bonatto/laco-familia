# Changelog

Todas as alterações relevantes serão registradas neste arquivo. O projeto segue versionamento semântico a partir da primeira versão distribuível.

## Não lançado

### Adicionado

- Capa demonstrativa com dados fictícios para o portfólio.
- Identidade visual aplicada ao ícone, splash, favicon e imagem social do GitHub.
- Documentação de arquitetura, privacidade, segurança e contribuição.
- Roadmap priorizado por risco.
- Testes unitários das regras de medicamentos recorrentes.
- Templates de issues e pull requests.
- Verificação de exportação Android na integração contínua.
- Migrations do Supabase e 21 testes pgTAP adversariais.
- Convites temporários, revogáveis, de uso único e com rate limit.

### Alterado

- README reorganizado como estudo de caso técnico.
- Workflow de qualidade alinhado ao pnpm do projeto.
- Sessão móvel movida do AsyncStorage para Keychain/Keystore.
- Removido o cache persistente de dados familiares sensíveis.
- URLs assinadas de memórias reduzidas de sete dias para cinco minutos.
- Toolchain Expo atualizado, deduplicado e com overrides transitivos compatíveis para advisories corrigíveis.
- Cliente Supabase atualizado dentro da API major 2 e Data API local configurada com grants explícitos.

## 1.0.0 — MVP inicial

- Login individual e grupos familiares.
- Agenda compartilhada para consultas, exames, medicamentos e outros eventos.
- Tratamentos com duração, intervalo e opção contínua.
- Lembretes locais de hidratação e cuidados.
- Garrafinha animada e placar familiar de água.
- Memórias fotográficas em Storage privado.
- Supabase Auth, PostgreSQL, RLS e Realtime.
- Cache local com AsyncStorage.
