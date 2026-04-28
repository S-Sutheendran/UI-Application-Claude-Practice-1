import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';
import AIService from '../services/AIService';

const AppContext = createContext(null);

const initialState = {
  tasks: [],
  projects: [],
  notes: [],
  tags: [],
  chatHistory: [],
  pomodoroSettings: null,
  pomodoroSessions: [],
  userSettings: null,
  stats: null,
  isLoading: true,
  aiSuggestions: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoading: false };

    // Tasks
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload
            ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null }
            : t
        ),
      };

    // Projects
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [action.payload, ...state.projects] };
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROJECT':
      return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };

    // Notes
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'ADD_NOTE':
      return { ...state, notes: [action.payload, ...state.notes] };
    case 'UPDATE_NOTE':
      return { ...state, notes: state.notes.map(n => n.id === action.payload.id ? action.payload : n) };
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter(n => n.id !== action.payload) };
    case 'PIN_NOTE':
      return { ...state, notes: state.notes.map(n => n.id === action.payload ? { ...n, pinned: !n.pinned } : n) };

    // Chat
    case 'SET_CHAT':
      return { ...state, chatHistory: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };

    // Pomodoro
    case 'SET_POMODORO_SETTINGS':
      return { ...state, pomodoroSettings: action.payload };
    case 'ADD_POMODORO_SESSION':
      return { ...state, pomodoroSessions: [action.payload, ...state.pomodoroSessions] };

    // Settings
    case 'SET_USER_SETTINGS':
      return { ...state, userSettings: action.payload };

    // Stats
    case 'SET_STATS':
      return { ...state, stats: action.payload };

    // Tags
    case 'SET_TAGS':
      return { ...state, tags: action.payload };

    // AI
    case 'SET_AI_SUGGESTIONS':
      return { ...state, aiSuggestions: action.payload };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from storage on mount
  useEffect(() => {
    (async () => {
      const [tasks, projects, notes, tags, chatHistory, pomodoroSettings, pomodoroSessions, userSettings, stats] =
        await Promise.all([
          StorageService.getTasks(),
          StorageService.getProjects(),
          StorageService.getNotes(),
          StorageService.getTags(),
          StorageService.getChatHistory(),
          StorageService.getPomodoroSettings(),
          StorageService.getPomodoroSessions(),
          StorageService.getUserSettings(),
          StorageService.getStats(),
        ]);

      dispatch({
        type: 'HYDRATE',
        payload: { tasks, projects, notes, tags, chatHistory, pomodoroSettings, pomodoroSessions, userSettings, stats },
      });

      if (userSettings?.apiKey) {
        AIService.setApiKey(userSettings.apiKey);
      }

      await NotificationService.requestPermissions();
    })();
  }, []);

  // Persist on state changes
  useEffect(() => {
    if (!state.isLoading) {
      StorageService.saveTasks(state.tasks);
    }
  }, [state.tasks]);

  useEffect(() => {
    if (!state.isLoading) StorageService.saveProjects(state.projects);
  }, [state.projects]);

  useEffect(() => {
    if (!state.isLoading) StorageService.saveNotes(state.notes);
  }, [state.notes]);

  useEffect(() => {
    if (!state.isLoading) StorageService.saveChatHistory(state.chatHistory);
  }, [state.chatHistory]);

  useEffect(() => {
    if (!state.isLoading && state.pomodoroSettings) {
      StorageService.savePomodoroSettings(state.pomodoroSettings);
    }
  }, [state.pomodoroSettings]);

  useEffect(() => {
    if (!state.isLoading && state.userSettings) {
      StorageService.saveUserSettings(state.userSettings);
      if (state.userSettings.apiKey) AIService.setApiKey(state.userSettings.apiKey);
    }
  }, [state.userSettings]);

  useEffect(() => {
    if (!state.isLoading) StorageService.savePomodoroSessions(state.pomodoroSessions);
  }, [state.pomodoroSessions]);

  // ── Task actions ──────────────────────────────────────────
  const addTask = useCallback(async (taskData) => {
    const task = {
      id: uuidv4(),
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'none',
      projectId: taskData.projectId || null,
      tags: taskData.tags || [],
      dueDate: taskData.dueDate || null,
      reminderTime: taskData.reminderTime || null,
      notificationId: null,
      estimatedPomodoros: taskData.estimatedPomodoros || 1,
      completedPomodoros: 0,
      subtasks: taskData.subtasks || [],
      recurring: taskData.recurring || null,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    if (task.dueDate && task.reminderTime) {
      task.notificationId = await NotificationService.scheduleTaskReminder(task);
    }

    dispatch({ type: 'ADD_TASK', payload: task });
    return task;
  }, []);

  const updateTask = useCallback(async (task) => {
    if (task.notificationId) {
      await NotificationService.cancelNotification(task.notificationId);
    }
    if (task.dueDate && task.reminderTime) {
      task.notificationId = await NotificationService.scheduleTaskReminder(task);
    }
    dispatch({ type: 'UPDATE_TASK', payload: task });
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task?.notificationId) {
      await NotificationService.cancelNotification(task.notificationId);
    }
    dispatch({ type: 'DELETE_TASK', payload: taskId });
  }, [state.tasks]);

  const toggleTask = useCallback((taskId) => {
    dispatch({ type: 'TOGGLE_TASK', payload: taskId });
    const task = state.tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      updateStats({ tasksCompleted: 1 });
    }
  }, [state.tasks]);

  // ── Project actions ───────────────────────────────────────
  const addProject = useCallback((data) => {
    const project = {
      id: uuidv4(),
      name: data.name,
      color: data.color || '#7C3AED',
      icon: data.icon || '📁',
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_PROJECT', payload: project });
    return project;
  }, []);

  // ── Note actions ──────────────────────────────────────────
  const addNote = useCallback((data) => {
    const note = {
      id: uuidv4(),
      title: data.title || 'Untitled',
      content: data.content || '',
      color: data.color || '#1E1B4B',
      tags: data.tags || [],
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_NOTE', payload: note });
    return note;
  }, []);

  const updateNote = useCallback((note) => {
    dispatch({ type: 'UPDATE_NOTE', payload: { ...note, updatedAt: new Date().toISOString() } });
  }, []);

  // ── Chat actions ──────────────────────────────────────────
  const sendChatMessage = useCallback(async (content, channelId = 'ai') => {
    const userMsg = {
      id: uuidv4(),
      role: 'user',
      content,
      channelId,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });

    if (channelId === 'ai') {
      const history = state.chatHistory
        .filter(m => m.channelId === 'ai')
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));

      const aiText = await AIService.sendMessage(content, history);

      // Check if AI suggests creating tasks
      let createdTasks = null;
      if (content.toLowerCase().includes('create') || content.toLowerCase().includes('plan')) {
        const planData = await AIService.createPlan(content);
        if (planData && planData.length > 0) {
          createdTasks = planData;
        }
      }

      const assistantMsg = {
        id: uuidv4(),
        role: 'assistant',
        content: aiText,
        channelId,
        timestamp: new Date().toISOString(),
        suggestedTasks: createdTasks,
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: assistantMsg });
      return assistantMsg;
    }
  }, [state.chatHistory]);

  const addTasksFromAI = useCallback(async (tasks) => {
    for (const t of tasks) {
      await addTask({
        title: t.title,
        priority: t.priority || 'medium',
        description: t.notes || '',
        estimatedPomodoros: Math.ceil((t.estimatedMinutes || 25) / 25),
      });
    }
  }, [addTask]);

  // ── Pomodoro actions ──────────────────────────────────────
  const logPomodoroSession = useCallback((session) => {
    const s = {
      id: uuidv4(),
      type: session.type,
      duration: session.duration,
      taskId: session.taskId || null,
      completedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_POMODORO_SESSION', payload: s });
    if (session.type === 'focus') {
      updateStats({ focusMinutes: session.duration, pomodoros: 1 });
    }
  }, []);

  const updatePomodoroSettings = useCallback((settings) => {
    dispatch({ type: 'SET_POMODORO_SETTINGS', payload: settings });
  }, []);

  // ── Stats ─────────────────────────────────────────────────
  const updateStats = useCallback(async ({ focusMinutes = 0, pomodoros = 0, tasksCompleted = 0 }) => {
    const today = new Date().toDateString();
    const current = await StorageService.getStats();
    const daily = current.dailyRecords[today] || { focusMinutes: 0, pomodoros: 0, tasksCompleted: 0 };

    const lastDate = current.lastActiveDate ? new Date(current.lastActiveDate).toDateString() : null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const streak = lastDate === yesterday.toDateString() ? current.streakDays + 1 : lastDate === today ? current.streakDays : 1;

    const updated = {
      ...current,
      totalFocusMinutes: current.totalFocusMinutes + focusMinutes,
      totalPomodoros: current.totalPomodoros + pomodoros,
      totalTasksCompleted: current.totalTasksCompleted + tasksCompleted,
      streakDays: streak,
      lastActiveDate: new Date().toISOString(),
      dailyRecords: {
        ...current.dailyRecords,
        [today]: {
          focusMinutes: daily.focusMinutes + focusMinutes,
          pomodoros: daily.pomodoros + pomodoros,
          tasksCompleted: daily.tasksCompleted + tasksCompleted,
        },
      },
    };

    await StorageService.saveStats(updated);
    dispatch({ type: 'SET_STATS', payload: updated });
  }, []);

  // ── User Settings ─────────────────────────────────────────
  const updateUserSettings = useCallback((settings) => {
    dispatch({ type: 'SET_USER_SETTINGS', payload: settings });
  }, []);

  // ── AI Suggestions ────────────────────────────────────────
  const refreshAISuggestions = useCallback(async () => {
    const pendingTasks = state.tasks.filter(t => !t.completed);
    const today = new Date().toDateString();
    const stats = await StorageService.getStats();
    const todayStats = stats.dailyRecords?.[today] || {};
    const suggestions = await AIService.getSuggestions(
      pendingTasks,
      todayStats.tasksCompleted || 0,
      todayStats.focusMinutes || 0
    );
    dispatch({ type: 'SET_AI_SUGGESTIONS', payload: suggestions });
  }, [state.tasks]);

  const value = {
    ...state,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    addProject,
    updateProject: (p) => dispatch({ type: 'UPDATE_PROJECT', payload: p }),
    deleteProject: (id) => dispatch({ type: 'DELETE_PROJECT', payload: id }),
    addNote,
    updateNote,
    deleteNote: (id) => dispatch({ type: 'DELETE_NOTE', payload: id }),
    pinNote: (id) => dispatch({ type: 'PIN_NOTE', payload: id }),
    sendChatMessage,
    addTasksFromAI,
    logPomodoroSession,
    updatePomodoroSettings,
    updateUserSettings,
    updateStats,
    refreshAISuggestions,
    addTag: (tag) => {
      const tags = [...new Set([...state.tags, tag])];
      dispatch({ type: 'SET_TAGS', payload: tags });
      StorageService.saveTags(tags);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
