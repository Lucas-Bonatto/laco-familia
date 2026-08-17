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

## Limitações conhecidas

As limitações de segurança ainda abertas estão publicadas em [docs/ROADMAP.md](docs/ROADMAP.md). Este repositório não deve ser interpretado como software médico certificado ou serviço pronto para armazenar dados reais em produção.
