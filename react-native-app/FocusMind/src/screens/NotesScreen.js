import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';
import AIService from '../services/AIService';

const NOTE_COLORS = [
  { bg: '#1E1B4B', accent: '#7C3AED' },
  { bg: '#14532D', accent: '#10B981' },
  { bg: '#7F1D1D', accent: '#EF4444' },
  { bg: '#1C1917', accent: '#F59E0B' },
  { bg: '#0C4A6E', accent: '#06B6D4' },
  { bg: '#4C1D95', accent: '#A855F7' },
  { bg: '#064E3B', accent: '#34D399' },
  { bg: '#1F2937', accent: '#6B7280' },
];

function NoteCard({ note, onPress, onPin, onDelete }) {
  const color = NOTE_COLORS.find(c => c.bg === note.color) || NOTE_COLORS[0];
  return (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: note.color, borderColor: color.accent + '40' }]}
      onPress={() => onPress(note)}
      onLongPress={() => Alert.alert('Note Options', '', [
        { text: note.pinned ? 'Unpin' : 'Pin', onPress: () => onPin(note.id) },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(note.id) },
        { text: 'Cancel', style: 'cancel' },
      ])}
      activeOpacity={0.85}
    >
      <View style={styles.noteCardTop}>
        {note.pinned && <Ionicons name="pin" size={14} color={color.accent} style={styles.pinIcon} />}
        <Text style={[styles.noteTitle, { color: color.accent }]} numberOfLines={2}>{note.title || 'Untitled'}</Text>
      </View>
      <Text style={styles.noteContent} numberOfLines={5}>{note.content}</Text>
      {note.tags.length > 0 && (
        <View style={styles.noteTagRow}>
          {note.tags.slice(0, 3).map(t => (
            <View key={t} style={[styles.noteTag, { backgroundColor: color.accent + '25' }]}>
              <Text style={[styles.noteTagText, { color: color.accent }]}>#{t}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.noteDate}>
        {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </Text>
    </TouchableOpacity>
  );
}

function NoteEditorModal({ visible, note, onClose, onSave, tags }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].bg);
  const [selectedTags, setSelectedTags] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  React.useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setSelectedColor(note.color || NOTE_COLORS[0].bg);
      setSelectedTags(note.tags || []);
    } else {
      setTitle(''); setContent(''); setSelectedColor(NOTE_COLORS[0].bg); setSelectedTags([]);
    }
  }, [note, visible]);

  const handleAIEnhance = async () => {
    if (!content.trim()) return;
    setAiLoading(true);
    const prompt = `Improve and expand this note. Keep the original meaning but make it clearer, more structured, and more detailed:\n\n${content}`;
    const enhanced = await AIService.sendMessage(prompt, []);
    setContent(enhanced);
    setAiLoading(false);
  };

  const handleAISummarize = async () => {
    if (!content.trim()) return;
    setAiLoading(true);
    const prompt = `Summarize this note concisely, keeping only the most important points:\n\n${content}`;
    const summary = await AIService.sendMessage(prompt, []);
    setContent(summary);
    setAiLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.editorModal, { backgroundColor: selectedColor }]}>
          {/* Header */}
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={onClose} style={styles.editorBack}>
              <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.editorHeaderActions}>
              <TouchableOpacity
                style={[styles.aiActionBtn, aiLoading && { opacity: 0.5 }]}
                onPress={handleAIEnhance}
                disabled={aiLoading}
              >
                <Text style={styles.aiActionBtnText}>✨ Enhance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiActionBtn}
                onPress={handleAISummarize}
                disabled={aiLoading}
              >
                <Text style={styles.aiActionBtnText}>📝 Summarize</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveNoteBtn}
                onPress={() => {
                  onSave({ ...(note || {}), title, content, color: selectedColor, tags: selectedTags });
                  onClose();
                }}
              >
                <Text style={styles.saveNoteBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.editorBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.editorTitle}
              value={title}
              onChangeText={setTitle}
              placeholder="Note title..."
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
            <TextInput
              style={styles.editorContent}
              value={content}
              onChangeText={setContent}
              placeholder="Start writing your note..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Bottom toolbar */}
          <View style={styles.editorToolbar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
              {NOTE_COLORS.map(c => (
                <TouchableOpacity
                  key={c.bg}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.bg, borderColor: c.accent },
                    selectedColor === c.bg && { borderWidth: 3 },
                  ]}
                  onPress={() => setSelectedColor(c.bg)}
                />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagPicker}>
              {tags.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tagBtn, selectedTags.includes(t) && styles.tagBtnActive]}
                  onPress={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                >
                  <Text style={[styles.tagBtnText, selectedTags.includes(t) && { color: COLORS.primary }]}>#{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function NotesScreen() {
  const { notes, tags, addNote, updateNote, deleteNote, pinNote } = useApp();
  const [search, setSearch] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [gridView, setGridView] = useState(true);

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (search) {
      result = result.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
      );
    }
    return [
      ...result.filter(n => n.pinned).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      ...result.filter(n => !n.pinned).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    ];
  }, [notes, search]);

  const handlePress = useCallback((note) => {
    setEditingNote(note);
    setEditorVisible(true);
  }, []);

  const handleSave = useCallback((data) => {
    if (data.id) {
      updateNote(data);
    } else {
      addNote(data);
    }
  }, [addNote, updateNote]);

  const handleDelete = (id) => {
    Alert.alert('Delete Note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(id) },
    ]);
  };

  const renderNote = useCallback(({ item }) => (
    <View style={gridView ? styles.gridItem : styles.listItem}>
      <NoteCard note={item} onPress={handlePress} onPin={pinNote} onDelete={handleDelete} />
    </View>
  ), [gridView, handlePress, pinNote]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setGridView(g => !g)}>
            <Ionicons name={gridView ? 'list' : 'grid'} size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditingNote(null); setEditorVisible(true); }}
          >
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="add" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes..."
          placeholderTextColor={COLORS.textMuted}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close" size={16} color={COLORS.textMuted} /></TouchableOpacity> : null}
      </View>

      {/* Notes grid/list */}
      <FlatList
        data={filteredNotes}
        keyExtractor={item => item.id}
        renderItem={renderNote}
        numColumns={gridView ? 2 : 1}
        key={gridView ? 'grid' : 'list'}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗒️</Text>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySub}>Tap + to create your first note</Text>
          </View>
        )}
      />

      <NoteEditorModal
        visible={editorVisible}
        note={editingNote}
        onClose={() => { setEditorVisible(false); setEditingNote(null); }}
        onSave={handleSave}
        tags={tags}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBtn: { padding: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md },
  addBtn: { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.md },
  addBtnGrad: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: RADIUS.full },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, marginHorizontal: SPACING.lg, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: SPACING.md, color: COLORS.textPrimary, fontSize: FONTS.sizes.md },

  grid: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
  gridItem: { flex: 1, padding: SPACING.xs },
  listItem: { paddingHorizontal: SPACING.xs },

  noteCard: { borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, minHeight: 120 },
  noteCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: SPACING.xs },
  pinIcon: { marginTop: 2 },
  noteTitle: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', lineHeight: 20 },
  noteContent: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19, marginBottom: SPACING.sm },
  noteTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: SPACING.sm },
  noteTag: { borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  noteTagText: { fontSize: 10, fontWeight: '600' },
  noteDate: { fontSize: 10, color: COLORS.textMuted },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.md },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },

  editorModal: { flex: 1 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 52 : SPACING.lg },
  editorBack: { padding: SPACING.xs },
  editorHeaderActions: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  aiActionBtn: { backgroundColor: COLORS.bgCard + '80', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  aiActionBtnText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
  saveNoteBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  saveNoteBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },

  editorBody: { flex: 1, paddingHorizontal: SPACING.lg },
  editorTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md, lineHeight: 32 },
  editorContent: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 24, minHeight: 300 },

  editorToolbar: { borderTopWidth: 1, borderTopColor: COLORS.border + '40', paddingBottom: Platform.OS === 'ios' ? 24 : SPACING.md },
  colorPicker: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, marginRight: SPACING.sm },
  tagPicker: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  tagBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm },
  tagBtnActive: { borderColor: COLORS.primary + '60', backgroundColor: COLORS.primary + '15' },
  tagBtnText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
});
