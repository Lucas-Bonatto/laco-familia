export type JoinFamilyOutcome =
  | 'JOINED'
  | 'AUTH_REQUIRED'
  | 'INVALID_DISPLAY_NAME'
  | 'ALREADY_MEMBER'
  | 'INVITE_INVALID'
  | 'RATE_LIMITED';

export function joinFamilyOutcomeMessage(outcome: JoinFamilyOutcome | string | undefined) {
  if (outcome === 'AUTH_REQUIRED') return 'Faça login para entrar em uma família.';
  if (outcome === 'INVALID_DISPLAY_NAME') return 'Seu nome deve ter de 1 a 60 caracteres.';
  if (outcome === 'ALREADY_MEMBER') return 'Você já participa de uma família.';
  if (outcome === 'RATE_LIMITED') return 'Muitas tentativas. Aguarde 15 minutos e tente novamente.';
  return 'Convite inválido, expirado ou já utilizado.';
}
