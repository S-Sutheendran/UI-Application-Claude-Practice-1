export const COLORS = {
  // Backgrounds
  bg: '#0F0F1E',
  bgCard: '#1A1A2E',
  bgElevated: '#16213E',
  bgInput: '#0D1117',

  // Brand
  primary: '#7C3AED',
  primaryLight: '#A855F7',
  primaryDark: '#5B21B6',
  accent: '#06B6D4',
  accentLight: '#22D3EE',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Priority colors
  priorityHigh: '#EF4444',
  priorityMedium: '#F59E0B',
  priorityLow: '#10B981',
  priorityNone: '#6B7280',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#4B5563',
  textInverse: '#111827',

  // Borders
  border: '#1F2937',
  borderLight: '#374151',

  // Note colors
  noteColors: [
    '#1E1B4B', '#14532D', '#7F1D1D', '#1C1917',
    '#0C4A6E', '#4C1D95', '#064E3B', '#713F12',
  ],

  // Gradients (used as array pairs)
  gradientPrimary: ['#7C3AED', '#4F46E5'],
  gradientAccent: ['#06B6D4', '#3B82F6'],
  gradientSuccess: ['#10B981', '#059669'],
  gradientFire: ['#F59E0B', '#EF4444'],
  gradientNight: ['#0F0F1E', '#1A1A2E'],
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
};

export const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

export const PRIORITY_COLORS = {
  high: COLORS.priorityHigh,
  medium: COLORS.priorityMedium,
  low: COLORS.priorityLow,
  none: COLORS.priorityNone,
};
