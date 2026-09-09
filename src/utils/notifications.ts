export type ScheduledNotificationLike = {
  identifier: string;
  content: {
    data?: Record<string, unknown> | null;
  };
};

export function hashNotificationFingerprint(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function collectDailyWaterNotificationIds(
  storedIds: readonly string[],
  scheduledNotifications: readonly ScheduledNotificationLike[],
) {
  const ids = new Set(storedIds);

  for (const notification of scheduledNotifications) {
    if (notification.content.data?.source === 'daily-water') {
      ids.add(notification.identifier);
    }
  }

  return [...ids];
}
