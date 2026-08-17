export type ScheduledNotificationLike = {
  identifier: string;
  content: {
    data?: Record<string, unknown> | null;
  };
};

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
