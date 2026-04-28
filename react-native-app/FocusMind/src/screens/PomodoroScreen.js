import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Modal, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';
import NotificationService from '../services/NotificationService';

const MODES = [
  { key: 'focus', label: 'Focus', color: COLORS.primary, emoji: '🍅' },
  { key: 'short', label: 'Short Break', color: COLORS.success, emoji: '☕' },
  { key: 'long', label: 'Long Break', color: COLORS.accent, emoji: '🌿' },
];

const SOUNDS = [
  { key: 'none', label: 'Silent', emoji: '🔇' },
  { key: 'rain', label: 'Rain', emoji: '🌧️' },
  { key: 'cafe', label: 'Café', emoji: '☕' },
  { key: 'forest', label: 'Forest', emoji: '🌲' },
  { key: 'ocean', label: 'Ocean', emoji: '🌊' },
  { key: 'whitenoise', label: 'White Noise', emoji: '〰️' },
  { key: 'fire', label: 'Campfire', emoji: '🔥' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function CircularTimer({ progress, minutes, seconds, mode }) {
  const size = 260;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.timerOuter, { width: size, height: size }]}>
      <View style={[styles.timerBg, { borderRadius: size / 2, borderColor: COLORS.border + '80' }]}>
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.modeEmoji}>{mode.emoji}</Text>
          <Text style={styles.timerText}>{pad(minutes)}:{pad(seconds)}</Text>
          <Text style={styles.modeLabel}>{mode.label}</Text>
        </View>
      </View>
      {/* Simulated progress ring using border */}
      <View
        style={[
          styles.timerRing,
          {
            borderRadius: size / 2,
            borderColor: mode.color,
            opacity: 0.9,
            borderWidth: strokeWidth,
            transform: [{ rotate: `${(1 - progress) * 360}deg` }],
          },
        ]}
      />
    </View>
  );
}

function SessionDots({ current, total, color }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && { backgroundColor: color },
            i === current && { borderColor: color, backgroundColor: color + '40' },
          ]}
        />
      ))}
    </View>
  );
}

