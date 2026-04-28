import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, PRIORITY_COLORS, PRIORITY_LABELS } from '../theme';

const FILTERS = ['All', 'Today', 'Upcoming', 'Completed', 'High Priority'];

function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || COLORS.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: color + '25', borderColor: color + '60' }]}>
      <Text style={[styles.badgeText, { color }]}>{PRIORITY_LABELS[priority] || 'None'}</Text>
    </View>
  );
}

function TaskCard({ task, onToggle, onDelete, onEdit, projectName }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.card, task.completed && styles.cardDone]}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <TouchableOpacity
          style={[styles.check, task.completed && { backgroundColor: COLORS.success, borderColor: COLORS.success }]}
          onPress={() => onToggle(task.id)}
        >
          {task.completed && <Ionicons name="checkmark" size={13} color="#fff" />}
        </TouchableOpacity>
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, task.completed && styles.cardTitleDone]} numberOfLines={expanded ? 0 : 1}>
            {task.title}
          </Text>
          <View style={styles.cardMeta}>
            <PriorityBadge priority={task.priority} />
            {projectName && (
              <View style={styles.projectChip}>
                <Text style={styles.projectChipText}>{projectName}</Text>
              </View>
            )}
            {task.dueDate && (
              <Text style={[styles.metaText, new Date(task.dueDate) < new Date() && !task.completed && { color: COLORS.danger }]}>
                📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
            <Text style={styles.metaText}>🍅 {task.completedPomodoros}/{task.estimatedPomodoros}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onEdit(task)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={16} color={COLORS.danger + '90'} />
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <View style={styles.cardExpanded}>
          {task.description ? <Text style={styles.cardDesc}>{task.description}</Text> : null}
          {task.tags.length > 0 && (
            <View style={styles.tagRow}>
              {task.tags.map(t => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}
          {task.subtasks.length > 0 && (
            <View style={styles.subtasks}>
              <Text style={styles.subtasksTitle}>Subtasks</Text>
              {task.subtasks.map((s, i) => (
                <View key={i} style={styles.subtaskRow}>
                  <Ionicons name={s.done ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={s.done ? COLORS.success : COLORS.textMuted} />
                  <Text style={[styles.subtaskText, s.done && { textDecorationLine: 'line-through', color: COLORS.textMuted }]}>{s.title}</Text>
                </View>
              ))}
            </View>
          )}
          {task.reminderTime && (
            <Text style={styles.reminderText}>⏰ Reminder at {task.reminderTime}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function AddTaskModal({ visible, onClose, onSave, editTask, projects, tags }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('none');
  const [dueDate, setDueDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [recurring, setRecurring] = useState(null);

  React.useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setPriority(editTask.priority || 'none');
      setDueDate(editTask.dueDate ? editTask.dueDate.split('T')[0] : '');
      setReminderTime(editTask.reminderTime || '');
      setSelectedProject(editTask.projectId);
      setSelectedTags(editTask.tags || []);
      setEstimatedPomodoros(editTask.estimatedPomodoros || 1);
      setSubtasks(editTask.subtasks || []);
      setRecurring(editTask.recurring);
    } else {
      setTitle(''); setDescription(''); setPriority('none'); setDueDate('');
      setReminderTime(''); setSelectedProject(null); setSelectedTags([]);
      setEstimatedPomodoros(1); setSubtasks([]); setRecurring(null);
    }
  }, [editTask, visible]);

  const addSubtask = () => {
    if (subtaskInput.trim()) {
      setSubtasks([...subtasks, { title: subtaskInput.trim(), done: false }]);
      setSubtaskInput('');
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      ...(editTask || {}),
      title: title.trim(),
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      reminderTime: reminderTime || null,
      projectId: selectedProject,
      tags: selectedTags,
      estimatedPomodoros,
      subtasks,
      recurring,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editTask ? 'Edit Task' : 'New Task'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add details..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {['high', 'medium', 'low', 'none'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityBtnText, priority === p && { color: '#fff' }]}>
                    {PRIORITY_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Due Date</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Reminder Time</Text>
            <TextInput
              style={styles.input}
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="HH:MM (e.g. 09:00)"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Estimated Pomodoros 🍅</Text>
            <View style={styles.pomodoroCounter}>
              <TouchableOpacity onPress={() => setEstimatedPomodoros(Math.max(1, estimatedPomodoros - 1))} style={styles.counterBtn}>
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{estimatedPomodoros}</Text>
              <TouchableOpacity onPress={() => setEstimatedPomodoros(estimatedPomodoros + 1)} style={styles.counterBtn}>
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {projects.length > 0 && (
              <>
                <Text style={styles.inputLabel}>Project</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.projectBtn, !selectedProject && styles.projectBtnActive]}
                    onPress={() => setSelectedProject(null)}
                  >
                    <Text style={styles.projectBtnText}>None</Text>
                  </TouchableOpacity>
                  {projects.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.projectBtn, selectedProject === p.id && styles.projectBtnActive, { borderColor: p.color + '60' }]}
                      onPress={() => setSelectedProject(p.id)}
                    >
                      <Text style={styles.projectBtnText}>{p.icon} {p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.inputLabel}>Tags</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

            <Text style={styles.inputLabel}>Subtasks</Text>
            <View style={styles.subtaskAdd}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={subtaskInput}
                onChangeText={setSubtaskInput}
                placeholder="Add a subtask..."
                placeholderTextColor={COLORS.textMuted}
                onSubmitEditing={addSubtask}
              />
              <TouchableOpacity onPress={addSubtask} style={styles.subtaskAddBtn}>
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            {subtasks.map((s, i) => (
              <View key={i} style={styles.subtaskItem}>
                <Text style={styles.subtaskItemText}>{s.title}</Text>
                <TouchableOpacity onPress={() => setSubtasks(subtasks.filter((_, j) => j !== i))}>
                  <Ionicons name="close" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.inputLabel}>Recurring</Text>
            <View style={styles.recurringRow}>
              {[null, 'daily', 'weekly', 'monthly'].map(r => (
                <TouchableOpacity
                  key={String(r)}
                  style={[styles.recurringBtn, recurring === r && styles.recurringBtnActive]}
                  onPress={() => setRecurring(r)}
                >
                  <Text style={[styles.recurringBtnText, recurring === r && { color: COLORS.primary }]}>
                    {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'None'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <LinearGradient colors={COLORS.gradientPrimary} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.saveBtnText}>{editTask ? 'Update Task' : 'Add Task'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function TasksScreen() {
  const { tasks, projects, tags, toggleTask, addTask, updateTask, deleteTask, addProject } = useApp();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [selectedProject, setSelectedProjectFilter] = useState(null);
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const todayStr = new Date().toDateString();

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedProject) result = result.filter(t => t.projectId === selectedProject);
    if (search) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    switch (filter) {
      case 'Today':
        result = result.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === todayStr);
        break;
      case 'Upcoming':
        result = result.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) > new Date());
        break;
      case 'Completed':
        result = result.filter(t => t.completed);
        break;
      case 'High Priority':
        result = result.filter(t => !t.completed && t.priority === 'high');
        break;
      default:
        result = result.filter(t => !t.completed);
    }
    return result.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2, none: 3 };
      return (p[a.priority] || 3) - (p[b.priority] || 3);
    });
  }, [tasks, filter, search, selectedProject]);

  const handleEdit = (task) => { setEditTask(task); setModalVisible(true); };

  const handleSave = useCallback(async (data) => {
    if (data.id) {
      await updateTask(data);
    } else {
      await addTask(data);
    }
    setEditTask(null);
  }, [addTask, updateTask]);

  const handleDelete = (id) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(id) },
    ]);
  };

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);

  const stats = useMemo(() => ({
    total: tasks.filter(t => !t.completed).length,
    done: tasks.filter(t => t.completed).length,
    today: tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === todayStr && !t.completed).length,
  }), [tasks]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Tasks</Text>
            <Text style={styles.screenSub}>{stats.total} pending · {stats.done} done</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditTask(null); setModalVisible(true); }}
          >
            <LinearGradient colors={COLORS.gradientPrimary} style={styles.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="add" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search tasks..."
            placeholderTextColor={COLORS.textMuted}
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close" size={16} color={COLORS.textMuted} /></TouchableOpacity> : null}
        </View>

        {/* Projects filter */}
        {projects.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectsBar}>
            <TouchableOpacity
              style={[styles.projectTab, !selectedProject && styles.projectTabActive]}
              onPress={() => setSelectedProjectFilter(null)}
            >
              <Text style={[styles.projectTabText, !selectedProject && { color: COLORS.primary }]}>All</Text>
            </TouchableOpacity>
            {projects.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.projectTab, selectedProject === p.id && styles.projectTabActive]}
                onPress={() => setSelectedProjectFilter(selectedProject === p.id ? null : p.id)}
              >
                <Text style={[styles.projectTabText, selectedProject === p.id && { color: p.color }]}>
                  {p.icon} {p.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.projectTab} onPress={() => setProjectModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && { color: COLORS.primary }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Task list */}
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggle={toggleTask}
              onDelete={handleDelete}
              onEdit={handleEdit}
              projectName={item.projectId ? projectMap[item.projectId]?.name : null}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>No tasks here</Text>
              <Text style={styles.emptySub}>Tap + to add a new task</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <AddTaskModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditTask(null); }}
        onSave={handleSave}
        editTask={editTask}
        projects={projects}
        tags={tags}
      />

      {/* Add project modal */}
      <Modal visible={projectModalVisible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.miniModal}>
            <Text style={styles.miniModalTitle}>New Project</Text>
            <TextInput
              style={styles.input}
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="Project name"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <View style={styles.miniModalActions}>
              <TouchableOpacity onPress={() => setProjectModalVisible(false)} style={styles.miniCancelBtn}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.miniSaveBtn}
                onPress={() => {
                  if (newProjectName.trim()) {
                    addProject({ name: newProjectName.trim(), icon: '📁' });
                    setNewProjectName('');
                    setProjectModalVisible(false);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  screenTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  screenSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.md },
  addBtnGrad: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: RADIUS.full },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, marginHorizontal: SPACING.lg, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: SPACING.md, color: COLORS.textPrimary, fontSize: FONTS.sizes.md },

  projectsBar: { paddingLeft: SPACING.lg, marginBottom: SPACING.sm },
  projectTab: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm },
  projectTabActive: { borderColor: COLORS.primary + '60', backgroundColor: COLORS.primary + '15' },
  projectTabText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },

  filterBar: { paddingLeft: SPACING.lg, marginBottom: SPACING.md },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, marginRight: SPACING.sm, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  filterChipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  cardDone: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '600' },
  cardTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' },
  badge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  projectChip: { backgroundColor: COLORS.primary + '20', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  projectChipText: { fontSize: FONTS.sizes.xs, color: COLORS.primaryLight },
  metaText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  cardActions: { flexDirection: 'column', gap: 4 },
  actionBtn: { padding: 4 },
  cardExpanded: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  cardDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  tag: { backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  subtasks: { marginBottom: SPACING.sm },
  subtasksTitle: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  subtaskRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', marginBottom: 4 },
  subtaskText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  reminderText: { fontSize: FONTS.sizes.xs, color: COLORS.warning },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.md },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },

  modal: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  modalBody: { flex: 1, padding: SPACING.lg },
  inputLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONTS.sizes.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  textarea: { height: 80, textAlignVertical: 'top' },

  priorityRow: { flexDirection: 'row', gap: SPACING.sm },
  priorityBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  priorityBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },

  pomodoroCounter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: FONTS.sizes.xl, color: COLORS.primary, fontWeight: '700' },
  counterValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, minWidth: 30, textAlign: 'center' },

  projectBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm },
  projectBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  projectBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  tagBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm },
  tagBtnActive: { borderColor: COLORS.primary + '60', backgroundColor: COLORS.primary + '15' },
  tagBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },

  subtaskAdd: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', marginBottom: SPACING.sm },
  subtaskAddBtn: { width: 36, height: 44, justifyContent: 'center', alignItems: 'center' },
  subtaskItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: 4 },
  subtaskItemText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, flex: 1 },

  recurringRow: { flexDirection: 'row', gap: SPACING.sm },
  recurringBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  recurringBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  recurringBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },

  saveBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', marginTop: SPACING.xl },
  saveBtnGrad: { padding: SPACING.lg, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '800' },

  overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center' },
  miniModal: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.xl, width: '80%' },
  miniModalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md },
  miniModalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  miniCancelBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  miniSaveBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
});
