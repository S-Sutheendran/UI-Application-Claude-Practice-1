import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_MAX_HEIGHT = 100;

function MiniBarChart({ data, color, label }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={styles.chartWrapper}>
      <Text style={styles.chartLabel}>{label}</Text>
      <View style={styles.barsRow}>
        {data.map((d, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: Math.max(4, (d.value / maxVal) * BAR_MAX_HEIGHT), backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.barDayLabel}>{d.day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatCard({ icon, value, label, subtext, color, gradient }) {
  return (
    <View style={styles.statCard}>
      {gradient ? (
        <LinearGradient colors={gradient} style={styles.statCardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.statCardIcon}>{icon}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
          <Text style={styles.statCardLabel}>{label}</Text>
          {subtext && <Text style={styles.statCardSub}>{subtext}</Text>}
        </LinearGradient>
      ) : (
        <View style={[styles.statCardInner, { borderColor: color + '40' }]}>
          <Text style={styles.statCardIcon}>{icon}</Text>
          <Text style={[styles.statCardValue, { color }]}>{value}</Text>
          <Text style={styles.statCardLabel}>{label}</Text>
          {subtext && <Text style={styles.statCardSub}>{subtext}</Text>}
        </View>
      )}
    </View>
  );
}

function ProgressBar({ value, max, color, label }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.progressValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const { tasks, pomodoroSessions, stats } = useApp();

  const s = stats || {
    totalFocusMinutes: 0, totalPomodoros: 0, totalTasksCompleted: 0,
    streakDays: 0, dailyRecords: {},
  };

  const weekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const key = d.toDateString();
      const record = s.dailyRecords?.[key] || {};
      return {
        day: days[d.getDay()],
        focusMinutes: record.focusMinutes || 0,
        pomodoros: record.pomodoros || 0,
        tasksCompleted: record.tasksCompleted || 0,
      };
    });
  }, [s]);

  const todayStr = new Date().toDateString();
  const todayRecord = s.dailyRecords?.[todayStr] || {};
  const todayFocus = todayRecord.focusMinutes || 0;
  const todayPomodoros = todayRecord.pomodoros || 0;
  const todayTasks = todayRecord.tasksCompleted || 0;

  const weeklyFocus = weekData.reduce((a, d) => a + d.focusMinutes, 0);
  const weeklyPomodoros = weekData.reduce((a, d) => a + d.pomodoros, 0);
  const weeklyTasks = weekData.reduce((a, d) => a + d.tasksCompleted, 0);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const tasksByPriority = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, none: 0 };
    tasks.filter(t => t.completed).forEach(t => { counts[t.priority || 'none']++; });
    return counts;
  }, [tasks]);

  const avgDailyFocus = weeklyFocus > 0 ? Math.round(weeklyFocus / 7) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Today summary */}
        <LinearGradient colors={COLORS.gradientPrimary} style={styles.todayBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.todayTitle}>Today's Summary</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayStat}>
              <Text style={styles.todayValue}>{todayFocus}m</Text>
              <Text style={styles.todayLabel}>Focused</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={styles.todayValue}>{todayPomodoros}</Text>
              <Text style={styles.todayLabel}>Pomodoros</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={styles.todayValue}>{todayTasks}</Text>
              <Text style={styles.todayLabel}>Tasks Done</Text>
            </View>
          </View>
        </LinearGradient>

        {/* All-time stats */}
        <Text style={styles.sectionTitle}>All Time</Text>
        <View style={styles.cardGrid}>
          <StatCard icon="🔥" value={`${s.streakDays}d`} label="Streak" color={COLORS.warning} />
          <StatCard icon="⏱️" value={`${Math.round(s.totalFocusMinutes / 60)}h`} label="Total Focus" color={COLORS.primary} />
          <StatCard icon="🍅" value={s.totalPomodoros} label="Pomodoros" color={COLORS.danger} />
          <StatCard icon="✅" value={s.totalTasksCompleted} label="Tasks Done" color={COLORS.success} />
        </View>

        {/* This week */}
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weekRow}>
          <View style={styles.weekCard}>
            <Text style={styles.weekValue}>{weeklyFocus}m</Text>
            <Text style={styles.weekLabel}>Focus Time</Text>
          </View>
          <View style={styles.weekCard}>
            <Text style={styles.weekValue}>{weeklyPomodoros}</Text>
            <Text style={styles.weekLabel}>Pomodoros</Text>
          </View>
          <View style={styles.weekCard}>
            <Text style={styles.weekValue}>{weeklyTasks}</Text>
            <Text style={styles.weekLabel}>Tasks</Text>
          </View>
          <View style={styles.weekCard}>
            <Text style={styles.weekValue}>{avgDailyFocus}m</Text>
            <Text style={styles.weekLabel}>Daily Avg</Text>
          </View>
        </View>

        {/* Charts */}
        <MiniBarChart
          data={weekData.map(d => ({ day: d.day, value: d.focusMinutes }))}
          color={COLORS.primary}
          label="Daily Focus (minutes)"
        />
        <MiniBarChart
          data={weekData.map(d => ({ day: d.day, value: d.pomodoros }))}
          color={COLORS.danger}
          label="Daily Pomodoros"
        />
        <MiniBarChart
          data={weekData.map(d => ({ day: d.day, value: d.tasksCompleted }))}
          color={COLORS.success}
          label="Tasks Completed"
        />

        {/* Task completion */}
        <Text style={styles.sectionTitle}>Task Completion</Text>
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <Text style={styles.completionRate}>{completionRate}%</Text>
            <Text style={styles.completionLabel}>Overall Rate</Text>
          </View>
          <View style={styles.bigProgressTrack}>
            <View style={[styles.bigProgressFill, { width: `${completionRate}%` }]} />
          </View>
          <Text style={styles.completionSub}>{completedTasks} of {totalTasks} total tasks completed</Text>

          <View style={styles.priorityBreakdown}>
            <Text style={styles.breakdownTitle}>Completed by Priority</Text>
            <ProgressBar value={tasksByPriority.high} max={Math.max(tasksByPriority.high, 1)} color={COLORS.priorityHigh} label="High" />
            <ProgressBar value={tasksByPriority.medium} max={Math.max(tasksByPriority.medium, 1)} color={COLORS.priorityMedium} label="Medium" />
            <ProgressBar value={tasksByPriority.low} max={Math.max(tasksByPriority.low, 1)} color={COLORS.priorityLow} label="Low" />
          </View>
        </View>

        {/* Productivity score */}
        <Text style={styles.sectionTitle}>Productivity Score</Text>
        <LinearGradient colors={['#7C3AED15', '#06B6D415']} style={styles.scoreCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {(() => {
            const score = Math.min(100, Math.round(
              (Math.min(todayFocus / 120, 1) * 40) +
              (Math.min(todayPomodoros / 8, 1) * 30) +
              (Math.min(todayTasks / 5, 1) * 20) +
              (Math.min(s.streakDays / 7, 1) * 10)
            ));
            const level = score >= 80 ? '🚀 Excellent' : score >= 60 ? '⚡ Good' : score >= 40 ? '📈 Building' : '🌱 Getting Started';
            return (
              <>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreNumber}>{score}</Text>
                  <View>
                    <Text style={styles.scoreLevel}>{level}</Text>
                    <Text style={styles.scoreLabel}>Today's Score</Text>
                  </View>
                </View>
                <Text style={styles.scoreHint}>
                  {score < 40 ? 'Start a Pomodoro session to boost your score!' :
                   score < 70 ? 'Great start! Complete more tasks to reach the top.' :
                   'You\'re crushing it today! Keep up the momentum! 🔥'}
                </Text>
              </>
            );
          })()}
        </LinearGradient>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },

  todayBanner: { borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOWS.md },
  todayTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: SPACING.md },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayStat: { flex: 1, alignItems: 'center' },
  todayValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: '#fff' },
  todayLabel: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  todayDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },

  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md, marginTop: SPACING.sm },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: { width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2 - SPACING.sm / 2, borderRadius: RADIUS.xl, overflow: 'hidden' },
  statCardGrad: { padding: SPACING.lg, minHeight: 100, justifyContent: 'center' },
  statCardInner: { padding: SPACING.lg, minHeight: 100, justifyContent: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, borderWidth: 1 },
  statCardIcon: { fontSize: 24, marginBottom: 4 },
  statCardValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  statCardLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  statCardSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },

  weekRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  weekCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  weekValue: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary },
  weekLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  chartWrapper: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  chartLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.xs, height: BAR_MAX_HEIGHT + 20 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: '100%', height: BAR_MAX_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: '60%', borderRadius: 4, minHeight: 4 },
  barDayLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 4 },

  completionCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  completionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm, marginBottom: SPACING.md },
  completionRate: { fontSize: FONTS.sizes.display, fontWeight: '800', color: COLORS.primary },
  completionLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  bigProgressTrack: { height: 8, backgroundColor: COLORS.bgElevated, borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.sm },
  bigProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  completionSub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.lg },
  priorityBreakdown: {},
  breakdownTitle: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  progressLabel: { width: 52, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  progressTrack: { flex: 1, height: 6, backgroundColor: COLORS.bgElevated, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressValue: { width: 28, fontSize: FONTS.sizes.sm, fontWeight: '700', textAlign: 'right' },

  scoreCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.primary + '30' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginBottom: SPACING.md },
  scoreNumber: { fontSize: FONTS.sizes.display, fontWeight: '800', color: COLORS.primary },
  scoreLevel: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  scoreLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  scoreHint: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
});
