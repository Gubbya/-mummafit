import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export type ReminderTime = {
  id: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

export const DEFAULT_WATER_REMINDERS: ReminderTime[] = [
  { id: 'water-0830', hour: 8, minute: 30, title: 'Water time 💧', body: 'Drink one glass of water after breakfast.' },
  { id: 'water-1030', hour: 10, minute: 30, title: 'Water time 💧', body: 'Small hydration break.' },
  { id: 'water-1230', hour: 12, minute: 30, title: 'Water before work 💧', body: 'Drink water before your work shift starts.' },
  { id: 'water-1430', hour: 14, minute: 30, title: 'Water time 💧', body: 'Drink water and check if you need a protein snack.' },
  { id: 'water-1700', hour: 17, minute: 0, title: 'Water + snack 💧', body: 'Drink water. Choose roasted chana, curd, fruit, or sprouts.' },
  { id: 'water-1930', hour: 19, minute: 30, title: 'Water time 💧', body: 'Another glass before dinner time.' },
  { id: 'water-2130', hour: 21, minute: 30, title: 'Water time 💧', body: 'Drink water after work/dinner.' },
  { id: 'water-2300', hour: 23, minute: 0, title: 'Last water reminder 💧', body: 'Small sip before sleep if you feel thirsty.' }
];

export const DEFAULT_HEALTH_REMINDERS: ReminderTime[] = [
  { id: 'thyroid-0730', hour: 7, minute: 30, title: 'Thyroid tablet', body: 'Take levothyroxine with plain water. Keep milk/calcium/iron away.' },
  { id: 'exercise-1000', hour: 10, minute: 0, title: 'Gentle workout', body: 'Do today’s 15–20 min postpartum-safe tai chi or strength routine.' },
  { id: 'protein-1630', hour: 16, minute: 30, title: 'Protein snack', body: 'Add curd, roasted chana, sprouts, paneer/tofu, or plain whey if protein is low.' }
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  let granted = hasNotificationPermission(current);
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = hasNotificationPermission(requested);
  }
  return granted;
}

function hasNotificationPermission(permission: Notifications.NotificationPermissionsStatus): boolean {
  const value = permission as Notifications.NotificationPermissionsStatus & { granted?: boolean; status?: string };
  return value.granted === true || value.status === 'granted';
}

export async function scheduleDailyReminder(reminder: ReminderTime): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.body
    },
    trigger: {
      hour: reminder.hour,
      minute: reminder.minute,
      repeats: true
    } as any
  });
}

export async function scheduleDefaultReminders(): Promise<number> {
  const reminders = [...DEFAULT_WATER_REMINDERS, ...DEFAULT_HEALTH_REMINDERS];
  let created = 0;

  for (const reminder of reminders) {
    const id = await scheduleDailyReminder(reminder);
    if (id) created += 1;
  }
  return created;
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
