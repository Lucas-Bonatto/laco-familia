# Roadmap do Laço

O roadmap separa melhorias de produção de funcionalidades desejáveis. A ordem considera privacidade, segurança e confiabilidade antes de expansão do produto.

## P0 — confiança e proteção

- [ ] Exclusão completa de conta, dados relacionais e objetos do Storage.
- [ ] Exportação e correção de dados do titular.
- [x] Convites temporários, revogáveis, de uso único e com limitação de tentativas.
- [ ] Remoção de membro com impedimento de reentrada pelo convite antigo.
- [ ] Cancelamento de notificações quando a pessoa deixa a família.
- [ ] Correção do fluxo “permissão negada e depois habilitada”.
- [ ] Modo privado para o conteúdo das notificações.
- [ ] Recuperação de senha e callback correto de confirmação de e-mail.
- [x] Migrations versionadas e testes adversariais das políticas RLS.

## P1 — integridade e colaboração

- [ ] Editar e excluir eventos não contínuos.
- [ ] Interromper tratamentos com período definido.
- [ ] Corrigir ou excluir registros de água.
- [ ] Editar e excluir memórias, incluindo o arquivo correspondente.
- [ ] Administração de membros e transferência de propriedade.
- [ ] Histórico de autoria e alterações.
- [ ] Meta de hidratação configurável por integrante.
- [ ] Antecedência de lembrete configurável por evento.
- [ ] Push remoto para eventos criados por outros familiares.

## P2 — escala e experiência

- [ ] Paginação de água, eventos e memórias.
- [ ] Atualizações incrementais e proteção contra respostas fora de ordem.
- [ ] Fila de alterações offline.
- [ ] Compressão e tratamento de formatos de fotografia.
- [ ] Layout adaptativo para tablets.
- [ ] VoiceOver, TalkBack, fonte dinâmica e redução de movimento.
- [ ] Testes end-to-end em iOS e Android.
- [ ] Monitoramento de erros sem coleta de conteúdo médico.

## Critério para chamar de produção

O Laço somente deverá ser apresentado como pronto para uso público depois que os itens P0 estiverem implementados, testados em duas famílias isoladas e acompanhados de política de privacidade adequada ao responsável pela operação.
