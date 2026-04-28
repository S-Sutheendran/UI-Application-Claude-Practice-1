import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationService = {
  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('focusmind', {
        name: 'FocusMind',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async scheduleTaskReminder(task) {
    if (!task.dueDate || !task.reminderTime) return null;

    const triggerDate = new Date(task.dueDate);
    const [hours, minutes] = (task.reminderTime || '09:00').split(':');
    triggerDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (triggerDate <= new Date()) return null;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task Reminder',
          body: task.title,
          data: { taskId: task.id, type: 'task_reminder' },
          sound: true,
        },
        trigger: { date: triggerDate },
      });
      return id;
    } catch {
      return null;
    }
  },

  async schedulePomodoroNotification(type, minutes) {
    const messages = {
      focus_start: { title: '🍅 Focus Session Started!', body: `${minutes} minutes of deep work. You've got this!` },
      focus_end: { title: '✅ Focus Session Complete!', body: 'Great work! Take a well-earned break.' },
      break_start: { title: '☕ Break Time!', body: `Relax for ${minutes} minutes.` },
      break_end: { title: '⚡ Break Over!', body: 'Ready for your next Pomodoro?' },
    };

    const msg = messages[type];
    if (!msg) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
          data: { type: 'pomodoro' },
          sound: true,
        },
        trigger: null, // immediate
      });
    } catch {}
  },

  async scheduleDailyDigest(hour = 8, minute = 30) {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌅 Good Morning!',
          body: 'Your FocusMind daily digest is ready. Tap to plan your day.',
          data: { type: 'daily_digest' },
          sound: true,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });
    } catch {}
  },

  async cancelNotification(id) {
    if (!id) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  },

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
  },

  addNotificationListener(handler) {
    return Notifications.addNotificationReceivedListener(handler);
  },

  addResponseListener(handler) {
    return Notifications.addNotificationResponseReceivedListener(handler);
  },
};

export default NotificationService;
