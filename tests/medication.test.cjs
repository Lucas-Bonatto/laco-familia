const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MAX_MEDICATION_DOSES,
  calculateMedicationDoses,
  medicationScheduleError,
  timeParts,
} = require('../.test-dist/utils/medication.js');

test('calcula doses exatas para um tratamento recorrente', () => {
  assert.equal(calculateMedicationDoses(7, 8), 21);
});

test('arredonda para cima quando o período não fecha um intervalo completo', () => {
  assert.equal(calculateMedicationDoses(1, 5), 5);
});

test('rejeita valores não finitos, duração zero e intervalo zero', () => {
  assert.equal(calculateMedicationDoses(Number.NaN, 8), 0);
  assert.equal(calculateMedicationDoses(7, Number.POSITIVE_INFINITY), 0);
  assert.equal(calculateMedicationDoses(0, 8), 0);
  assert.equal(calculateMedicationDoses(7, 0), 0);
});

test('valida a duração permitida do tratamento', () => {
  assert.equal(medicationScheduleError(0, 8), 'A duração deve ser de 1 a 30 dias.');
  assert.equal(medicationScheduleError(31, 8), 'A duração deve ser de 1 a 30 dias.');
  assert.equal(medicationScheduleError(1.5, 8), 'A duração deve ser de 1 a 30 dias.');
});

test('valida o intervalo permitido do tratamento', () => {
  assert.equal(medicationScheduleError(7, 0), 'O intervalo deve ser de 1 a 24 horas.');
  assert.equal(medicationScheduleError(7, 25), 'O intervalo deve ser de 1 a 24 horas.');
  assert.equal(medicationScheduleError(7, 3.5), 'O intervalo deve ser de 1 a 24 horas.');
});

test('protege o limite de notificações por tratamento', () => {
  const error = medicationScheduleError(30, 1);

  assert.match(error, /720 doses/);
  assert.match(error, new RegExp(String(MAX_MEDICATION_DOSES)));
});

test('aceita uma combinação válida dentro do limite', () => {
  assert.equal(medicationScheduleError(5, 8), null);
});

test('interpreta um horário válido', () => {
  assert.deepEqual(timeParts('09:05'), { hour: 9, minute: 5 });
});

test('usa a data de fallback quando o horário é inválido', () => {
  const fallback = new Date(2026, 7, 17, 14, 35).toISOString();

  assert.deepEqual(timeParts('25:99', fallback), { hour: 14, minute: 35 });
});
