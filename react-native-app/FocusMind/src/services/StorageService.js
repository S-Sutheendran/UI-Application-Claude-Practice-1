import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TASKS: '@focusmind:tasks',
  PROJECTS: '@focusmind:projects',
  NOTES: '@focusmind:notes',
  POMODORO_SETTINGS: '@focusmind:pomo_settings',
  POMODORO_SESSIONS: '@focusmind:pomo_sessions',
  CHAT_HISTORY: '@focusmind:chat_history',
  USER_SETTINGS: '@focusmind:user_settings',
  STATS: '@focusmind:stats',
  TAGS: '@focusmind:tags',
};

const StorageService = {
  // Generic
  async get(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },

  // Tasks
  async getTasks() {
    return (await this.get(KEYS.TASKS)) || [];
  },
  async saveTasks(tasks) {
    await this.set(KEYS.TASKS, tasks);
  },

  // Projects
  async getProjects() {
    return (await this.get(KEYS.PROJECTS)) || [];
  },
  async saveProjects(projects) {
    await this.set(KEYS.PROJECTS, projects);
  },

  // Notes
  async getNotes() {
    return (await this.get(KEYS.NOTES)) || [];
  },
  async saveNotes(notes) {
    await this.set(KEYS.NOTES, notes);
  },

  // Pomodoro settings
  async getPomodoroSettings() {
    return (
      (await this.get(KEYS.POMODORO_SETTINGS)) || {
        focusDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        sessionsBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartPomodoros: false,
        soundEnabled: true,
        selectedSound: 'rain',
        volume: 0.5,
      }
    );
  },
  async savePomodoroSettings(settings) {
    await this.set(KEYS.POMODORO_SETTINGS, settings);
  },

  // Sessions log
  async getPomodoroSessions() {
    return (await this.get(KEYS.POMODORO_SESSIONS)) || [];
  },
  async savePomodoroSessions(sessions) {
    await this.set(KEYS.POMODORO_SESSIONS, sessions);
  },

  // Chat
  async getChatHistory() {
    return (await this.get(KEYS.CHAT_HISTORY)) || [];
  },
  async saveChatHistory(messages) {
    const trimmed = messages.slice(-200);
    await this.set(KEYS.CHAT_HISTORY, trimmed);
  },

  // User settings
  async getUserSettings() {
    return (
      (await this.get(KEYS.USER_SETTINGS)) || {
        name: 'User',
        theme: 'dark',
        dailyGoal: 4,
        weekStartsOn: 'monday',
        notificationsEnabled: true,
        aiEnabled: true,
        apiKey: '',
      }
    );
  },
  async saveUserSettings(settings) {
    await this.set(KEYS.USER_SETTINGS, settings);
  },

  // Stats
  async getStats() {
    return (
      (await this.get(KEYS.STATS)) || {
        totalFocusMinutes: 0,
        totalPomodoros: 0,
        totalTasksCompleted: 0,
        streakDays: 0,
        lastActiveDate: null,
        dailyRecords: {},
      }
    );
  },
  async saveStats(stats) {
    await this.set(KEYS.STATS, stats);
  },

  // Tags
  async getTags() {
    return (await this.get(KEYS.TAGS)) || ['Work', 'Personal', 'Study', 'Health', 'Finance'];
  },
  async saveTags(tags) {
    await this.set(KEYS.TAGS, tags);
  },
};

export default StorageService;
