const assert = require('node:assert/strict');
const test = require('node:test');

const {
  collectDailyWaterNotificationIds,
  hashNotificationFingerprint,
} = require('../.test-dist/utils/notifications.js');

test('reúne lembretes salvos e lembretes de água órfãos sem duplicar IDs', () => {
  const ids = collectDailyWaterNotificationIds(
    ['water-1', 'water-2'],
    [
      { identifier: 'water-2', content: { data: { source: 'daily-water' } } },
      { identifier: 'water-orphan', content: { data: { source: 'daily-water' } } },
    ],
  );

  assert.deepEqual(ids, ['water-1', 'water-2', 'water-orphan']);
});

test('persiste somente uma impressão opaca dos detalhes da notificação', () => {
  const sensitiveValue = JSON.stringify({ title: 'Consulta cardiologista', startsAt: '2026-09-10T10:00:00Z' });
  const fingerprint = hashNotificationFingerprint(sensitiveValue);

  assert.match(fingerprint, /^[a-f0-9]{8}$/);
  assert.equal(fingerprint.includes('Consulta'), false);
  assert.equal(hashNotificationFingerprint(sensitiveValue), fingerprint);
  assert.notEqual(hashNotificationFingerprint(sensitiveValue + '!'), fingerprint);
});

test('preserva notificações que não pertencem aos lembretes diários de água', () => {
  const ids = collectDailyWaterNotificationIds(
    [],
    [
      { identifier: 'appointment', content: { data: { screen: 'agenda' } } },
      { identifier: 'another-app-flow', content: { data: null } },
    ],
  );

  assert.deepEqual(ids, []);
});
