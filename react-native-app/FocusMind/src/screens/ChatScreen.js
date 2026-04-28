import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

const CHANNELS = [
  { id: 'ai', name: 'AI Assistant', icon: '🤖', description: 'Your personal productivity AI' },
  { id: 'general', name: 'general', icon: '#', description: 'General chat' },
  { id: 'focus', name: 'focus-tips', icon: '#', description: 'Tips for staying focused' },
  { id: 'goals', name: 'goals', icon: '#', description: 'Share your goals' },
  { id: 'wins', name: 'daily-wins', icon: '#', description: 'Celebrate your wins!' },
];

const AI_QUICK_PROMPTS = [
  { label: '📅 Plan my day', text: 'Help me plan my day effectively. Create a structured schedule.' },
  { label: '🎯 Set priorities', text: 'Help me prioritize my tasks. What should I focus on first?' },
  { label: '🍅 Pomodoro plan', text: 'Create a Pomodoro work plan for maximum focus and productivity.' },
  { label: '✅ Break down task', text: 'Help me break down a large project into smaller, manageable tasks.' },
  { label: '🔋 Boost energy', text: 'I am feeling unproductive. Give me tips to boost my energy and focus.' },
  { label: '📊 Analyze habits', text: 'Help me analyze my productivity habits and suggest improvements.' },
];

const DEMO_CHANNEL_MESSAGES = {
  general: [
    { id: 'd1', role: 'user', content: '👋 Welcome to FocusMind! Share tips and connect with others.', channelId: 'general', timestamp: new Date(Date.now() - 3600000).toISOString(), author: 'FocusMind', isSystem: true },
    { id: 'd2', role: 'user', content: 'Just completed 4 Pomodoros in a row! 🍅🍅🍅🍅', channelId: 'general', timestamp: new Date(Date.now() - 1800000).toISOString(), author: 'Alex M.' },
    { id: 'd3', role: 'user', content: 'Pro tip: Use the forest sound while coding. Game changer! 🌲', channelId: 'general', timestamp: new Date(Date.now() - 900000).toISOString(), author: 'Sarah K.' },
  ],
  'focus-tips': [
    { id: 'd4', role: 'user', content: '💡 Start your day with your hardest task (MIT - Most Important Task)', channelId: 'focus', timestamp: new Date(Date.now() - 7200000).toISOString(), author: 'FocusMind', isSystem: true },
    { id: 'd5', role: 'user', content: 'The 2-minute rule changed my life. If it takes < 2 min, do it now!', channelId: 'focus', timestamp: new Date(Date.now() - 3600000).toISOString(), author: 'Jay R.' },
  ],
  goals: [
    { id: 'd6', role: 'user', content: '🎯 What are your focus goals for this week?', channelId: 'goals', timestamp: new Date(Date.now() - 86400000).toISOString(), author: 'FocusMind', isSystem: true },
  ],
  wins: [
    { id: 'd7', role: 'user', content: '🏆 Finished my presentation ahead of schedule!', channelId: 'wins', timestamp: new Date(Date.now() - 1800000).toISOString(), author: 'Maria C.' },
    { id: 'd8', role: 'user', content: '✅ 30-day streak achieved! Never felt more focused.', channelId: 'wins', timestamp: new Date(Date.now() - 900000).toISOString(), author: 'Tom B.' },
  ],
};

