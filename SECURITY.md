# Política de segurança

## Versões suportadas

O projeto está em fase de MVP. Correções de segurança serão aplicadas somente à versão mais recente da branch `main`.

## Relatar uma vulnerabilidade

Não publique vulnerabilidades, chaves, dados pessoais, registros médicos ou fotografias em uma issue pública.

Quando o repositório estiver no GitHub, utilize **Security → Report a vulnerability** para abrir um aviso privado. Se esse recurso ainda não estiver configurado, aguarde a definição de um canal privado pelo mantenedor em vez de divulgar detalhes exploráveis.

Inclua no relato:

- Componente afetado.
- Passos mínimos para reprodução com dados fictícios.
- Impacto observado.
- Versão ou commit testado.
- Sugestão de correção, se houver.

## Escopo prioritário

- Isolamento entre famílias por RLS.
- Políticas de acesso a fotografias.
- Funções `SECURITY DEFINER`.
- Sessão e autenticação.
- Convites familiares.
- Exclusão de conta e arquivos.
- Exposição de informações em notificações.

## Práticas para contribuições

- Nunca comitar `.env.local` ou credenciais administrativas.
- Nunca usar `service_role` no aplicativo.
- Executar testes com famílias distintas depois de mudar RLS.
- Usar dados fictícios em testes e materiais públicos.
- Evitar logs com nomes, medicamentos, observações ou URLs assinadas.

## Controles implementados

- RLS em todas as tabelas públicas de dados da aplicação, com testes entre famílias adversárias.
- Funções privilegiadas no schema `private`, `search_path` vazio e permissões explícitas.
- Convites de 12 caracteres hexadecimais, válidos por 24 horas, de uso único e revogáveis.
- Limite de cinco tentativas de entrada por usuário a cada 15 minutos.
- Segredo do convite disponível somente ao proprietário por uma RPC controlada.
- Sessão móvel no Keychain/Keystore; snapshots sensíveis antigos são removidos automaticamente.
- Bucket privado e URLs assinadas de fotografias com validade de cinco minutos.

## Limitações conhecidas

As limitações de segurança ainda abertas estão publicadas em [docs/ROADMAP.md](docs/ROADMAP.md). Este repositório não deve ser interpretado como software médico certificado ou serviço pronto para armazenar dados reais em produção.

### Advisory transitivo sem correção publicada

Em 9 de setembro de 2026, o `pnpm audit` ainda reporta dois advisories altos de negação de serviço em `image-size@1.2.1` e um moderado de validação de buffer em `uuid@7.0.3`. Ambos são dependências transitivas do toolchain usadas somente durante build. A versão corrigida indicada para `image-size` (`>=2.0.3`) ainda não foi publicada; a correção de `uuid` exige uma troca de major controlada pelos pacotes Expo.

O risco é reduzido mantendo assets e código de build sob revisão, sem processar imagens enviadas por usuários na CI. Não foi aplicado override incompatível para ocultar o alerta. A correção definitiva é atualizar o toolchain Expo/Metro assim que ele adotar uma implementação mantida. Referência: [registro do problema no GitHub Advisory Database](https://github.com/github/advisory-database/issues/9028).
