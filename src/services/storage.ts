import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSnapshot } from '../types';

const SNAPSHOT_PREFIX = '@laco/cloud-snapshot/v1';
const LEGACY_SNAPSHOT_KEYS = ['@laco/app-snapshot/v1', '@laco/app-snapshot/v2', '@laco/app-snapshot/v3'];
const WATER_NOTIFICATION_IDS_KEY = '@laco/water-notification-ids/v1';
const EVENT_NOTIFICATION_PREFIX = '@laco/event-notifications/v1';

export type EventNotificationRecord = { fingerprint: string; ids: string[] };
export type EventNotificationMap = Record<string, EventNotificationRecord>;

export async function loadSnapshot(userId: string): Promise<AppSnapshot | null> {
  await AsyncStorage.multiRemove(LEGACY_SNAPSHOT_KEYS);
  const value = await AsyncStorage.getItem(`${SNAPSHOT_PREFIX}/${userId}`);
  if (!value) return null;
  try {
    const snapshot = JSON.parse(value) as AppSnapshot;
    if (
      typeof snapshot.familyId !== 'string' ||
      typeof snapshot.familyName !== 'string' ||
      typeof snapshot.inviteCode !== 'string' ||
      !Array.isArray(snapshot.members) ||
      snapshot.members.some((member) => typeof member.userId !== 'string')
    ) return null;
    return snapshot;
  } catch { return null; }
}

export async function saveSnapshot(userId: string, snapshot: AppSnapshot) {
  await AsyncStorage.setItem(`${SNAPSHOT_PREFIX}/${userId}`, JSON.stringify(snapshot));
}

export async function loadEventNotificationMap(userId: string): Promise<EventNotificationMap> {
  const value = await AsyncStorage.getItem(`${EVENT_NOTIFICATION_PREFIX}/${userId}`);
  if (!value) return {};
  try { return JSON.parse(value) as EventNotificationMap; } catch { return {}; }
}

export async function saveEventNotificationMap(userId: string, value: EventNotificationMap) {
  await AsyncStorage.setItem(`${EVENT_NOTIFICATION_PREFIX}/${userId}`, JSON.stringify(value));
}

export async function loadWaterNotificationIds() {
  const value = await AsyncStorage.getItem(WATER_NOTIFICATION_IDS_KEY);
  if (!value) return [] as string[];
  try { return JSON.parse(value) as string[]; } catch { return [] as string[]; }
}

export async function saveWaterNotificationIds(ids: string[]) {
  await AsyncStorage.setItem(WATER_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
}
