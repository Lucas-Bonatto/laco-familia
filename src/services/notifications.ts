import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { FamilyEvent } from '../types';
import { MAX_MEDICATION_DOSES, timeParts } from '../utils/medication';
import { collectDailyWaterNotificationIds } from '../utils/notifications';
import {
  loadEventNotificationMap,
  loadWaterNotificationIds,
  saveEventNotificationMap,
  saveWaterNotificationIds,
} from './storage';

const WATER_HOURS = [9, 12, 15, 18, 21];
const waterMessages = [
  'Sua garrafinha está com saudade. Bora dar uns goles? 💧',
  'Alô, criatura terrestre: hora de abastecer! 🫗',
  'Água agora, aplausos dos rins depois. 👏',
  'Pausa dramática para um copo d’água. 🎭',
  'Último pit stop hidratante do dia! 🌙',
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
  }),
});

async function prepareAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('lembretes', {
    name: 'Lembretes do Laço',
    description: 'Água, consultas, exames e outros cuidados da família.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: '#36A67C',
  });
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;
  await prepareAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return next.granted;
}

async function scheduleDailyWaterRemindersOnce() {
  if (Platform.OS === 'web') return [] as string[];
  const permitted = await requestNotificationPermission();
  if (!permitted) return [] as string[];

  const [previousIds, scheduledNotifications] = await Promise.all([
    loadWaterNotificationIds(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  const idsToCancel = collectDailyWaterNotificationIds(previousIds, scheduledNotifications);
  await Promise.all(idsToCancel.map((id) =>
    Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
  ));

  const ids: string[] = [];
  for (const [index, hour] of WATER_HOURS.entries()) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pausa para água 💦',
        body: waterMessages[index] ?? waterMessages[0],
        sound: 'default',
        data: { screen: 'water', source: 'daily-water' },
        categoryIdentifier: 'water',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour, minute: 0, channelId: 'lembretes',
      },
    });
    ids.push(id);
  }
  await saveWaterNotificationIds(ids);
  return ids;
}

let waterReminderSetup: Promise<string[]> | null = null;

export function scheduleDailyWaterReminders() {
  if (waterReminderSetup) return waterReminderSetup;

  const setup = scheduleDailyWaterRemindersOnce().finally(() => {
    if (waterReminderSetup === setup) waterReminderSetup = null;
  });
  waterReminderSetup = setup;
  return setup;
}

function eventCopy(event: FamilyEvent) {
  if (event.kind === 'consulta') return `Sem fugir do doutor: ${event.title} está chegando. 🩺`;
  if (event.kind === 'exame') return `Coragem, campeão(ã): ${event.title} está chegando. 🔬`;
  if (event.kind === 'remedio') return `O remédio pediu para não levar bolo: ${event.title}. 💊`;
  return `Atenção, família: ${event.title} está chegando. ✨`;
}

export async function scheduleEventReminders(event: FamilyEvent) {
  if (Platform.OS === 'web') return [] as string[];
  const permitted = await requestNotificationPermission();
  if (!permitted) return [] as string[];

  if (event.kind === 'remedio' && event.medicationSchedule) {
    if (event.medicationSchedule.mode === 'continuous') {
      const { hour, minute } = timeParts(event.medicationSchedule.time, event.startsAt);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hora do remédio contínuo 💊',
          body: `${event.title}: seu cuidado diário chegou. O remédio marcou presença!`,
          sound: 'default',
          data: { screen: 'agenda', eventId: event.id, continuous: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'lembretes',
        },
      });
      return [id];
    }

    const ids: string[] = [];
    const totalDoses = Math.min(event.medicationSchedule.totalDoses, MAX_MEDICATION_DOSES);
    const intervalMilliseconds = event.medicationSchedule.intervalHours * 60 * 60 * 1000;
    const firstDose = new Date(event.startsAt).getTime();

    for (let index = 0; index < totalDoses; index += 1) {
      const doseDate = new Date(firstDose + index * intervalMilliseconds);
      if (doseDate.getTime() <= Date.now()) continue;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hora do remédio 💊',
          body: `${event.title}: dose ${index + 1} de ${event.medicationSchedule.totalDoses}. O comprimido não aceita bolo!`,
          sound: 'default',
          data: { screen: 'agenda', eventId: event.id, doseNumber: index + 1 },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: doseDate,
          channelId: 'lembretes',
        },
      });
      ids.push(id);
    }
    return ids;
  }

  const triggerDate = new Date(event.startsAt);
  triggerDate.setMinutes(triggerDate.getMinutes() - event.reminderMinutes);
  if (triggerDate.getTime() <= Date.now()) return [] as string[];
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Alerta do esquadrão da saúde', body: eventCopy(event), sound: 'default',
      data: { screen: 'agenda', eventId: event.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: 'lembretes',
    },
  });
  return [id];
}

export async function cancelEventReminders(event: FamilyEvent) {
  if (Platform.OS === 'web') return;
  const notificationIds = [...new Set([
    ...(event.notificationIds ?? []),
    ...(event.notificationId ? [event.notificationId] : []),
  ])];
  await Promise.all(notificationIds.map((id) =>
    Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
  ));
}

function eventFingerprint(event: FamilyEvent) {
  return JSON.stringify({
    title: event.title,
    kind: event.kind,
    startsAt: event.startsAt,
    reminderMinutes: event.reminderMinutes,
    medicationSchedule: event.medicationSchedule ?? null,
  });
}

let reconcileQueue = Promise.resolve();

export function reconcileEventReminders(userId: string, events: FamilyEvent[]) {
  reconcileQueue = reconcileQueue.then(async () => {
    const currentMap = await loadEventNotificationMap(userId);
    const eventById = new Map(events.map((event) => [event.id, event]));

    for (const [eventId, record] of Object.entries(currentMap)) {
      const event = eventById.get(eventId);
      if (!event || record.fingerprint !== eventFingerprint(event)) {
        await Promise.all(record.ids.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
        ));
        delete currentMap[eventId];
      }
    }

    for (const event of events) {
      if (currentMap[event.id]) continue;
      const ids = await scheduleEventReminders(event).catch(() => [] as string[]);
      currentMap[event.id] = { fingerprint: eventFingerprint(event), ids };
    }

    await saveEventNotificationMap(userId, currentMap);
  }).catch(() => undefined);
  return reconcileQueue;
}

export async function clearEventReminders(userId: string) {
  await reconcileQueue;
  const currentMap = await loadEventNotificationMap(userId);
  await Promise.all(Object.values(currentMap).flatMap((record) => record.ids).map((id) =>
    Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
  ));
  await saveEventNotificationMap(userId, {});
}

export function listenForNotificationNavigation(onScreen: (screen: 'water' | 'agenda') => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const screen = response.notification.request.content.data?.screen;
    if (screen === 'water' || screen === 'agenda') onScreen(screen);
  });
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    const screen = response?.notification.request.content.data?.screen;
    if (screen === 'water' || screen === 'agenda') onScreen(screen);
  });
  return () => subscription.remove();
}