export default function PomodoroScreen() {
  const { pomodoroSettings, tasks, logPomodoroSession, updatePomodoroSettings } = useApp();
  const settings = pomodoroSettings || {
    focusDuration: 25, shortBreak: 5, longBreak: 15,
    sessionsBeforeLongBreak: 4, autoStartBreaks: false, autoStartPomodoros: false,
    soundEnabled: true, selectedSound: 'rain',
  };

  const durations = {
    focus: settings.focusDuration * 60,
    short: settings.shortBreak * 60,
    long: settings.longBreak * 60,
  };

  const [mode, setMode] = useState(MODES[0]);
  const [timeLeft, setTimeLeft] = useState(durations.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedSound, setSelectedSound] = useState(settings.selectedSound || 'rain');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [taskPickerVisible, setTaskPickerVisible] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const totalTime = durations[mode.key];
  const progress = timeLeft / totalTime;

  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished && isRunning) pulse(); });
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) pulse();
    else pulseAnim.setValue(1);
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, mode]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    if (mode.key === 'focus') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      setCompletedToday(c => c + 1);
      logPomodoroSession({
        type: 'focus',
        duration: settings.focusDuration,
        taskId: selectedTaskId,
      });
      await NotificationService.schedulePomodoroNotification('focus_end', settings.focusDuration);
      if (newCount % settings.sessionsBeforeLongBreak === 0) {
        switchMode('long');
        if (settings.autoStartBreaks) setIsRunning(true);
      } else {
        switchMode('short');
        if (settings.autoStartBreaks) setIsRunning(true);
      }
    } else {
      await NotificationService.schedulePomodoroNotification('break_end', 0);
      switchMode('focus');
      if (settings.autoStartPomodoros) setIsRunning(true);
    }
  };

  const switchMode = (key) => {
    const m = MODES.find(m => m.key === key) || MODES[0];
    setMode(m);
    setTimeLeft(durations[key]);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    if (!isRunning) {
      NotificationService.schedulePomodoroNotification('focus_start', settings.focusDuration);
    }
    setIsRunning(r => !r);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode.key]);
  };

  const skipSession = () => {
    setIsRunning(false);
    handleTimerComplete();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const pendingTasks = tasks.filter(t => !t.completed);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pomodoro</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsVisible(true)}>
              <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeTab, mode.key === m.key && { borderColor: m.color, backgroundColor: m.color + '20' }]}
              onPress={() => !isRunning && switchMode(m.key)}
            >
              <Text style={[styles.modeTabText, mode.key === m.key && { color: m.color }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timer */}
        <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
          <CircularTimer progress={progress} minutes={minutes} seconds={seconds} mode={mode} />
        </Animated.View>

        {/* Session dots */}
        <SessionDots current={sessionCount % settings.sessionsBeforeLongBreak} total={settings.sessionsBeforeLongBreak} color={mode.color} />

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={resetTimer}>
            <Ionicons name="refresh" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.playBtn, { backgroundColor: mode.color }]} onPress={toggleTimer}>
            <Ionicons name={isRunning ? 'pause' : 'play'} size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={skipSession}>
            <Ionicons name="play-skip-forward" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completedToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{sessionCount}</Text>
            <Text style={styles.statLabel}>Session</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completedToday * settings.focusDuration}m</Text>
            <Text style={styles.statLabel}>Focused</Text>
          </View>
        </View>

        {/* Task association */}
        <TouchableOpacity
          style={styles.taskPicker}
          onPress={() => setTaskPickerVisible(true)}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.textMuted} />
          <Text style={[styles.taskPickerText, selectedTask && { color: COLORS.textPrimary }]} numberOfLines={1}>
            {selectedTask ? selectedTask.title : 'Link to a task (optional)'}
          </Text>
          {selectedTask && (
            <TouchableOpacity onPress={() => setSelectedTaskId(null)}>
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Sound picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Sound</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SOUNDS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.soundBtn, selectedSound === s.key && { borderColor: mode.color, backgroundColor: mode.color + '20' }]}
                onPress={() => setSelectedSound(s.key)}
              >
                <Text style={styles.soundEmoji}>{s.emoji}</Text>
                <Text style={[styles.soundLabel, selectedSound === s.key && { color: mode.color }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Task Picker Modal */}
      <Modal visible={taskPickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTaskPickerVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Link Task</Text>
            <TouchableOpacity onPress={() => setTaskPickerVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <TouchableOpacity
              style={styles.taskOption}
              onPress={() => { setSelectedTaskId(null); setTaskPickerVisible(false); }}
            >
              <Ionicons name="close-circle-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.taskOptionText}>No task</Text>
            </TouchableOpacity>
            {pendingTasks.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.taskOption, selectedTaskId === t.id && { backgroundColor: mode.color + '15' }]}
                onPress={() => { setSelectedTaskId(t.id); setTaskPickerVisible(false); }}
              >
                <Ionicons
                  name={selectedTaskId === t.id ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selectedTaskId === t.id ? mode.color : COLORS.textMuted}
                />
                <Text style={styles.taskOptionText}>{t.title}</Text>
                <Text style={styles.taskOptionPomos}>🍅 {t.estimatedPomodoros}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Timer Settings</Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: SPACING.lg }}>
            {[
              { label: 'Focus Duration (min)', key: 'focusDuration', min: 1, max: 90 },
              { label: 'Short Break (min)', key: 'shortBreak', min: 1, max: 30 },
              { label: 'Long Break (min)', key: 'longBreak', min: 5, max: 60 },
              { label: 'Sessions before Long Break', key: 'sessionsBeforeLongBreak', min: 2, max: 8 },
            ].map(({ label, key, min, max }) => (
              <View key={key} style={styles.settingRow}>
                <Text style={styles.settingLabel}>{label}</Text>
                <View style={styles.settingCounter}>
                  <TouchableOpacity
                    onPress={() => updatePomodoroSettings({ ...settings, [key]: Math.max(min, settings[key] - 1) })}
                    style={styles.counterBtn}
                  >
                    <Text style={styles.counterText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{settings[key]}</Text>
                  <TouchableOpacity
                    onPress={() => updatePomodoroSettings({ ...settings, [key]: Math.min(max, settings[key] + 1) })}
                    style={styles.counterBtn}
                  >
                    <Text style={styles.counterText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {[
              { label: 'Auto-start Breaks', key: 'autoStartBreaks' },
              { label: 'Auto-start Pomodoros', key: 'autoStartPomodoros' },
            ].map(({ label, key }) => (
              <View key={key} style={styles.settingRow}>
                <Text style={styles.settingLabel}>{label}</Text>
                <Switch
                  value={settings[key]}
                  onValueChange={(v) => updatePomodoroSettings({ ...settings, [key]: v })}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  headerRight: { flexDirection: 'row', gap: SPACING.sm },
  iconBtn: { padding: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md },

  modeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  modeTab: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  modeTabText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textMuted },

  timerContainer: { alignItems: 'center', marginVertical: SPACING.xl },
  timerOuter: { alignItems: 'center', justifyContent: 'center' },
  timerBg: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, backgroundColor: COLORS.bgCard },
  timerRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modeEmoji: { fontSize: 36, marginBottom: 4 },
  timerText: { fontSize: FONTS.sizes.display, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 2 },
  modeLabel: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: 4 },

  dots: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', marginBottom: SPACING.xl },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border, borderWidth: 1.5, borderColor: COLORS.textMuted },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl, marginBottom: SPACING.xl },
  controlBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  playBtn: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', ...SHADOWS.lg },

  statsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  statBox: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },

  taskPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
  taskPickerText: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.sizes.sm },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  soundBtn: { alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, marginRight: SPACING.sm, minWidth: 70 },
  soundEmoji: { fontSize: 22, marginBottom: 4 },
  soundLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '500' },

  modal: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  taskOption: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  taskOptionText: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.md },
  taskOptionPomos: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingLabel: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, flex: 1 },
  settingCounter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  counterText: { fontSize: FONTS.sizes.lg, color: COLORS.primary, fontWeight: '700' },
  counterValue: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary, minWidth: 28, textAlign: 'center' },
});
