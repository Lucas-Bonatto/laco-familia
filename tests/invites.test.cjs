const assert = require('node:assert/strict');
const test = require('node:test');

const { joinFamilyOutcomeMessage } = require('../.test-dist/utils/invites.js');

test('não revela se um convite existe, expirou, foi revogado ou já foi usado', () => {
  const neutral = 'Convite inválido, expirado ou já utilizado.';
  assert.equal(joinFamilyOutcomeMessage('INVITE_INVALID'), neutral);
  assert.equal(joinFamilyOutcomeMessage('UNKNOWN_OUTCOME'), neutral);
  assert.equal(joinFamilyOutcomeMessage(undefined), neutral);
});

test('orienta com clareza quando o limite de tentativas é atingido', () => {
  assert.equal(
    joinFamilyOutcomeMessage('RATE_LIMITED'),
    'Muitas tentativas. Aguarde 15 minutos e tente novamente.',
  );
});
