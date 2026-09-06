import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, radius, shadow, spacing } from './theme';

/* ---------------------------------- text --------------------------------- */

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={s.sectionTitle}>
      <Text style={s.sectionTitleText}>{children}</Text>
      {action}
    </View>
  );
}

/* --------------------------------- surfaces ------------------------------- */

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [s.card, style, pressed && s.pressed]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

/** A labelled number for the dashboard grid. */
export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const t = tones[tone];
  return (
    <Card style={s.statCard} onPress={onPress}>
      <Text style={s.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[s.statValue, { color: t.fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? (
        <Text style={s.statHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

/* ---------------------------------- badges -------------------------------- */

export type Tone = 'neutral' | 'primary' | 'success' | 'warn' | 'danger' | 'info';

const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.neutralSoft, fg: colors.textMuted },
  primary: { bg: colors.primarySoft, fg: colors.primaryDark },
  success: { bg: colors.successSoft, fg: colors.success },
  warn: { bg: colors.warnSoft, fg: colors.warn },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Text style={[s.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/* --------------------------------- buttons -------------------------------- */

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.button,
        { backgroundColor: v.bg, borderColor: v.border },
        disabled && s.buttonDisabled,
        pressed && !disabled && s.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={v.fg} style={{ marginRight: 6 }} /> : null}
      <Text style={[s.buttonText, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, fg: '#FFFFFF', border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
} as const;

/** Floating "add" button anchored bottom-right of a list screen. */
export function Fab({ onPress, label = 'Add' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.fab, pressed && s.pressed]}
    >
      <Ionicons name="add" size={26} color="#FFFFFF" />
    </Pressable>
  );
}

/* ----------------------------------- rows --------------------------------- */

export function Row({
  title,
  subtitle,
  right,
  meta,
  onPress,
  icon,
  iconTone = 'neutral',
}: {
  title: string;
  subtitle?: string | null;
  right?: ReactNode;
  meta?: ReactNode;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: Tone;
}) {
  const t = tones[iconTone];
  const body = (
    <View style={s.row}>
      {icon ? (
        <View style={[s.rowIcon, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={18} color={t.fg} />
        </View>
      ) : null}
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <View style={s.rowMeta}>{meta}</View> : null}
      </View>
      {right ? <View style={s.rowRight}>{right}</View> : null}
    </View>
  );

  if (!onPress) return <Card style={s.rowCard}>{body}</Card>;
  return (
    <Card style={s.rowCard} onPress={onPress}>
      {body}
    </Card>
  );
}

/** Label/value line used on detail screens. */
export function DetailRow({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[s.detailValue, tone ? { color: tones[tone].fg } : null]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

/* --------------------------------- states --------------------------------- */

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={s.centered}>
      <ActivityIndicator color={colors.primary} />
      <Text style={s.mutedCentered}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.textFaint} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {body ? <Text style={s.mutedCentered}>{body}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ error }: { error: Error }) {
  return (
    <View style={s.centered}>
      <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
      <Text style={[s.mutedCentered, { color: colors.danger }]}>{error.message}</Text>
    </View>
  );
}

/* --------------------------------- styles --------------------------------- */

const s = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '700', color: colors.text },
  h2: { fontSize: 19, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  mutedCentered: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },

  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },
  pressed: { opacity: 0.7 },

  statCard: { flex: 1, minWidth: 0, padding: spacing.md, gap: 2 },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statHint: { fontSize: 11, color: colors.textFaint },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 15, fontWeight: '600' },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.25,
    elevation: 5,
  },

  rowCard: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: 13, color: colors.textMuted },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  rowRight: { alignItems: 'flex-end', gap: 4 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 14, color: colors.textMuted, flexShrink: 1 },
  detailValue: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'right', flexShrink: 1 },

  centered: { padding: spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
});
