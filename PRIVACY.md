# Privacidade

Este documento descreve o comportamento técnico do MVP disponível neste repositório. Ele não é uma política jurídica definitiva para uma operação pública.

## Dados tratados pelo aplicativo

Dependendo do uso, o Laço pode tratar:

- Nome e endereço de e-mail da conta.
- Participação em um grupo familiar.
- Consultas, exames, medicamentos, locais e observações.
- Registros de hidratação.
- Fotografias, títulos e descrições de memórias.

Informações relacionadas à saúde podem ser dados pessoais sensíveis. Não utilize dados reais em ambientes de demonstração, issues, pull requests ou screenshots públicos.

## Finalidades do MVP

- Autenticar cada integrante.
- Compartilhar cuidados dentro da família selecionada.
- Sincronizar agenda, hidratação e memórias.
- Agendar lembretes no aparelho.
- Carregar dados familiares da nuvem sem manter um snapshot médico persistente.

## Armazenamento

Dados compartilhados ficam no projeto Supabase configurado por quem executa o aplicativo. Fotografias ficam em bucket privado e seus links assinados expiram em cinco minutos. No celular, a sessão é protegida pelo Keychain/Keystore por meio do Expo SecureStore. O AsyncStorage mantém somente identificadores técnicos e impressões opacas necessários para reconciliar notificações; snapshots antigos com dados familiares são removidos na inicialização.

## Compartilhamento

O modelo foi desenhado para compartilhar dados apenas com integrantes autenticados da mesma família. As políticas RLS e de Storage devem permanecer ativadas e ser testadas depois de qualquer alteração no schema.

## Limitações atuais

- A exclusão integral de conta, linhas relacionadas e fotografias ainda não está implementada no aplicativo.
- O conteúdo de lembretes pode aparecer na tela bloqueada conforme a configuração do aparelho.
- Links assinados de imagens permanecem acessíveis durante sua validade de cinco minutos.

## Antes de operar publicamente

O responsável por uma implantação deverá definir identidade e contato do controlador, base legal, período de retenção, subprocessadores, canal para direitos dos titulares, procedimento de incidentes e exclusão integral. Também deverá substituir este documento por uma política revisada para sua jurisdição e operação.
