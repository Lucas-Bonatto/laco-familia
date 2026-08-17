const assert = require('node:assert/strict');
const test = require('node:test');

const {
  collectDailyWaterNotificationIds,
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