function MessageBubble({ message, onAddTasks }) {
  const isAI = message.role === 'assistant';
  const isSystem = message.isSystem;
  const isUser = !isAI && !isSystem;
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (isSystem) {
    return (
      <View style={styles.systemMsg}>
        <Text style={styles.systemMsgText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.msgRow, isUser && message.channelId === 'ai' && styles.msgRowUser]}>
      {isAI && (
        <LinearGradient colors={COLORS.gradientPrimary} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.avatarText}>AI</Text>
        </LinearGradient>
      )}
      {!isAI && message.channelId !== 'ai' && (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{(message.author || 'U')[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.msgContent}>
        {!isAI && message.author && message.channelId !== 'ai' && (
          <Text style={styles.msgAuthor}>{message.author}</Text>
        )}
        <View style={[
          styles.bubble,
          isAI && styles.bubbleAI,
          isUser && message.channelId === 'ai' && styles.bubbleUser,
          !isAI && message.channelId !== 'ai' && styles.bubbleChannel,
        ]}>
          <Text style={[styles.bubbleText, isUser && message.channelId === 'ai' && styles.bubbleTextUser]}>
            {message.content}
          </Text>
          {message.suggestedTasks && message.suggestedTasks.length > 0 && (
            <View style={styles.suggestedTasks}>
              <Text style={styles.suggestedTitle}>📋 Suggested Tasks:</Text>
              {message.suggestedTasks.map((t, i) => (
                <Text key={i} style={styles.suggestedItem}>• {t.title} ({t.priority})</Text>
              ))}
              <TouchableOpacity style={styles.addTasksBtn} onPress={() => onAddTasks(message.suggestedTasks)}>
                <Ionicons name="add-circle" size={14} color={COLORS.primary} />
                <Text style={styles.addTasksBtnText}>Add all to Tasks</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={styles.msgTime}>{time}</Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(i);
  }, []);
  return (
    <View style={styles.msgRow}>
      <LinearGradient colors={COLORS.gradientPrimary} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.avatarText}>AI</Text>
      </LinearGradient>
      <View style={[styles.bubble, styles.bubbleAI, { paddingVertical: SPACING.md }]}>
        <Text style={[styles.bubbleText, { color: COLORS.textMuted }]}>Thinking{dots}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { chatHistory, sendChatMessage, addTasksFromAI } = useApp();
  const [activeChannel, setActiveChannel] = useState('ai');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [channelMsgs, setChannelMsgs] = useState(DEMO_CHANNEL_MESSAGES);
  const flatListRef = useRef(null);

  const aiMessages = chatHistory.filter(m => m.channelId === 'ai');
  const currentMessages = activeChannel === 'ai'
    ? aiMessages
    : (channelMsgs[activeChannel] || []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (activeChannel === 'ai') {
      setIsTyping(true);
      await sendChatMessage(text, 'ai');
      setIsTyping(false);
    } else {
      const msg = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        channelId: activeChannel,
        timestamp: new Date().toISOString(),
        author: 'You',
      };
      setChannelMsgs(prev => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), msg],
      }));
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, activeChannel, sendChatMessage]);

  const handleAddTasks = useCallback(async (tasks) => {
    await addTasksFromAI(tasks);
  }, [addTasksFromAI]);

  const activeChannelInfo = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
          {/* Channel sidebar + header */}
          <View style={styles.channelBar}>
            {CHANNELS.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.channelTab, activeChannel === c.id && styles.channelTabActive]}
                onPress={() => setActiveChannel(c.id)}
              >
                <Text style={[styles.channelTabText, activeChannel === c.id && { color: COLORS.primary }]}>
                  {c.icon === '#' ? `# ${c.name}` : `${c.icon} ${c.name}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Channel header */}
          <View style={styles.channelHeader}>
            <Text style={styles.channelName}>
              {activeChannelInfo.icon === '#' ? `# ${activeChannelInfo.name}` : `${activeChannelInfo.icon} ${activeChannelInfo.name}`}
            </Text>
            <Text style={styles.channelDesc}>{activeChannelInfo.description}</Text>
          </View>

          {/* Quick prompts for AI */}
          {activeChannel === 'ai' && aiMessages.length === 0 && (
            <View style={styles.quickPromptsContainer}>
              <Text style={styles.quickPromptsTitle}>Quick Prompts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {AI_QUICK_PROMPTS.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickPrompt}
                    onPress={() => { setInput(p.text); }}
                  >
                    <Text style={styles.quickPromptText}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeTitle}>👋 Hi! I'm FocusMind AI</Text>
                <Text style={styles.welcomeText}>
                  I can help you plan your day, create task lists, optimize your Pomodoro schedule,
                  give productivity tips, and much more. Just ask me anything!
                </Text>
              </View>
            </View>
          )}

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} onAddTasks={handleAddTasks} />
            )}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          />

          {/* Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={activeChannel === 'ai' ? 'Ask FocusMind AI...' : `Message #${activeChannelInfo.name}`}
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={2000}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
                onPress={handleSend}
                disabled={!input.trim()}
              >
                <LinearGradient colors={COLORS.gradientPrimary} style={styles.sendBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="send" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  channelBar: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.xs },
  channelTab: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'transparent' },
  channelTabActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary + '40' },
  channelTabText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textMuted },

  channelHeader: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  channelName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  channelDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 1 },

  quickPromptsContainer: { padding: SPACING.lg },
  quickPromptsTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickPrompt: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  quickPromptText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },

  welcomeCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.lg, marginTop: SPACING.lg, borderWidth: 1, borderColor: COLORS.primary + '30' },
  welcomeTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  welcomeText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },

  messageList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, paddingBottom: SPACING.xl, flexGrow: 1 },
  msgRow: { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.sm, alignItems: 'flex-end' },
  msgRowUser: { flexDirection: 'row-reverse' },

  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: FONTS.sizes.xs, fontWeight: '800', color: '#fff' },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgElevated, justifyContent: 'center', alignItems: 'center', flexShrink: 0, borderWidth: 1, borderColor: COLORS.border },
  userAvatarText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary },

  msgContent: { flex: 1, maxWidth: '80%' },
  msgAuthor: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: 3, marginLeft: SPACING.sm },
  bubble: { borderRadius: RADIUS.lg, padding: SPACING.md },
  bubbleAI: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleChannel: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  msgTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 3, marginHorizontal: SPACING.sm },

  suggestedTasks: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  suggestedTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  suggestedItem: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: 3 },
  addTasksBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm, alignSelf: 'flex-start', backgroundColor: COLORS.primary + '20', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  addTasksBtnText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '700' },

  systemMsg: { alignItems: 'center', marginVertical: SPACING.sm },
  systemMsgText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },

  inputContainer: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.md, backgroundColor: COLORS.bgCard },
  inputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: COLORS.bg, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, paddingTop: SPACING.sm, color: COLORS.textPrimary, fontSize: FONTS.sizes.md, maxHeight: 120, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  sendBtnGrad: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: RADIUS.full },
});
