import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

const GREETINGS = [
  'Good morning', 'Good afternoon', 'Good evening', 'Good night'
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 17) return GREETINGS[1];
  if (h < 21) return GREETINGS[2];
  return GREETINGS[3];
}

function today() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function StatPill({ icon, value, label, color }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '40' }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TaskRow({ task, onToggle }) {
  const priorityColor = {
    high: COLORS.priorityHigh,
    medium: COLORS.priorityMedium,
    low: COLORS.priorityLow,
    none: COLORS.textMuted,
  }[task.priority] || COLORS.textMuted;

  return (
    <TouchableOpacity
      style={[styles.taskRow, task.completed && styles.taskRowDone]}
      onPress={() => onToggle(task.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.taskCheck, task.completed && { backgroundColor: COLORS.success, borderColor: COLORS.success }]}>
        {task.completed && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          {task.dueDate && (
            <Text style={styles.taskDue}>
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
          {task.estimatedPomodoros > 0 && (
            <Text style={styles.taskPomos}>🍅 ×{task.estimatedPomodoros}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AISuggestionCard({ suggestions, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <View style={styles.aiCard}>
      <TouchableOpacity style={styles.aiHeader} onPress={() => setExpanded(e => !e)}>
        <LinearGradient colors={['#7C3AED20', '#06B6D420']} style={styles.aiHeaderGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="sparkles" size={16} color={COLORS.primaryLight} />
          <Text style={styles.aiTitle}>AI Suggestions</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textSecondary} />
        </LinearGradient>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.aiBody}>
          {suggestions.map((s, i) => (
            <View key={i} style={styles.aiItem}>
              <Text style={styles.aiBullet}>✦</Text>
              <Text style={styles.aiText}>{s}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.aiRefresh} onPress={onRefresh}>
            <Ionicons name="refresh" size={12} color={COLORS.primaryLight} />
            <Text style={styles.aiRefreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { tasks, pomodoroSessions, stats, userSettings, aiSuggestions, toggleTask, refreshAISuggestions } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = new Date().toDateString();
  const todayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate).toDateString() === todayStr;
  });
  const overdueTasks = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date() && new Date(t.dueDate).toDateString() !== todayStr;
  });
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedToday = tasks.filter(t => t.completedAt && new Date(t.completedAt).toDateString() === todayStr);
  const todayPomodoros = pomodoroSessions.filter(s => s.type === 'focus' && new Date(s.completedAt).toDateString() === todayStr);
  const focusMinutesToday = todayPomodoros.reduce((acc, s) => acc + s.duration, 0);
  const userName = userSettings?.name || 'Friend';

  useEffect(() => {
    refreshAISuggestions();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAISuggestions();
    setRefreshing(false);
  }, []);

  const progressPercent = todayTasks.length > 0
    ? Math.round((todayTasks.filter(t => t.completed).length / todayTasks.length) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{greeting()}, {userName} 👋</Text>
            <Text style={styles.dateText}>{today()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Stats')}>
              <Ionicons name="bar-chart-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily progress banner */}
        <LinearGradient colors={COLORS.gradientPrimary} style={styles.progressBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.progressLeft}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressSub}>
              {completedToday.length} of {todayTasks.length} tasks done
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPct}>{progressPercent}%</Text>
          </View>
        </LinearGradient>

        {/* Stats row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
          <StatPill icon="🍅" value={todayPomodoros.length} label="Pomodoros" color={COLORS.danger} />
          <StatPill icon="⏱️" value={`${focusMinutesToday}m`} label="Focused" color={COLORS.primary} />
          <StatPill icon="✅" value={completedToday.length} label="Done" color={COLORS.success} />
          <StatPill icon="🔥" value={`${stats?.streakDays || 0}d`} label="Streak" color={COLORS.warning} />
          <StatPill icon="📋" value={pendingTasks.length} label="Pending" color={COLORS.accent} />
        </ScrollView>

        {/* AI Suggestions */}
        <AISuggestionCard suggestions={aiSuggestions} onRefresh={refreshAISuggestions} />

        {/* Quick Pomodoro Start */}
        <TouchableOpacity
          style={styles.quickStart}
          onPress={() => navigation.navigate('Pomodoro')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#EF444420', '#F59E0B20']} style={styles.quickStartGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.quickStartIcon}>🍅</Text>
            <View>
              <Text style={styles.quickStartTitle}>Start Focus Session</Text>
              <Text style={styles.quickStartSub}>
                {userSettings?.pomodoroSettings?.focusDuration || 25} min deep work
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.warning} style={{ marginLeft: 'auto' }} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>⚠️ Overdue ({overdueTasks.length})</Text>
            </View>
            {overdueTasks.slice(0, 3).map(t => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} />
            ))}
          </View>
        )}

        {/* Today */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.sectionTitle}>Today ({todayTasks.length})</Text>
          </View>
          {todayTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyText}>No tasks for today!</Text>
              <Text style={styles.emptySubText}>Add tasks in the Tasks tab</Text>
            </View>
          ) : (
            todayTasks.map(t => <TaskRow key={t.id} task={t} onToggle={toggleTask} />)
          )}
        </View>

        {/* All pending (first 5) */}
        {pendingTasks.filter(t => !t.dueDate || new Date(t.dueDate).toDateString() !== todayStr).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.sectionTitle}>Upcoming</Text>
            </View>
            {pendingTasks
              .filter(t => !t.dueDate || new Date(t.dueDate).toDateString() !== todayStr)
              .slice(0, 5)
              .map(t => <TaskRow key={t.id} task={t} onToggle={toggleTask} />)
            }
            <TouchableOpacity onPress={() => navigation.navigate('Tasks')} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View all tasks →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.lg },
  greetingText: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary },
  dateText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  iconBtn: { padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard },

  progressBanner: { borderRadius: RADIUS.xl, padding: SPACING.xl, flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.md },
  progressLeft: { flex: 1 },
  progressTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#fff' },
  progressSub: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2, marginBottom: SPACING.md },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  progressCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.lg },
  progressPct: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: '#fff' },

  statsRow: { marginBottom: SPACING.lg },
  statPill: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, alignItems: 'center', marginRight: SPACING.sm },
  statIcon: { fontSize: 20, marginBottom: 2 },
  statValue: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 1 },

  aiCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  aiHeader: { overflow: 'hidden', borderRadius: RADIUS.lg },
  aiHeaderGrad: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  aiTitle: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
  aiBody: { padding: SPACING.md },
  aiItem: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  aiBullet: { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm },
  aiText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  aiRefresh: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: SPACING.xs },
  aiRefreshText: { fontSize: FONTS.sizes.xs, color: COLORS.primaryLight },

  quickStart: { marginBottom: SPACING.lg, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.warning + '40' },
  quickStartGrad: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  quickStartIcon: { fontSize: 28 },
  quickStartTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  quickStartSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },

  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },

  taskRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  taskRowDone: { opacity: 0.5 },
  taskCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '500' },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 3 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  taskDue: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  taskPomos: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.sm },
  emptySubText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },

  viewAllBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  viewAllText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
