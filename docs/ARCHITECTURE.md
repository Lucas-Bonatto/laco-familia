# Arquitetura do Laço

Este documento descreve as decisões atuais do MVP e deixa explícitos os limites que ainda precisam ser resolvidos antes de uma distribuição pública.

## Componentes

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Aplicativo | React Native + Expo | Interface, navegação e integração com recursos do aparelho |
| Estado | React Context | Sessão, snapshot familiar, sincronização e ações compartilhadas |
| Autenticação | Supabase Auth | Cadastro, login e persistência de sessão |
| Dados | Supabase Data API + PostgreSQL | Famílias, membros, eventos, água e metadados de memórias |
| Autorização | PostgreSQL Row Level Security | Restringir cada registro aos integrantes da família correta |
| Tempo real | Supabase Realtime | Notificar aparelhos abertos sobre alterações compartilhadas |
| Arquivos | Supabase Storage | Fotografias privadas organizadas por família |
| Cache | AsyncStorage | Último snapshot disponível e sessão do cliente |
| Alertas | expo-notifications | Lembretes locais do aparelho |

## Modelo de dados

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : possui
    AUTH_USERS ||--o{ FAMILY_MEMBERS : participa
    FAMILIES ||--o{ FAMILY_MEMBERS : agrega
    FAMILIES ||--o{ EVENTS : organiza
    FAMILIES ||--o{ WATER_ENTRIES : acompanha
    FAMILIES ||--o{ MEMORIES : guarda
    FAMILY_MEMBERS ||--o{ EVENTS : recebe
    FAMILY_MEMBERS ||--o{ WATER_ENTRIES : registra
```

Eventos e hidratação usam chaves estrangeiras compostas para impedir que o integrante selecionado pertença a outra família.

## Autorização

O aplicativo utiliza somente a URL pública e a publishable key do Supabase. As políticas RLS consultam a participação do usuário autenticado na família antes de autorizar leitura ou alteração.

As operações privilegiadas de criação e entrada em família ficam em funções privadas com `SECURITY DEFINER`, `search_path` fixo e permissão de execução limitada. A `service_role` não pertence ao cliente móvel.

## Sincronização

1. O aplicativo autentica a pessoa.
2. Um snapshot inicial é carregado do Supabase.
3. O snapshot é salvo localmente para abertura rápida.
4. O Realtime solicita uma nova leitura quando alguma tabela compartilhada muda.
5. A interface recebe o snapshot mais recente.

O cache atual é de leitura. Alterações feitas offline não entram em fila e precisam ser repetidas quando a conexão voltar.

## Notificações

Os lembretes atuais são locais. Cada aparelho precisa abrir o Laço e sincronizar para conhecer eventos criados por outra pessoa. Depois disso, o próprio sistema operacional agenda as ocorrências.

Uma versão de produção deverá combinar notificações locais com push remoto e processamento no backend, garantindo entrega sem depender da abertura recente do aplicativo.

## Fotografias

O app envia a imagem para um bucket privado e grava no banco somente o caminho do objeto e seus metadados. A leitura usa URL assinada temporária. A exclusão completa ainda precisa coordenar a linha do banco e o objeto do Storage.

## Decisões e compromissos

- React Context evita uma dependência adicional no tamanho atual do MVP.
- Um snapshot completo simplifica a primeira versão, mas deverá dar lugar a paginação e atualizações incrementais.
- Expo acelera o desenvolvimento multiplataforma, mas Expo Go não é o canal final de distribuição.
- RLS mantém a autorização próxima aos dados, mas exige testes automatizados com famílias adversárias.

## Riscos conhecidos

- Código de convite permanente e compartilhado.
- Ausência de exclusão integral de conta e arquivos.
- Notificações de saúde potencialmente visíveis na tela bloqueada.
- Reagendamento local dependente de sincronização do aparelho.
- Falta de trilha de auditoria para alterações familiares.
- Ausência de paginação e fila offline.

Esses itens estão priorizados em [ROADMAP.md](ROADMAP.md).
