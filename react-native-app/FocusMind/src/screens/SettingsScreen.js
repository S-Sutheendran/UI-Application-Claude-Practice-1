import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingRow({ icon, title, subtitle, right, onPress, destructive }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, destructive && { backgroundColor: COLORS.danger + '20' }]}>
        <Ionicons name={icon} size={18} color={destructive ? COLORS.danger : COLORS.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, destructive && { color: COLORS.danger }]}>{title}</Text>
        {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.rowRight}>{right}</View>}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { userSettings, updateUserSettings, tags, addTag } = useApp();
  const settings = userSettings || { name: 'User', theme: 'dark', dailyGoal: 4, notificationsEnabled: true, aiEnabled: true, apiKey: '' };

  const [showApiKey, setShowApiKey] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const update = (key, value) => updateUserSettings({ ...settings, [key]: value });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Profile */}
        <Section title="Profile">
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Your Name</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              value={settings.name}
              onChangeText={v => update('name', v)}
              placeholder="Enter name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <SettingRow
            icon="flag-outline"
            title="Daily Pomodoro Goal"
            subtitle={`${settings.dailyGoal || 4} sessions per day`}
            right={
              <View style={styles.counterRow}>
                <TouchableOpacity onPress={() => update('dailyGoal', Math.max(1, (settings.dailyGoal || 4) - 1))} style={styles.miniCounterBtn}>
                  <Text style={styles.miniCounterText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.miniCounterValue}>{settings.dailyGoal || 4}</Text>
                <TouchableOpacity onPress={() => update('dailyGoal', Math.min(20, (settings.dailyGoal || 4) + 1))} style={styles.miniCounterBtn}>
                  <Text style={styles.miniCounterText}>+</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </Section>

        {/* AI */}
        <Section title="AI Features">
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="sparkles" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Enable AI Assistant</Text>
              <Text style={styles.rowSub}>AI suggestions and chatbot</Text>
            </View>
            <Switch
              value={settings.aiEnabled !== false}
              onValueChange={v => update('aiEnabled', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="key-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Anthropic API Key</Text>
              <Text style={styles.rowSub}>For Claude AI features</Text>
            </View>
          </View>
          <View style={styles.apiKeyRow}>
            <TextInput
              style={styles.apiKeyInput}
              value={settings.apiKey || ''}
              onChangeText={v => update('apiKey', v)}
              placeholder="sk-ant-..."
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowApiKey(s => !s)} style={styles.eyeBtn}>
              <Ionicons name={showApiKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.apiKeyHint}>
            Get your API key at console.anthropic.com. Without a key, the app uses built-in smart responses.
          </Text>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.warning + '20' }]}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.warning} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Notifications</Text>
              <Text style={styles.rowSub}>Reminders and Pomodoro alerts</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled !== false}
              onValueChange={v => update('notificationsEnabled', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </Section>

        {/* Tags */}
        <Section title="Task Tags">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: SPACING.xs }}>
            {tags.map(t => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagChipText}>#{t}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.addTagRow}>
            <TextInput
              style={styles.tagInput}
              value={newTagInput}
              onChangeText={setNewTagInput}
              placeholder="Add new tag..."
              placeholderTextColor={COLORS.textMuted}
              onSubmitEditing={() => {
                if (newTagInput.trim()) { addTag(newTagInput.trim()); setNewTagInput(''); }
              }}
            />
            <TouchableOpacity
              style={styles.addTagBtn}
              onPress={() => {
                if (newTagInput.trim()) { addTag(newTagInput.trim()); setNewTagInput(''); }
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Section>

        {/* About */}
        <Section title="About">
          <SettingRow icon="information-circle-outline" title="FocusMind" subtitle="Version 1.0.0" />
          <SettingRow
            icon="heart-outline"
            title="Rate the App"
            onPress={() => Alert.alert('Thank you! ❤️', 'Rating will be available when published to the App Store.')}
          />
          <SettingRow
            icon="share-outline"
            title="Share FocusMind"
            onPress={() => Alert.alert('Share', 'Sharing dialog would open here.')}
          />
          <SettingRow
            icon="trash-outline"
            title="Clear All Data"
            destructive
            onPress={() =>
              Alert.alert('Clear All Data', 'This will delete all tasks, notes, and history. This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Done', 'All data has been cleared.') },
              ])
            }
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm },
  sectionBody: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: { width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgElevated, justifyContent: 'center', alignItems: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '500' },
  rowSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 1 },
  rowRight: { flexShrink: 0 },

  inlineInput: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, textAlign: 'right', minWidth: 80 },

  counterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  miniCounterBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.bgElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  miniCounterText: { fontSize: FONTS.sizes.lg, color: COLORS.primary, fontWeight: '700', lineHeight: 20 },
  miniCounterValue: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, minWidth: 20, textAlign: 'center' },

  apiKeyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  apiKeyInput: { flex: 1, backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, borderWidth: 1, borderColor: COLORS.border, fontFamily: 'monospace' },
  eyeBtn: { padding: SPACING.sm },
  apiKeyHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, lineHeight: 18 },

  tagChip: { backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  tagChipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  addTagRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  tagInput: { flex: 1, backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, borderWidth: 1, borderColor: COLORS.border },
  addTagBtn: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});
